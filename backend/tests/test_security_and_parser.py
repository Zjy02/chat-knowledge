from __future__ import annotations

import pytest

from app.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)
from app.services.document_parser import (
    DocumentParseError,
    chunk_text,
    extract_text,
    normalize_filename,
    validate_upload,
)


def test_password_hash_roundtrip():
    hashed = hash_password("Demo1234")
    assert hashed != "Demo1234"
    assert verify_password("Demo1234", hashed)
    assert not verify_password("wrong", hashed)


def test_jwt_roundtrip():
    token = create_access_token(42)
    assert decode_access_token(token) == 42


def test_normalize_filename_strips_paths():
    assert normalize_filename("../../etc/passwd.txt") == "passwd.txt"
    assert normalize_filename("") == "未命名文件"


def test_validate_upload_rejects_bad_extension():
    with pytest.raises(DocumentParseError):
        validate_upload("malware.exe", b"MZ", 1000)


def test_validate_upload_rejects_bad_pdf_magic():
    with pytest.raises(DocumentParseError):
        validate_upload("fake.pdf", b"not a pdf", 1000)


def test_validate_upload_accepts_text():
    ext = validate_upload("notes.md", "你好".encode(), 1000)
    assert ext == ".md"


def test_extract_text_markdown_and_gb18030():
    assert "知识" in extract_text("a.md", "# 知识\n\n内容".encode())
    assert "中文" in extract_text("a.txt", "中文内容".encode("gb18030"))


def test_extract_text_rejects_empty():
    with pytest.raises(DocumentParseError):
        extract_text("empty.txt", b"   \n  ")


def test_chunk_text_has_size_and_overlap():
    text = "第一段。" * 200
    chunks = chunk_text(text, chunk_size=120, overlap=20)
    assert len(chunks) > 2
    assert all(len(chunk) <= 140 for chunk in chunks)
    joined = "".join(chunks)
    assert "第一段" in joined


def test_chunk_text_empty():
    assert chunk_text("   ") == []
