"""查看知识库中所有图片的详细描述。"""

import os
import sys

if sys.platform == "win32" and "PYTHONIOENCODING" not in os.environ:
    os.environ["PYTHONIOENCODING"] = "utf-8"

from rich.console import Console
from rich.panel import Panel
from rich.table import Table

from rag.vector_store import VectorStore


console = Console()


def main() -> None:
    store = VectorStore()
    count = store.count()

    if count == 0:
        console.print("[red]知识库为空，请先运行导入命令。[/red]")
        sys.exit(1)

    console.print(Panel(
        f"[bold green]📷 图片知识库描述查看器[/bold green]\n"
        f"[dim]共 {count} 张图片[/dim]",
        expand=False,
    ))

    items = store.list_all(limit=1000)

    # Build rich table
    table = Table(
        title="图片描述列表",
        show_header=True,
        header_style="bold cyan",
        show_lines=True,
        expand=True,
    )
    table.add_column("序号", width=4, justify="center")
    table.add_column("图片名称", width=28, no_wrap=True)
    table.add_column("描述", ratio=1)

    for idx, item in enumerate(items, 1):
        payload = item["payload"]
        name = payload.get("image_name", "未知")
        desc = payload.get("description", "无描述")
        # Truncate very long descriptions for table view
        display_desc = desc.replace("\n", " ")
        if len(display_desc) > 300:
            display_desc = display_desc[:300] + "..."
        table.add_row(str(idx), name, display_desc)

    console.print(table)

    # Also offer to view full description of a single image
    console.print("\n[dim]提示：如需查看某张图片的完整描述，请使用：[/dim]")
    console.print(
        "[bold]uv run python dev/scripts/view_descriptions.py --name <图片名>[/bold]\n"
        "例如：uv run python dev/scripts/view_descriptions.py --name IMG_20260303_105448.jpg"
    )

    store.close()


def view_single(image_name: str) -> None:
    store = VectorStore()
    items = store.list_all(limit=1000)
    store.close()

    for item in items:
        payload = item["payload"]
        name = payload.get("image_name", "")
        if name == image_name:
            desc = payload.get("description", "无描述")
            path = payload.get("image_path", "")

            console.print(Panel(
                f"[bold green]{name}[/bold green]\n"
                f"[dim]{path}[/dim]",
                expand=False,
            ))
            console.print(desc)
            return

    console.print(f"[red]未找到图片：{image_name}[/red]")
    sys.exit(1)


if __name__ == "__main__":
    args = sys.argv[1:]
    if len(args) >= 2 and args[0] == "--name":
        view_single(args[1])
    else:
        main()
