"""Lexical retrieval for personal knowledge bases.

Flow: tokenize (jieba for Chinese) -> BM25 scoring -> normalize -> threshold ->
top-k. This is deliberately an in-process index with no external vector store;
the public `search_chunks` function is the seam where hybrid retrieval can be
added later without changing the chat layer.
"""

from __future__ import annotations

import logging
import math
import re
import time
from collections import Counter
from dataclasses import dataclass

import jieba
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.chunk import Chunk
from app.models.document import Document
from app.models.enums import DocumentStatus

logger = logging.getLogger("zhiwen.retrieval")

CJK_RE = re.compile(r"[\u4e00-\u9fff]")
TOKEN_RE = re.compile(r"[a-zA-Z0-9][a-zA-Z0-9_.\-/]*")
STOPWORDS = {
    "的", "了", "和", "是", "在", "我", "有", "就", "不", "人", "都", "一", "一个",
    "上", "也", "很", "到", "说", "要", "去", "你", "会", "着", "没有", "看", "好",
    "这", "那", "什么", "怎么", "如何", "哪些", "为什么", "请问", "一下", "可以",
    "以及", "并且", "但是", "因为", "所以", "如果", "还是", "或者", "我们", "他们",
    "the", "a", "an", "and", "or", "of", "to", "in", "is", "are", "for", "on",
    "with", "how", "what", "why", "which", "can", "could", "should", "would",
}


def tokenize(text: str) -> list[str]:
    text = (text or "").lower()
    tokens: list[str] = []
    for raw in jieba.cut_for_search(text):
        token = raw.strip()
        if not token or token in STOPWORDS:
            continue
        if CJK_RE.search(token):
            if len(token) == 1:
                continue
            tokens.append(token)
            continue
        for match in TOKEN_RE.findall(token):
            if len(match) >= 2 and match not in STOPWORDS:
                tokens.append(match)
    return tokens


@dataclass(slots=True)
class RetrievedChunk:
    chunk_id: int
    document_id: int
    document_name: str
    chunk_index: int
    content: str
    score: float


class BM25:
    """Small in-process BM25 index over one user's ready chunks.

    BM25 rewards repeated query terms and penalizes very long chunks. It is a
    good fit for personal-scale Chinese notes and needs no external service.
    """

    def __init__(self, documents: list[list[str]], k1: float = 1.5, b: float = 0.75):
        self.docs = documents
        self.k1 = k1
        self.b = b
        self.n = len(documents)
        self.doc_len = [len(doc) for doc in documents]
        self.avgdl = sum(self.doc_len) / self.n if self.n else 0.0
        self.term_freqs = [Counter(doc) for doc in documents]
        self.doc_freq: Counter[str] = Counter()
        for tf in self.term_freqs:
            self.doc_freq.update(tf.keys())

    def idf(self, term: str) -> float:
        df = self.doc_freq.get(term, 0)
        return math.log(1 + (self.n - df + 0.5) / (df + 0.5))

    def score(self, index: int, query_terms: list[str]) -> float:
        if not self.n or not self.avgdl:
            return 0.0
        tf = self.term_freqs[index]
        dl = self.doc_len[index]
        total = 0.0
        for term in query_terms:
            freq = tf.get(term, 0)
            if not freq:
                continue
            denom = freq + self.k1 * (1 - self.b + self.b * dl / self.avgdl)
            total += self.idf(term) * freq * (self.k1 + 1) / denom
        return total


def _snippet(content: str, query: str, length: int = 170) -> str:
    """Return a readable window around the first matched query term."""
    content = re.sub(r"\s+", " ", content).strip()
    if len(content) <= length:
        return content
    terms = tokenize(query)
    position = -1
    for term in terms:
        idx = content.lower().find(term.lower())
        if idx >= 0:
            position = idx
            break
    if position < 0:
        return content[:length].rstrip() + "…"
    start = max(0, position - length // 3)
    end = min(len(content), start + length)
    prefix = "…" if start > 0 else ""
    suffix = "…" if end < len(content) else ""
    return f"{prefix}{content[start:end].strip()}{suffix}"


async def search_chunks(
    db: AsyncSession,
    user_id: int,
    query: str,
    top_k: int | None = None,
    min_score: float | None = None,
) -> tuple[list[RetrievedChunk], int]:
    started = time.perf_counter()
    query_terms = tokenize(query)
    if not query_terms:
        return [], 0

    # Tenant + readiness filters live in SQL, not in Python, so a bug elsewhere
    # cannot accidentally rank another user's or a disabled document's chunks.
    stmt = (
        select(Chunk, Document.filename)
        .join(Document, Document.id == Chunk.document_id)
        .where(
            Chunk.user_id == user_id,
            Document.user_id == user_id,
            Document.enabled.is_(True),
            Document.status == DocumentStatus.READY,
        )
        .order_by(Chunk.id)
        .limit(settings.retrieval_max_chunks)
    )
    rows = (await db.execute(stmt)).all()
    if not rows:
        return [], int((time.perf_counter() - started) * 1000)

    tokenized_docs = [tokenize(chunk.content) for chunk, _ in rows]
    index = BM25(tokenized_docs)
    ranked: list[tuple[float, int, int, str, int, str]] = []
    for i, (chunk, filename) in enumerate(rows):
        raw_score = index.score(i, query_terms)
        if raw_score > 0:
            ranked.append(
                (
                    raw_score,
                    chunk.id,
                    chunk.document_id,
                    filename,
                    chunk.chunk_index,
                    chunk.content,
                )
            )
    if not ranked:
        return [], int((time.perf_counter() - started) * 1000)

    # Sort before normalizing: the first appended chunk is not necessarily the
    # highest-scoring one. Using a non-max denominator can produce scores > 1.
    # Scores are relative to the best hit (0-1), which is what the UI displays.
    ranked.sort(key=lambda item: item[0], reverse=True)
    top_raw = ranked[0][0]
    threshold = settings.retrieval_min_score if min_score is None else min_score
    limit = top_k or settings.retrieval_top_k
    results: list[RetrievedChunk] = []
    for raw_score, chunk_id, document_id, filename, chunk_index, content in ranked:
        normalized = raw_score / top_raw if top_raw else 0.0
        if normalized < threshold:
            continue
        results.append(
            RetrievedChunk(
                chunk_id=chunk_id,
                document_id=document_id,
                document_name=filename,
                chunk_index=chunk_index,
                content=content,
                score=round(normalized, 4),
            )
        )
        if len(results) >= limit:
            break

    elapsed = int((time.perf_counter() - started) * 1000)
    logger.info(
        "retrieval user_id=%s query_terms=%s candidates=%s hits=%s elapsed_ms=%s",
        user_id,
        len(query_terms),
        len(rows),
        len(results),
        elapsed,
    )
    return results, elapsed


def citations_from_chunks(chunks: list[RetrievedChunk], query: str = "") -> list[dict]:
    return [
        {
            "index": index,
            "chunk_id": item.chunk_id,
            "document_id": item.document_id,
            "document_name": item.document_name,
            "chunk_index": item.chunk_index,
            "snippet": _snippet(item.content, query),
            "content": item.content[:1200],
            "score": item.score,
        }
        for index, item in enumerate(chunks, start=1)
    ]
