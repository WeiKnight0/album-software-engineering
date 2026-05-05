import argparse
from collections import Counter
from datetime import datetime, timezone
import json
import math
import os
import sys

if __package__ is None or __package__ == "":
    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.ai_client import infer_faces
from backend.db import init_db, open_db, reset_runtime_state
from backend.repositories import list_album_images, list_albums
from backend.services import persist_recognition
from backend.utils import parse_user_id

IMAGE_EXTS = (".png", ".jpg", ".jpeg", ".bmp", ".webp")


def collect_images(dataset_folder: str) -> list[str]:
    files = []
    for root, _, names in os.walk(dataset_folder):
        for name in sorted(names):
            full_path = os.path.join(root, name)
            if os.path.isfile(full_path) and name.lower().endswith(IMAGE_EXTS):
                files.append(full_path)
    return files


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Simulate backend processing uploaded images for one user")
    parser.add_argument("--dataset-folder", default="test_images")
    parser.add_argument("--user-id", default="1001")
    parser.add_argument("--limit", type=int, default=0, help="0 means all images")
    parser.add_argument("--output-root", default="test", help="Where run summary.json will be written")
    parser.add_argument("--visible", action="store_true", help="Save matplotlib visualizations per face album")
    return parser.parse_args()


def build_image_lookup(image_paths: list[str]) -> dict[str, list[str]]:
    lookup: dict[str, list[str]] = {}
    for path in image_paths:
        name = os.path.basename(path)
        lookup.setdefault(name, []).append(path)
    return lookup


def save_visualizations(user_summary: dict, image_lookup: dict[str, list[str]], run_dir: str) -> list[str]:
    try:
        import cv2
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
    except Exception as exc:
        raise RuntimeError(f"--visible requires matplotlib and cv2: {exc}")

    output_dir = os.path.join(run_dir, "visualizations")
    os.makedirs(output_dir, exist_ok=True)
    user_id = user_summary.get("user_id")
    saved_files: list[str] = []

    for album in user_summary.get("albums", []):
        face_id = album.get("face_id")
        names = album.get("content_images", [])
        cover_path = album.get("cover_path")
        if not names and not cover_path:
            continue

        items: list[tuple[str, str]] = []
        if cover_path:
            cover_full_path = cover_path
            if not os.path.isabs(cover_full_path):
                cover_full_path = os.path.abspath(cover_full_path)
            items.append((cover_full_path, "COVER"))

        for name in names:
            candidates = image_lookup.get(name, [])
            if candidates:
                items.append((candidates[0], name))

        if not items:
            continue

        cols = 3
        rows = max(1, math.ceil(len(items) / cols))
        fig, axes = plt.subplots(rows, cols, figsize=(cols * 4, rows * 4))
        axes_list = axes.flatten() if hasattr(axes, "flatten") else [axes]

        for i, ax in enumerate(axes_list):
            if i >= len(items):
                ax.axis("off")
                continue
            image_path, label_name = items[i]
            name = os.path.basename(image_path)
            img = cv2.imread(image_path)
            if img is None:
                ax.axis("off")
                ax.set_title(name)
                ax.text(0.05, 0.5, "load failed", transform=ax.transAxes, color="red")
                continue

            img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            ax.imshow(img_rgb)
            ax.axis("off")
            ax.text(
                0.02,
                0.98,
                f"user={user_id} face={face_id}\n{label_name}",
                transform=ax.transAxes,
                va="top",
                fontsize=8,
                color="white",
                bbox={"facecolor": "black", "alpha": 0.6, "pad": 2},
            )

        fig.suptitle(f"user={user_id} face_id={face_id} images={len(items)}", fontsize=12)
        fig.tight_layout()
        out_file = os.path.join(output_dir, f"user_{user_id}_face_{face_id}.png")
        fig.savefig(out_file, dpi=150)
        plt.close(fig)
        saved_files.append(out_file)

    return saved_files


def build_user_summary(user_id: int, records: list[dict]) -> dict:
    conn = open_db()
    c = conn.cursor()
    albums = list_albums(c, user_id)
    conn.close()

    albums_summary = []
    for item in albums:
        conn = open_db()
        c = conn.cursor()
        images = list_album_images(c, user_id, int(item["face_id"]))
        conn.close()
        content_images = [img.get("original_name") for img in images if img.get("original_name")]
        albums_summary.append(
            {
                "face_id": item.get("face_id"),
                "cover_path": item.get("cover_path"),
                "appearance_count": item.get("appearance_count"),
                "content_images": content_images,
            }
        )

    msg_counter = Counter()
    zero_count = 0
    one_count = 0
    ok_records = [r for r in records if r.get("status") == "ok"]
    for item in ok_records:
        result = item.get("result", {})
        msg = result.get("message") or "unknown"
        msg_counter[msg] += 1
        count = result.get("count")
        if count == 0:
            zero_count += 1
        elif count == 1:
            one_count += 1

    return {
        "user_id": user_id,
        "upload_total": len(records),
        "album_total": len(albums_summary),
        "albums": albums_summary,
        "upload_message_stats": dict(msg_counter),
        "upload_count_stats": {
            "count_0": zero_count,
            "count_1": one_count,
            "other": max(0, len(ok_records) - zero_count - one_count),
        },
    }


def print_user_album_summary(user_summary: dict) -> None:
    print(f"\n[user={user_summary.get('user_id')}] album_total={user_summary.get('album_total')}")
    print(f"  upload_message_stats={user_summary.get('upload_message_stats')}")
    print(f"  upload_count_stats={user_summary.get('upload_count_stats')}")
    for album in user_summary.get("albums", []):
        print(
            "  - face_id={face_id} cover={cover} images={images}".format(
                face_id=album.get("face_id"),
                cover=album.get("cover_path"),
                images=album.get("content_images", []),
            )
        )


def main() -> None:
    args = parse_args()
    user_id = parse_user_id(args.user_id)
    run_id = datetime.now().strftime("run_%Y%m%d_%H%M%S")
    run_dir = os.path.join(args.output_root, run_id)
    os.makedirs(run_dir, exist_ok=True)

    # Each backend test run starts from a clean state.
    reset_runtime_state()
    init_db()

    if not os.path.isdir(args.dataset_folder):
        print(f"Dataset folder not found: {args.dataset_folder}")
        return

    images = collect_images(args.dataset_folder)
    if args.limit > 0:
        images = images[: args.limit]

    if not images:
        print("No images found.")
        return

    image_lookup = build_image_lookup(images)

    success = 0
    failed = 0
    records = []
    for index, image_path in enumerate(images, start=1):
        file_name = os.path.basename(image_path)
        print(f"[{index}/{len(images)}] processing {file_name}")
        try:
            with open(image_path, "rb") as f:
                payload = f.read()
            infer_payload = infer_faces(payload, file_name, "application/octet-stream")
            response = persist_recognition(user_id, file_name, "application/octet-stream", payload, infer_payload)
            print(
                "  OK image_id={image_id} count={count} message={message}".format(
                    image_id=response.get("image_id"),
                    count=response.get("count"),
                    message=response.get("message"),
                )
            )
            success += 1
            records.append(
                {
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "index": index,
                    "image_path": image_path,
                    "status": "ok",
                    "result": {
                        "image_id": response.get("image_id"),
                        "count": response.get("count"),
                        "message": response.get("message"),
                    },
                }
            )
        except Exception as exc:
            failed += 1
            print(f"  FAIL: {exc}")
            records.append(
                {
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "index": index,
                    "image_path": image_path,
                    "status": "failed",
                    "error": str(exc),
                }
            )

    summary = {
        "run_id": run_id,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "dataset_folder": args.dataset_folder,
        "selected_count": len(images),
        "success": success,
        "failed": failed,
        "user": build_user_summary(user_id, records),
        "records": records,
    }

    if args.visible:
        visualization_files = save_visualizations(summary["user"], image_lookup, run_dir)
        summary["visualization_files"] = visualization_files
        print(f"Saved visualizations: {len(visualization_files)}")

    summary_path = os.path.join(run_dir, "summary.json")
    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)

    print_user_album_summary(summary["user"])
    print(f"\nFinished. success={success} failed={failed}")
    print(f"Summary written to: {summary_path}")


if __name__ == "__main__":
    main()

