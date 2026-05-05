"""Search and QA over the image knowledge base."""

import os
import sys
from typing import List

from rich.console import Console

from rag.config import settings
from rag.embedder import TextEmbedder
from rag.vector_store import VectorStore

if sys.platform == "win32" and "PYTHONIOENCODING" not in os.environ:
    os.environ["PYTHONIOENCODING"] = "utf-8"


console = Console()


class ImageSearcher:
    """Search images by natural-language query."""

    def __init__(self) -> None:
        self.embedder = TextEmbedder()
        self.store = VectorStore()

    def search(
        self,
        query: str,
        top_k: int = 5,
    ) -> List[dict]:
        """Return top-k matching image records."""
        vector = self.embedder.encode_single(query)
        results = self.store.search(vector, top_k=top_k)
        return results

    def ask(self, query: str, top_k: int = 5) -> str:
        """Answer a question using retrieved image knowledge (raw retrieval)."""
        results = self.search(query, top_k=top_k)
        if not results:
            return "未找到相关图片。"

        lines = [f"根据您的问题「{query}」，找到以下相关图片：\n"]
        for idx, r in enumerate(results, 1):
            payload = r["payload"]
            score = r["score"]
            name = payload.get("image_name", "未知")
            path = payload.get("image_path", "")
            desc = payload.get("description", "无描述")
            display_desc = desc[:300] + "..." if len(desc) > 300 else desc
            lines.append(
                f"{idx}. [相似度 {score:.3f}] {name}\n"
                f"   路径: {path}\n"
                f"   描述: {display_desc}\n"
            )
        return "\n".join(lines)


class RAGChatbot:
    """RAG-based chatbot that generates answers using retrieved image knowledge."""

    def __init__(self) -> None:
        self.searcher = ImageSearcher()
        self._init_llm()

    def _init_llm(self) -> None:
        """Initialize OpenAI-compatible LLM client."""
        try:
            from openai import OpenAI
            if settings.openai_api_key:
                self.client = OpenAI(
                    api_key=settings.openai_api_key,
                    base_url=settings.openai_base_url,
                )
                self.model = settings.openai_model
            else:
                self.client = None
                self.model = None
        except Exception:
            self.client = None
            self.model = None

    def _build_context(self, results: List[dict]) -> str:
        """Build context string from retrieved image descriptions."""
        lines = []
        for idx, r in enumerate(results, 1):
            payload = r["payload"]
            name = payload.get("image_name", "未知")
            desc = payload.get("description", "无描述")
            lines.append(f"【参考图片 {idx}】{name}\n{desc}\n")
        return "\n".join(lines)

    def answer(self, query: str, top_k: int = 5) -> dict:
        """Generate an answer based on retrieved image knowledge.

        Returns a dict with keys: answer, sources, raw_results.
        """
        results = self.searcher.search(query, top_k=top_k)
        if not results:
            return {
                "answer": "未在知识库中找到相关图片，无法回答该问题。",
                "sources": [],
                "raw_results": [],
            }

        sources = [r["payload"].get("image_name", "") for r in results]

        # Fallback to raw retrieval if LLM is not configured
        if not self.client:
            raw_answer = self.searcher.ask(query, top_k=top_k)
            return {
                "answer": raw_answer,
                "sources": sources,
                "raw_results": results,
            }

        context = self._build_context(results)

        prompt = (
            "你是一个图像知识库助手。用户会通过提问来查询图片中的信息。\n"
            "请基于以下从知识库中检索到的图片描述，用中文回答用户的问题。\n"
            "如果信息不足以回答问题，请诚实说明。\n\n"
            f"{context}\n"
            f"用户问题：{query}\n\n"
            "请给出清晰、准确的回答。在回答末尾，请列出参考的图片名称。"
        )

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=2048,
                temperature=0.5,
            )
            answer = response.choices[0].message.content or "生成回答失败。"
        except Exception as e:
            answer = f"大模型生成回答时出错：{e}\n\n以下是原始检索结果：\n\n{self.searcher.ask(query, top_k=top_k)}"

        return {
            "answer": answer,
            "sources": sources,
            "raw_results": results,
        }

    def interactive_chat(self) -> None:
        """Run an interactive RAG Q&A loop in the terminal."""
        count = self.searcher.store.count()
        if count == 0:
            console.print(
                "[red]知识库为空，请先运行导入命令：[/red] "
                "[bold]uv run python -m rag.cli ingest[/bold]"
            )
            return

        mode = "RAG 问答" if self.client else "原始检索"
        console.print(
            f"[green]知识库已就绪，共 {count} 张图片。"
            f"当前模式：{mode}（输入 q 退出）[/green]\n"
        )

        while True:
            try:
                query = console.input("[bold blue]您的问题[/bold blue]: ")
            except (EOFError, KeyboardInterrupt):
                console.print("\n[dim]再见！[/dim]")
                break

            query = query.strip()
            if query.lower() in ("q", "quit", "exit", "退出"):
                console.print("[dim]再见！[/dim]")
                break
            if not query:
                continue

            with console.status("[cyan]正在检索并生成回答...[/cyan]", spinner="dots"):
                result = self.answer(query)

            console.print(result["answer"])
            if result["sources"]:
                console.print(
                    f"\n[dim]参考图片: {', '.join(result['sources'])}[/dim]"
                )
            console.print()
