"""FastAPI service for RAG vector operations (embedding + storage)."""

import os
import time
from typing import List

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

from rag.config import settings
from rag.embedder import TextEmbedder
from rag.vector_store import VectorStore

app = FastAPI(title="Photo RAG Vector Service")
security = HTTPBearer(auto_error=False)


def require_service_token(credentials: HTTPAuthorizationCredentials | None = Depends(security)) -> None:
    expected = os.getenv("INTERNAL_SERVICE_TOKEN", "")
    if not expected:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="service token is not configured")
    if credentials is None or credentials.scheme.lower() != "bearer" or credentials.credentials != expected:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid service token")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Shared embedder instance
_embedder: TextEmbedder | None = None

# Shared vector store instance (singleton to avoid Qdrant file lock issues)
_vector_store: VectorStore | None = None


def get_embedder() -> TextEmbedder:
    global _embedder
    if _embedder is None:
        _embedder = TextEmbedder()
    return _embedder


def get_vector_store() -> VectorStore:
    global _vector_store
    if _vector_store is None:
        _vector_store = VectorStore()
    return _vector_store


# ============ Request/Response Models ============

class IndexRequest(BaseModel):
    user_id: int
    image_id: str
    description: str


class IndexResponse(BaseModel):
    success: bool
    point_id: str
    embedding_time_ms: float


class SearchRequest(BaseModel):
    user_id: int
    query: str
    top_k: int = 10


class SearchResultItem(BaseModel):
    image_id: str
    score: float
    description: str


class SearchResponse(BaseModel):
    results: List[SearchResultItem]
    embedding_time_ms: float
    search_time_ms: float


class DeleteResponse(BaseModel):
    success: bool
    deleted_count: int


class HealthResponse(BaseModel):
    status: str
    collection: str
    point_count: int


# ============ Endpoints ============

@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    store = get_vector_store()
    count = store.count()
    # Do not close the singleton store here to avoid file lock issues
    return HealthResponse(
        status="ok",
        collection=settings.collection_name,
        point_count=count,
    )


@app.post("/index", response_model=IndexResponse, dependencies=[Depends(require_service_token)])
def index(req: IndexRequest) -> IndexResponse:
    try:
        embedder = get_embedder()
        t0 = time.time()
        vector = embedder.encode_single(req.description)
        embed_ms = (time.time() - t0) * 1000

        point_id = req.image_id
        store = get_vector_store()
        store.upsert(
            ids=[point_id],
            vectors=[vector],
            payloads=[{
                "user_id": req.user_id,
                "image_id": req.image_id,
                "description": req.description,
            }],
        )
        # Do not close the singleton store here to avoid file lock issues

        return IndexResponse(
            success=True,
            point_id=point_id,
            embedding_time_ms=round(embed_ms, 2),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Index failed: {str(e)}")


@app.post("/search", response_model=SearchResponse, dependencies=[Depends(require_service_token)])
def search(req: SearchRequest) -> SearchResponse:
    try:
        embedder = get_embedder()
        t0 = time.time()
        query_vector = embedder.encode_single(req.query)
        embed_ms = (time.time() - t0) * 1000

        t1 = time.time()
        store = get_vector_store()
        hits = store.search(
            query_vector=query_vector,
            user_id=req.user_id,
            top_k=req.top_k,
        )
        # Do not close the singleton store here to avoid file lock issues
        search_ms = (time.time() - t1) * 1000

        results = [
            SearchResultItem(
                image_id=hit["payload"].get("image_id", ""),
                score=hit["score"],
                description=hit["payload"].get("description", ""),
            )
            for hit in hits
        ]

        return SearchResponse(
            results=results,
            embedding_time_ms=round(embed_ms, 2),
            search_time_ms=round(search_ms, 2),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


@app.delete("/index/{user_id}/{image_id}", response_model=DeleteResponse, dependencies=[Depends(require_service_token)])
def delete_index(user_id: int, image_id: str) -> DeleteResponse:
    try:
        store = get_vector_store()
        store.delete_by_image_id(user_id, image_id)
        # Do not close the singleton store here to avoid file lock issues
        return DeleteResponse(success=True, deleted_count=1)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Delete failed: {str(e)}")
