"""Ingest images into the knowledge base with performance metrics."""

import hashlib
import json
import os
import sys
import time
from pathlib import Path
from typing import List

from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, TaskProgressColumn
from rich.table import Table

from rag.config import settings
from rag.image_descriptor import ImageDescriptor
from rag.embedder import TextEmbedder
from rag.vector_store import VectorStore

if sys.platform == "win32" and "PYTHONIOENCODING" not in os.environ:
    os.environ["PYTHONIOENCODING"] = "utf-8"

console = Console()


class Ingestor:
    """Orchestrates image ingestion: describe -> embed -> store."""

    def __init__(self) -> None:
        self.descriptor = ImageDescriptor()
        self.embedder = TextEmbedder()
        self.store = VectorStore()
        self.image_dir = settings.image_dir_path
        self.batch_size = settings.batch_size
        self.artifacts_dir = settings.artifacts_dir_path
        self.track_file = settings.ingest_tracker_path
        self.metrics_file = settings.ingest_metrics_path
        self.artifacts_dir.mkdir(parents=True, exist_ok=True)

    def _load_tracker(self) -> set:
        if self.track_file.exists():
            data = json.loads(self.track_file.read_text(encoding="utf-8"))
            return set(data)
        return set()

    def _save_tracker(self, paths: set) -> None:
        self.track_file.write_text(
            json.dumps(sorted(paths), ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    def _list_images(self) -> List[Path]:
        """List all supported image files in the directory."""
        exts = {".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"}
        files = [
            p for p in self.image_dir.iterdir()
            if p.is_file() and p.suffix.lower() in exts
        ]
        return sorted(files)

    def _image_id(self, path: Path) -> str:
        """Stable UUID from file path."""
        import uuid
        return str(uuid.uuid5(uuid.NAMESPACE_URL, str(path.resolve())))

    def _get_image_size(self, path: Path) -> tuple:
        """Return (width, height) or (0, 0) if unable to read."""
        try:
            from PIL import Image
            with Image.open(path) as img:
                return img.size
        except Exception:
            return (0, 0)

    def run(self) -> None:
        """Run the full ingestion pipeline with metrics."""
        images = self._list_images()
        if not images:
            console.print("[yellow]未找到任何图片。[/yellow]")
            return

        ingested = self._load_tracker()
        to_process = []

        for img in images:
            img_str = str(img.resolve())
            if settings.skip_existing and img_str in ingested:
                continue
            to_process.append(img)

        if not to_process:
            console.print(f"[green]所有 {len(images)} 张图片已导入，无需处理。[/green]")
            return

        console.print(f"[cyan]共发现 {len(images)} 张图片，待处理 {to_process} 张。[/cyan]")
        console.print(f"[dim]Qdrant 当前记录数: {self.store.count()}[/dim]")

        new_ingested = set()
        metrics = []
        total_start = time.perf_counter()

        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            BarColumn(),
            TaskProgressColumn(),
            console=console,
        ) as progress:
            task = progress.add_task("[cyan]导入图片...", total=len(to_process))

            for img in to_process:
                progress.update(task, description=f"[cyan]处理 {img.name}...[/cyan]")
                metric = {
                    "image_name": img.name,
                    "file_size_bytes": img.stat().st_size,
                    "file_size_mb": round(img.stat().st_size / (1024 * 1024), 2),
                }

                # Image dimensions
                width, height = self._get_image_size(img)
                metric["width"] = width
                metric["height"] = height

                # Step 1: Describe (LLM or OCR fallback)
                t0 = time.perf_counter()
                description = self.descriptor.describe(img)
                t1 = time.perf_counter()
                describe_time = round(t1 - t0, 3)
                metric["describe_time_sec"] = describe_time
                metric["description_length"] = len(description) if description else 0
                metric["description_source"] = "OCR" if description and description.startswith("【本地OCR描述】") else "LLM"

                if not description:
                    metric["status"] = "failed"
                    metrics.append(metric)
                    progress.advance(task)
                    continue

                # Step 2: Embed
                t2 = time.perf_counter()
                vector = self.embedder.encode_single(description)
                t3 = time.perf_counter()
                embed_time = round(t3 - t2, 3)
                metric["embed_time_sec"] = embed_time

                # Step 3: Store
                t4 = time.perf_counter()
                img_id = self._image_id(img)
                payload = {
                    "image_path": str(img.resolve()),
                    "image_name": img.name,
                    "description": description,
                }
                self.store.upsert(
                    ids=[img_id],
                    vectors=[vector],
                    payloads=[{
                        "user_id": settings.default_user_id,
                        **payload,
                    }],
                )
                t5 = time.perf_counter()
                store_time = round(t5 - t4, 3)
                metric["store_time_sec"] = store_time
                metric["total_time_sec"] = round(t5 - t0, 3)
                metric["status"] = "success"

                new_ingested.add(str(img.resolve()))
                metrics.append(metric)
                progress.advance(task)

        total_elapsed = round(time.perf_counter() - total_start, 3)
        ingested.update(new_ingested)
        self._save_tracker(ingested)

        # Save metrics
        summary = {
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "total_images": len(images),
            "processed_images": len(to_process),
            "successful_images": sum(1 for m in metrics if m["status"] == "success"),
            "failed_images": sum(1 for m in metrics if m["status"] == "failed"),
            "total_elapsed_sec": total_elapsed,
            "avg_per_image_sec": round(total_elapsed / len(to_process), 3) if to_process else 0,
            "metrics": metrics,
        }
        self.metrics_file.write_text(
            json.dumps(summary, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

        # Print summary table
        console.print(f"\n[green]导入完成！Qdrant 当前记录数: {self.store.count()}[/green]")
        console.print(f"[dim]总耗时: {total_elapsed}s | 平均每张: {summary['avg_per_image_sec']}s[/dim]")

        table = Table(title="单张图片入库性能指标", show_header=True, header_style="bold cyan")
        table.add_column("图片", width=28, no_wrap=True)
        table.add_column("大小", width=8, justify="right")
        table.add_column("尺寸", width=12, justify="center")
        table.add_column("描述源", width=6, justify="center")
        table.add_column("描述耗时", width=10, justify="right")
        table.add_column("嵌入耗时", width=10, justify="right")
        table.add_column("存储耗时", width=10, justify="right")
        table.add_column("总耗时", width=10, justify="right")
        table.add_column("状态", width=6, justify="center")

        for m in metrics:
            size_str = f"{m['file_size_mb']}MB"
            dim_str = f"{m['width']}x{m['height']}" if m["width"] else "-"
            desc_t = f"{m['describe_time_sec']}s"
            embed_t = f"{m['embed_time_sec']}s"
            store_t = f"{m['store_time_sec']}s"
            total_t = f"{m.get('total_time_sec', '-')}s"
            status_color = "[green]✓[/green]" if m["status"] == "success" else "[red]✗[/red]"
            table.add_row(
                m["image_name"], size_str, dim_str, m.get("description_source", "-"),
                desc_t, embed_t, store_t, total_t, status_color,
            )

        console.print(table)
        console.print(f"\n[dim]详细指标已保存至: {self.metrics_file.resolve()}[/dim]")
