"""Seed a demo account and realistic knowledge base.

Usage (from backend/):
    .venv/bin/python -m app.scripts.seed --reset
"""

from __future__ import annotations

import argparse
import asyncio
from datetime import timedelta

from sqlalchemy import delete, select

from app.core.security import hash_password
from app.db.base import utcnow
from app.db.session import get_session_factory, init_db
from app.models.chunk import Chunk
from app.models.conversation import Conversation
from app.models.document import Document
from app.models.enums import DocumentStatus, MessageRole, MessageStatus
from app.models.message import Message
from app.models.user import User
from app.services.document_parser import chunk_text

DEMO_EMAIL = "demo@zhiwen.app"
DEMO_PASSWORD = "Demo1234"

RAG_NOTE = """# RAG 工程实践笔记

## 1. 召回阶段优化
在 2 万条 chunk 的规模下，优先做低成本、收益确定的三件事：混合检索、查询改写、重排。
混合检索把 BM25 的精确词命中与向量检索的语义召回融合。根据离线实验，混合检索可将 Recall@5 提升约 12% 到 18%。

## 2. 混合检索与 RRF
RRF 只依赖排名信息，按 1 / (k + rank) 累加，k 通常取 60。它不需要处理 BM25 与余弦相似度的量纲差异，适合冷启动阶段。
如果已经有 100 到 300 条带标注的 query，可以尝试加权分数融合：先做 min-max 或 z-score 归一化，再调权重，例如 0.3 乘 BM25 加 0.7 乘向量。

## 3. 查询改写
用户问题往往口语化、缺少上下文。用一次低成本的小模型调用，把问题改写为检索友好的查询，并补全多轮对话中的指代。
查询改写要保留专有名词和版本号，不要擅自扩展用户没有提到的概念。

## 4. 重排
召回 Top 20 后使用 Cross-Encoder 重排到 Top 5，通常比更换 embedding 模型更划算。
重排会增加约 80 到 150 毫秒延迟，建议先离线评估 nDCG@10，再决定是否上线。

## 5. 评估
没有标注集时，先上线 RRF，并收集线上“无引用”和“点踩”的 query。两周后即可做第一轮融合策略评估。
关键指标包括 Recall@5、nDCG@10、引用命中率和答案忠实度。"""

RAG_SURVEY = """检索增强生成（Retrieval-Augmented Generation）综述

第三章 检索模块
检索模块通常由文档切分、索引构建、查询编码和相关性排序组成。稠密检索使用双塔模型把 query 与文档映射到同一向量空间，稀疏检索则依赖词项匹配。

第四章 融合策略
倒数排名融合（Reciprocal Rank Fusion, RRF）只使用各检索器的排名，不依赖分数分布，因此对不同检索器具有较好的鲁棒性。
加权分数融合在归一化后进行，需要为不同查询类型设置不同权重。实验表明，融合策略对最终 Recall 的影响通常大于单一 embedding 模型的替换。

第五章 评估
检索评估应同时覆盖召回与排序质量。Recall@k 衡量前 k 个结果中是否包含相关文档，nDCG@k 考虑相关文档的位置。
标注集应覆盖事实型、比较型、多跳型和否定型问题，建议不少于 100 条 query。"""

PRODUCT_MANUAL = """企业版产品手册 v2.3

一、SSO 概述
企业版支持 SAML 2.0 与 OIDC 单点登录。开启 SSO 后，成员使用企业身份提供商（IdP）账号登录，无需单独维护密码。
建议保留至少一个本地管理员账号，避免 IdP 配置错误导致无法进入控制台。

二、开通流程
1. 在企业控制台的“安全与权限”页面选择“单点登录”；
2. 填写 IdP 的 Entity ID、ACS URL、签名证书和登录地址；
3. 下载 SP Metadata，上传到 IdP 完成信任配置；
4. 使用测试账号完成一次 SP-initiated 登录；
5. 验证通过后，将 SSO 设置为强制登录方式。

三、常见问题
如果提示签名校验失败，请检查证书是否过期、是否包含完整 PEM 头尾，以及 IdP 与 SP 的时钟是否同步。
SSO 默认不自动同步组织架构，需要单独开启 SCIM 2.0。"""

DISTRIBUTED = """分布式系统课程讲义 · 第三章 一致性模型

3.1 线性一致性
线性一致性要求所有操作看起来像在一个全局时钟下按真实时间顺序发生。任何读操作都必须返回最近一次成功写入的值。
实现线性一致性通常需要共识协议，例如 Raft 或 Paxos，代价是更高的写延迟。

3.2 顺序一致性
顺序一致性只要求所有进程看到相同的操作顺序，但不要求这个顺序与真实时间一致。
它比线性一致性弱，适合对实时性要求不高、但需要全局顺序的系统。

3.3 因果一致性
因果一致性只保证存在因果关系的操作按顺序可见，没有因果关系的操作可以乱序。
它通常通过版本向量或因果依赖跟踪实现，适合低延迟的分布式协作场景。

3.4 最终一致性
最终一致性允许副本短暂不一致，但保证在没有新写入的情况下最终收敛。
选择一致性模型时，先明确业务能否接受“读到旧值”，再决定是否需要强一致。"""

ANALYTICS = """埋点口径说明 2026Q2

活跃用户：统计周期内至少完成一次有效会话的用户。有效会话定义为用户发送至少一条消息，且助手返回完成状态。
问答次数：以用户消息为准，不统计重新生成产生的助手消息。
引用命中率：助手回答中至少包含一条引用的会话数除以总会话数。
知识库文档数：只统计状态为 ready 的文档，processing 和 failed 不计入。
数据延迟：埋点事件通常在 5 分钟内进入数仓，T+1 生成正式报表。"""

EVAL_METHOD = """# 检索评估方法

## 标注集
标注集建议不少于 100 条 query，覆盖事实型、比较型、多跳型、否定型和口语化问题。
每条 query 标注 1 到 5 个相关 chunk，并记录标注人和时间。

## 离线指标
Recall@5：前 5 个结果中相关 chunk 的召回比例。
nDCG@10：考虑排序位置的相关性指标，适合比较不同融合策略。
MRR：第一个相关结果排名的倒数，适合答案只依赖单篇资料的场景。

## 在线指标
引用命中率、无引用率、用户点踩率、首字延迟和答案忠实度。
离线指标提升但在线指标下降时，优先检查标注集分布是否与真实流量一致。"""


async def _add_document(
    db,
    user: User,
    filename: str,
    file_type: str,
    size: int,
    content: str,
) -> tuple[Document, list[Chunk]]:
    pieces = chunk_text(content, 500, 80)
    document = Document(
        user_id=user.id,
        filename=filename,
        file_type=file_type,
        file_size=size,
        content=content,
        status=DocumentStatus.READY,
        chunk_count=len(pieces),
        enabled=True,
    )
    db.add(document)
    await db.flush()
    chunks = [
        Chunk(
            document_id=document.id,
            user_id=user.id,
            chunk_index=index,
            content=piece,
            char_count=len(piece),
        )
        for index, piece in enumerate(pieces)
    ]
    db.add_all(chunks)
    await db.flush()
    return document, chunks


def _citation(document: Document, chunk: Chunk, index: int, snippet: str) -> dict:
    return {
        "index": index,
        "chunk_id": chunk.id,
        "document_id": document.id,
        "document_name": document.filename,
        "chunk_index": chunk.chunk_index,
        "snippet": snippet,
        "content": chunk.content[:1200],
        "score": round(0.9 - index * 0.05, 2),
    }


async def seed(reset: bool = False) -> None:
    await init_db()
    factory = get_session_factory()
    async with factory() as db:
        existing = await db.scalar(select(User).where(User.email == DEMO_EMAIL))
        if existing is not None:
            if not reset:
                print(f"demo user already exists: {DEMO_EMAIL}; pass --reset to rebuild")
                return
            await db.execute(delete(Chunk).where(Chunk.user_id == existing.id))
            await db.execute(delete(Document).where(Document.user_id == existing.id))
            await db.execute(delete(Message).where(Message.user_id == existing.id))
            await db.execute(
                delete(Conversation).where(Conversation.user_id == existing.id)
            )
            await db.delete(existing)
            await db.commit()

        user = User(
            email=DEMO_EMAIL,
            name="周谨宇",
            password_hash=hash_password(DEMO_PASSWORD),
        )
        db.add(user)
        await db.flush()

        rag_doc, rag_chunks = await _add_document(
            db, user, "RAG 工程实践笔记.md", "md", 86_000, RAG_NOTE
        )
        survey_doc, survey_chunks = await _add_document(
            db, user, "检索增强生成综述.pdf", "pdf", 2_400_000, RAG_SURVEY
        )
        manual_doc, manual_chunks = await _add_document(
            db, user, "企业版产品手册 v2.3.docx", "docx", 1_100_000, PRODUCT_MANUAL
        )
        dist_doc, dist_chunks = await _add_document(
            db, user, "分布式系统课程讲义 · 第三章.pdf", "pdf", 3_800_000, DISTRIBUTED
        )
        _analytics_doc, analytics_chunks = await _add_document(
            db, user, "埋点口径说明 2026Q2.txt", "txt", 12_000, ANALYTICS
        )
        eval_doc, eval_chunks = await _add_document(
            db, user, "检索评估方法.md", "md", 34_000, EVAL_METHOD
        )
        await db.flush()

        now = utcnow()
        rag = Conversation(
            user_id=user.id,
            title="RAG 召回优化",
            message_count=4,
            last_message_at=now - timedelta(minutes=2),
            created_at=now - timedelta(minutes=20),
        )
        db.add(rag)
        await db.flush()
        c1 = _citation(rag_doc, rag_chunks[0], 1, "混合检索可将 Recall@5 提升约 12% 到 18%。")
        c2 = _citation(survey_doc, survey_chunks[0], 2, "RRF 只依赖排名，不依赖分数分布。")
        c3 = _citation(eval_doc, eval_chunks[0], 1, "标注集建议不少于 100 条 query。")
        db.add_all(
            [
                Message(
                    conversation_id=rag.id,
                    user_id=user.id,
                    role=MessageRole.USER,
                    content="在 RAG 里，召回阶段有哪些值得优先做的优化？我们现在的知识库大概 2 万条 chunk。",
                    status=MessageStatus.COMPLETED,
                    created_at=now - timedelta(minutes=8),
                ),
                Message(
                    conversation_id=rag.id,
                    user_id=user.id,
                    role=MessageRole.ASSISTANT,
                    content=(
                        "在 2 万条 chunk 的规模下，建议优先做**低成本、收益确定**的三件事，"
                        "而不是一上来就换更大的向量模型。\n\n"
                        "### 1. 混合检索（Hybrid Search）\n"
                        "把 BM25 的精确词命中与向量检索的语义召回融合，尤其适合你的资料里存在大量"
                        "产品名、接口名和版本号的情况。根据资料中的实验，混合检索可将 Recall@5 "
                        "提升约 **12%–18%**[1]。\n\n"
                        "- 先用 RRF（倒数排名融合）做粗融合，稳定且无需调权重；\n"
                        "- 有标注数据后，再切换为加权分数融合，并做归一化。\n\n"
                        "### 2. 查询改写（Query Rewriting）\n"
                        "用户的原始问题往往口语化、缺少上下文。用一次低成本的小模型调用，将问题改写为"
                        "「检索友好」的查询，并补全多轮对话中的指代。\n\n"
                        "### 3. 重排（Rerank）\n"
                        "召回 Top 20 后用 Cross-Encoder 重排到 Top 5。它通常比更换 Embedding 模型"
                        "更划算，但会增加约 80–150ms 延迟；建议先离线评估再上线。"
                    ),
                    status=MessageStatus.COMPLETED,
                    citations=[c1, c2],
                    latency_ms=4200,
                    created_at=now - timedelta(minutes=7),
                ),
                Message(
                    conversation_id=rag.id,
                    user_id=user.id,
                    role=MessageRole.USER,
                    content="混合检索里 BM25 和向量分数怎么融合比较稳妥？",
                    status=MessageStatus.COMPLETED,
                    created_at=now - timedelta(minutes=4),
                ),
                Message(
                    conversation_id=rag.id,
                    user_id=user.id,
                    role=MessageRole.ASSISTANT,
                    content=(
                        "稳妥的顺序是：**先 RRF，再考虑加权融合**。两种分数的量纲不同，"
                        "直接相加会让某一路主导，必须先处理。\n\n"
                        "- **RRF**：只使用排名，按 `1 / (k + rank)` 累加，k 取 60 左右。"
                        "无需归一化，冷启动最稳；\n"
                        "- **加权分数融合**：先做 min-max 或 z-score 归一化，再按业务调 "
                        "`0.3 × BM25 + 0.7 × 向量`；\n"
                        "- 用 100–300 条带标注的 query 做离线评测，以 Recall@5 和 nDCG@10 选择方案。\n\n"
                        "如果团队还没有标注集，建议先用 RRF 上线，同时把线上「无引用 / 点踩」的 "
                        "query 收集起来，两周后就能做第一轮融合策略评估[1]。"
                    ),
                    status=MessageStatus.COMPLETED,
                    citations=[c1, c3],
                    latency_ms=3600,
                    created_at=now - timedelta(minutes=2),
                ),
            ]
        )

        sso = Conversation(
            user_id=user.id,
            title="企业版 SSO 开通流程",
            message_count=2,
            last_message_at=now - timedelta(days=1, hours=2),
            created_at=now - timedelta(days=1, hours=3),
        )
        db.add(sso)
        await db.flush()
        sso_cite = _citation(
            manual_doc, manual_chunks[0], 1, "企业版支持 SAML 2.0 与 OIDC 单点登录。"
        )
        db.add_all(
            [
                Message(
                    conversation_id=sso.id,
                    user_id=user.id,
                    role=MessageRole.USER,
                    content="企业版如何开通 SSO？需要哪些配置？",
                    status=MessageStatus.COMPLETED,
                ),
                Message(
                    conversation_id=sso.id,
                    user_id=user.id,
                    role=MessageRole.ASSISTANT,
                    content=(
                        "企业版支持 **SAML 2.0** 与 **OIDC**。开通路径是：控制台 → 安全与权限 → "
                        "单点登录。\n\n"
                        "需要准备 IdP 的 Entity ID、ACS URL、签名证书和登录地址，并下载 SP Metadata "
                        "到 IdP 完成信任配置[1]。验证时建议先用测试账号完成一次 SP-initiated 登录，"
                        "通过后再强制开启 SSO。"
                    ),
                    status=MessageStatus.COMPLETED,
                    citations=[sso_cite],
                    latency_ms=3100,
                ),
            ]
        )

        consistency = Conversation(
            user_id=user.id,
            title="一致性模型复习",
            message_count=2,
            last_message_at=now - timedelta(days=3),
            created_at=now - timedelta(days=3),
        )
        db.add(consistency)
        await db.flush()
        dist_cite = _citation(
            dist_doc, dist_chunks[0], 1, "线性一致性要求所有操作按真实时间顺序发生。"
        )
        db.add_all(
            [
                Message(
                    conversation_id=consistency.id,
                    user_id=user.id,
                    role=MessageRole.USER,
                    content="线性一致性、顺序一致性和因果一致性有什么区别？",
                    status=MessageStatus.COMPLETED,
                ),
                Message(
                    conversation_id=consistency.id,
                    user_id=user.id,
                    role=MessageRole.ASSISTANT,
                    content=(
                        "三者的约束从强到弱依次是：**线性一致性 > 顺序一致性 > 因果一致性**。\n\n"
                        "- **线性一致性**：所有操作看起来在全局时钟下按真实时间发生，读必须返回最近写入；\n"
                        "- **顺序一致性**：所有进程看到相同顺序，但不要求与真实时间一致；\n"
                        "- **因果一致性**：只保证有因果关系的操作顺序，无因果关系的操作可以乱序[1]。"
                    ),
                    status=MessageStatus.COMPLETED,
                    citations=[dist_cite],
                    latency_ms=2800,
                ),
            ]
        )

        await db.commit()
        total_chunks = (
            len(rag_chunks)
            + len(survey_chunks)
            + len(manual_chunks)
            + len(dist_chunks)
            + len(analytics_chunks)
            + len(eval_chunks)
        )
        print(
            f"seeded demo user: {DEMO_EMAIL} / {DEMO_PASSWORD} "
            f"docs=6 chunks={total_chunks} conversations=3"
        )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--reset", action="store_true", help="delete and rebuild demo data")
    args = parser.parse_args()
    asyncio.run(seed(reset=args.reset))


if __name__ == "__main__":
    main()
