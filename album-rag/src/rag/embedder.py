"""Text embedding using SentenceTransformers."""

import os
import sys
from typing import List

from sentence_transformers import SentenceTransformer

from rag.config import settings

if sys.platform == "win32" and "PYTHONIOENCODING" not in os.environ:
    os.environ["PYTHONIOENCODING"] = "utf-8"


class TextEmbedder:
    """Wrapper around a sentence-transformer model."""

    def __init__(self) -> None:
        device = self._resolve_device()
        self.model = SentenceTransformer(
            settings.embedding_model,
            device=device,
            local_files_only=True,
        )

    def _resolve_device(self) -> str:
        configured = settings.embedding_device.strip().lower()
        if configured and configured != "auto":
            return configured

        try:
            import torch

            if torch.cuda.is_available():
                return "cuda"
            if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
                return "mps"
        except Exception:
            pass

        return "cpu"

    def encode(self, texts: List[str]) -> List[List[float]]:
        """Embed a list of texts into dense vectors."""
        embeddings = self.model.encode(
            texts,
            normalize_embeddings=settings.embedding_normalize,
            show_progress_bar=False,
            convert_to_numpy=True,
        )
        return embeddings.tolist()

    def encode_single(self, text: str) -> List[float]:
        """Embed a single text."""
        return self.encode([text])[0]
