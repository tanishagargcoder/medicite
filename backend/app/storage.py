"""Raw file storage: local disk by default, S3 when configured.

The PDF viewer needs the original bytes back to render the cited page, so
whatever we store must be retrievable by document_id.
"""

from __future__ import annotations

from .config import settings


class LocalFileStorage:
    def save(self, document_id: str, filename: str, data: bytes) -> str:
        suffix = ".pdf" if filename.lower().endswith(".pdf") else ".docx"
        path = settings.upload_dir / f"{document_id}{suffix}"
        path.write_bytes(data)
        return str(path)

    def load(self, document_id: str) -> tuple[bytes, str] | None:
        for suffix, media_type in ((".pdf", "application/pdf"), (".docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")):
            path = settings.upload_dir / f"{document_id}{suffix}"
            if path.exists():
                return path.read_bytes(), media_type
        return None

    def delete(self, document_id: str) -> None:
        for suffix in (".pdf", ".docx"):
            path = settings.upload_dir / f"{document_id}{suffix}"
            path.unlink(missing_ok=True)


class S3FileStorage:
    def __init__(self, bucket: str) -> None:
        import boto3

        self._s3 = boto3.client("s3")
        self._bucket = bucket

    def _key(self, document_id: str, suffix: str) -> str:
        return f"documents/{document_id}{suffix}"

    def save(self, document_id: str, filename: str, data: bytes) -> str:
        suffix = ".pdf" if filename.lower().endswith(".pdf") else ".docx"
        key = self._key(document_id, suffix)
        self._s3.put_object(
            Bucket=self._bucket,
            Key=key,
            Body=data,
            ContentType="application/pdf" if suffix == ".pdf" else "application/octet-stream",
            # Documents are PHI-adjacent — encrypt at rest by default.
            ServerSideEncryption="AES256",
        )
        return f"s3://{self._bucket}/{key}"

    def load(self, document_id: str) -> tuple[bytes, str] | None:
        for suffix, media_type in ((".pdf", "application/pdf"), (".docx", "application/octet-stream")):
            try:
                obj = self._s3.get_object(Bucket=self._bucket, Key=self._key(document_id, suffix))
                return obj["Body"].read(), media_type
            except self._s3.exceptions.NoSuchKey:
                continue
        return None

    def delete(self, document_id: str) -> None:
        for suffix in (".pdf", ".docx"):
            self._s3.delete_object(Bucket=self._bucket, Key=self._key(document_id, suffix))


def build_storage():
    if settings.storage_backend == "s3" and settings.s3_bucket:
        return S3FileStorage(settings.s3_bucket)
    return LocalFileStorage()


file_storage = build_storage()
