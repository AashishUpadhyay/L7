"""Storage configuration and factory."""

from __future__ import annotations

import os

from app.storage.base import StorageBackend
from app.storage.local import LocalFileSystemStorage


def get_storage_backend() -> StorageBackend:
    """
    Get the configured storage backend.

    Storage backend is determined by STORAGE_BACKEND environment variable:
    - "local" (default): Local filesystem storage
    - "s3": Amazon S3 storage (future implementation)
    - "gcs": Google Cloud Storage (future implementation)
    """
    backend_type = os.getenv("STORAGE_BACKEND", "local").lower()

    if backend_type == "local":
        storage_path = os.getenv("STORAGE_LOCAL_PATH", "./uploads")
        storage_url = os.getenv("STORAGE_LOCAL_URL", "/static/uploads")
        return LocalFileSystemStorage(base_path=storage_path, base_url=storage_url)

    # Future implementations:
    # elif backend_type == "s3":
    #     return S3Storage(
    #         bucket=os.getenv("AWS_S3_BUCKET"),
    #         region=os.getenv("AWS_REGION"),
    #         access_key=os.getenv("AWS_ACCESS_KEY_ID"),
    #         secret_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
    #     )
    # elif backend_type == "gcs":
    #     return GCSStorage(
    #         bucket=os.getenv("GCS_BUCKET"),
    #         credentials=os.getenv("GCS_CREDENTIALS_PATH"),
    #     )

    raise ValueError(f"Unsupported storage backend: {backend_type}")


# Singleton instance
_storage_backend: StorageBackend | None = None


def get_storage() -> StorageBackend:
    """Get the storage backend singleton."""
    global _storage_backend
    if _storage_backend is None:
        _storage_backend = get_storage_backend()
    return _storage_backend
