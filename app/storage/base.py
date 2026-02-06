"""Abstract base class for storage backends."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import BinaryIO


class StorageBackend(ABC):
    """Abstract storage backend interface."""

    @abstractmethod
    async def save(self, file: BinaryIO, filename: str, content_type: str | None = None) -> str:
        """
        Save a file and return its storage path/URL.

        Args:
            file: File-like object to save
            filename: Original filename
            content_type: MIME type of the file

        Returns:
            Storage path or URL to access the file
        """
        pass

    @abstractmethod
    async def delete(self, path: str) -> bool:
        """
        Delete a file from storage.

        Args:
            path: Storage path returned from save()

        Returns:
            True if deleted successfully, False otherwise
        """
        pass

    @abstractmethod
    def get_url(self, path: str) -> str:
        """
        Get the public URL for a stored file.

        Args:
            path: Storage path

        Returns:
            Public URL to access the file
        """
        pass
