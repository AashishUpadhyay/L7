"""Local filesystem storage backend."""

from __future__ import annotations

import uuid
from pathlib import Path
from typing import BinaryIO

from app.storage.base import StorageBackend


class LocalFileSystemStorage(StorageBackend):
    """Store files on local filesystem."""

    def __init__(self, base_path: str, base_url: str = "/static/uploads"):
        """
        Initialize local filesystem storage.

        Args:
            base_path: Directory path where files will be stored
            base_url: Base URL path to access stored files
        """
        self.base_path = Path(base_path)
        self.base_url = base_url.rstrip("/")

        # Create directory if it doesn't exist
        self.base_path.mkdir(parents=True, exist_ok=True)

    async def save(self, file: BinaryIO, filename: str, content_type: str | None = None) -> str:
        """
        Save file to local filesystem with a unique name.

        Returns:
            Relative path from base_path
        """
        # Generate unique filename while preserving extension
        ext = Path(filename).suffix
        unique_filename = f"{uuid.uuid4()}{ext}"

        file_path = self.base_path / unique_filename

        # Write file in chunks
        with open(file_path, "wb") as f:
            while chunk := file.read(8192):
                f.write(chunk)

        return unique_filename

    async def delete(self, path: str) -> bool:
        """Delete file from local filesystem."""
        try:
            file_path = self.base_path / path
            if file_path.exists():
                file_path.unlink()
                return True
            return False
        except Exception:
            return False

    def get_url(self, path: str) -> str:
        """Get public URL for the file."""
        return f"{self.base_url}/{path}"
