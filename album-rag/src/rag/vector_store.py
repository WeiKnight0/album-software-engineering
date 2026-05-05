"""Qdrant vector store for RAG with user isolation."""

from pathlib import Path
from typing import List, Optional

from qdrant_client import QdrantClient
from qdrant_client.http.models import (
    Distance,
    FieldCondition,
    Filter,
    MatchValue,
    PointStruct,
    VectorParams,
)

from rag.config import settings


class VectorStore:
    """Local Qdrant vector store with user isolation via payload filter."""

    def __init__(self) -> None:
        self.path = settings.qdrant_path_absolute
        self.collection_name = settings.collection_name
        self.vector_size = settings.vector_size
        self.client = QdrantClient(path=str(self.path))
        self._ensure_collection()

    def _ensure_collection(self) -> None:
        """Create collection if it does not exist."""
        collections = self.client.get_collections().collections
        names = {c.name for c in collections}
        if self.collection_name not in names:
            self.client.create_collection(
                collection_name=self.collection_name,
                vectors_config=VectorParams(
                    size=self.vector_size,
                    distance=Distance.COSINE,
                ),
            )

    def upsert(
        self,
        ids: List[str],
        vectors: List[List[float]],
        payloads: List[dict],
    ) -> None:
        """Insert or update points."""
        points = [
            PointStruct(id=id_, vector=vec, payload=payload)
            for id_, vec, payload in zip(ids, vectors, payloads)
        ]
        self.client.upsert(
            collection_name=self.collection_name,
            points=points,
        )

    def search(
        self,
        query_vector: List[float],
        user_id: int,
        top_k: int = 10,
    ) -> List[dict]:
        """Search for nearest neighbours filtered by user_id.

        Returns a list of dicts with keys: id, score, payload.
        """
        response = self.client.query_points(
            collection_name=self.collection_name,
            query=query_vector,
            limit=top_k,
            query_filter=Filter(
                must=[
                    FieldCondition(
                        key="user_id",
                        match=MatchValue(value=user_id),
                    )
                ]
            ),
            with_payload=True,
        )
        return [
            {
                "id": r.id,
                "score": r.score,
                "payload": r.payload,
            }
            for r in response.points
        ]

    def delete_by_image_id(self, user_id: int, image_id: str) -> int:
        """Delete points matching user_id and image_id. Returns deleted count."""
        filter_ = Filter(
            must=[
                FieldCondition(key="user_id", match=MatchValue(value=user_id)),
                FieldCondition(key="image_id", match=MatchValue(value=image_id)),
            ]
        )
        # Use delete with filter
        self.client.delete(
            collection_name=self.collection_name,
            points_selector=filter_,
        )
        return 1  # Qdrant delete doesn't return count directly; we assume success

    def count(self) -> int:
        """Return total number of points."""
        return self.client.count(collection_name=self.collection_name).count

    def close(self) -> None:
        """Close the Qdrant client gracefully."""
        try:
            self.client.close()
        except Exception:
            pass
