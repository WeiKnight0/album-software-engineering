"""Command-line interface for the image knowledge base."""

import os
import sys
from pathlib import Path

from rich.console import Console
from rich.panel import Panel
from rich.text import Text

# Fix Windows encoding for rich output
if sys.platform == "win32" and "PYTHONIOENCODING" not in os.environ:
    os.environ["PYTHONIOENCODING"] = "utf-8"

from rag.config import settings
from rag.ingest import Ingestor
from rag.search import ImageSearcher, RAGChatbot


console = Console()


def print_banner() -> None:
    """Print application banner."""
    banner = Text()
    banner.append("📷 图像知识库 RAG\n", style="bold green")
    banner.append("基于多模态大模型描述 + 向量检索\n", style="dim")
    console.print(Panel(banner, expand=False))


def check_env() -> bool:
    """Check whether required environment variables are set."""
    if not settings.openai_api_key:
        console.print(
            "[red]错误：未设置 OPENAI_API_KEY 环境变量。[/red]\n"
            "请在 .env 文件或环境变量中配置以下项：\n"
            "  OPENAI_API_KEY=your-key\n"
            "  OPENAI_BASE_URL=https://api.openai.com/v1  (可选)\n"
            "  OPENAI_MODEL=gpt-4o  (可选)\n"
        )
        return False
    return True


def cmd_ingest() -> None:
    """Run ingestion."""
    if not check_env():
        sys.exit(1)

    image_dir = settings.image_dir_path
    if not image_dir.exists():
        console.print(f"[red]图片目录不存在: {image_dir}[/red]")
        sys.exit(1)

    console.print(f"[cyan]图片目录: {image_dir}[/cyan]")
    Ingestor().run()


def cmd_chat() -> None:
    """Run interactive RAG chat."""
    bot = RAGChatbot()
    bot.interactive_chat()


def cmd_search(query: str) -> None:
    """Single search query."""
    searcher = ImageSearcher()
    answer = searcher.ask(query)
    console.print(answer)


def cmd_status() -> None:
    """Show knowledge base status."""
    from rag.vector_store import VectorStore

    store = VectorStore()
    count = store.count()
    console.print(f"[green]知识库记录数: {count}[/green]")
    if count > 0:
        items = store.list_all(limit=10)
        console.print("[dim]最近入库的图片：[/dim]")
        for item in items:
            name = item["payload"].get("image_name", "未知")
            console.print(f"  - {name}")


def main() -> None:
    """CLI entry point."""
    args = sys.argv[1:]

    if not args or args[0] in ("-h", "--help", "help"):
        print_banner()
        console.print(
            "用法: uv run python -m rag.cli <command> [args]\n\n"
            "命令:\n"
            "  [bold]ingest[/bold]          导入图片到知识库\n"
            "  [bold]chat[/bold]           交互式问答\n"
            "  [bold]search <query>[/bold]  单次搜索\n"
            "  [bold]status[/bold]         查看知识库状态\n"
        )
        sys.exit(0)

    command = args[0]

    if command == "ingest":
        print_banner()
        cmd_ingest()
    elif command == "chat":
        print_banner()
        cmd_chat()
    elif command == "search":
        if len(args) < 2:
            console.print("[red]请提供搜索关键词，例如：uv run python -m rag.cli search 红色的花[/red]")
            sys.exit(1)
        query = " ".join(args[1:])
        cmd_search(query)
    elif command == "status":
        cmd_status()
    else:
        console.print(f"[red]未知命令: {command}[/red]")
        sys.exit(1)


if __name__ == "__main__":
    main()
