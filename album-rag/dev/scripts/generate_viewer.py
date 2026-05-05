"""Generate a static HTML viewer for the image knowledge base."""

import os
import sys

if sys.platform == "win32" and "PYTHONIOENCODING" not in os.environ:
    os.environ["PYTHONIOENCODING"] = "utf-8"

from rag.config import settings
from rag.vector_store import VectorStore


HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>图像知识库 - 完整描述查看器</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background: #f5f7fa;
            color: #333;
            height: 100vh;
            overflow: hidden;
        }
        .container {
            display: flex;
            height: 100vh;
        }
        .sidebar {
            width: 320px;
            background: #fff;
            border-right: 1px solid #e8e8e8;
            overflow-y: auto;
            flex-shrink: 0;
        }
        .sidebar-header {
            padding: 20px;
            border-bottom: 1px solid #e8e8e8;
            background: #fafafa;
            position: sticky;
            top: 0;
            z-index: 10;
        }
        .sidebar-header h1 {
            font-size: 18px;
            color: #1a1a1a;
            margin-bottom: 6px;
        }
        .sidebar-header p {
            font-size: 13px;
            color: #888;
        }
        .image-list {
            padding: 10px;
        }
        .image-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 10px;
            border-radius: 8px;
            cursor: pointer;
            transition: background 0.2s;
            margin-bottom: 4px;
        }
        .image-item:hover {
            background: #f0f5ff;
        }
        .image-item.active {
            background: #e6f0ff;
            border: 1px solid #1890ff;
        }
        .image-item img {
            width: 60px;
            height: 60px;
            object-fit: cover;
            border-radius: 6px;
            flex-shrink: 0;
        }
        .image-item .info {
            flex: 1;
            min-width: 0;
        }
        .image-item .info .name {
            font-size: 13px;
            font-weight: 500;
            color: #333;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .image-item .info .preview {
            font-size: 12px;
            color: #888;
            margin-top: 4px;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }
        .main {
            flex: 1;
            overflow-y: auto;
            padding: 32px;
        }
        .detail-card {
            background: #fff;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.06);
            max-width: 900px;
            margin: 0 auto;
            overflow: hidden;
        }
        .detail-image {
            width: 100%;
            max-height: 500px;
            object-fit: contain;
            background: #f0f0f0;
            display: block;
        }
        .detail-body {
            padding: 28px;
        }
        .detail-title {
            font-size: 20px;
            font-weight: 600;
            color: #1a1a1a;
            margin-bottom: 8px;
        }
        .detail-path {
            font-size: 13px;
            color: #888;
            font-family: monospace;
            background: #f5f5f5;
            padding: 8px 12px;
            border-radius: 6px;
            margin-bottom: 20px;
            word-break: break-all;
        }
        .detail-desc {
            font-size: 15px;
            line-height: 1.8;
            color: #333;
            white-space: pre-wrap;
        }
        .empty-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            color: #888;
        }
        .empty-state h2 {
            font-size: 24px;
            margin-bottom: 12px;
            color: #ccc;
        }
    </style>
</head>
<body>
    <div class="container">
        <aside class="sidebar">
            <div class="sidebar-header">
                <h1>📷 图像知识库</h1>
                <p>共 {{count}} 张图片 · 点击左侧查看详情</p>
            </div>
            <div class="image-list">
                {{image_list}}
            </div>
        </aside>
        <main class="main" id="main">
            <div class="empty-state" id="empty">
                <h2>👈 请选择一张图片</h2>
                <p>点击左侧列表查看完整描述</p>
            </div>
            <div class="detail-card" id="detail" style="display:none">
                <img class="detail-image" id="detail-img" src="" alt="">
                <div class="detail-body">
                    <div class="detail-title" id="detail-name"></div>
                    <div class="detail-path" id="detail-path"></div>
                    <div class="detail-desc" id="detail-desc"></div>
                </div>
            </div>
        </main>
    </div>

    <script>
        const items = {{items_json}};

        function showItem(index) {
            const item = items[index];
            document.querySelectorAll('.image-item').forEach((el, i) => {
                el.classList.toggle('active', i === index);
            });
            document.getElementById('empty').style.display = 'none';
            document.getElementById('detail').style.display = 'block';
            document.getElementById('detail-img').src = 'file:///' + item.path.replace(/\\\\/g, '/');
            document.getElementById('detail-name').textContent = item.name;
            document.getElementById('detail-path').textContent = item.path;
            document.getElementById('detail-desc').textContent = item.description;
        }

        // Auto-select first item on load
        if (items.length > 0) {
            showItem(0);
        }
    </script>
</body>
</html>
"""


def generate() -> None:
    store = VectorStore()
    items = store.list_all(limit=1000)
    store.close()

    if not items:
        print("知识库为空，无法生成查看器。")
        return

    # Build item data
    item_data = []
    image_list_html = ""
    for idx, item in enumerate(items):
        payload = item["payload"]
        name = payload.get("image_name", "未知")
        path = payload.get("image_path", "")
        desc = payload.get("description", "无描述")
        preview = desc.replace("\n", " ")[:80] + "..." if len(desc) > 80 else desc

        item_data.append({
            "name": name,
            "path": path,
            "description": desc,
        })

        image_list_html += f"""
        <div class="image-item" onclick="showItem({idx})">
            <img src="file:///{path.replace(chr(92), '/')}" alt="{name}">
            <div class="info">
                <div class="name">{name}</div>
                <div class="preview">{preview}</div>
            </div>
        </div>
        """

    import json
    html = HTML_TEMPLATE.replace("{{count}}", str(len(items)))
    html = html.replace("{{image_list}}", image_list_html)
    html = html.replace("{{items_json}}", json.dumps(item_data, ensure_ascii=False, indent=2))

    settings.artifacts_dir_path.mkdir(parents=True, exist_ok=True)
    output_path = settings.viewer_output_path
    output_path.write_text(html, encoding="utf-8")
    print(f"查看器已生成: {output_path}")
    print(f"共 {len(items)} 张图片，直接在浏览器中打开即可查看。")


if __name__ == "__main__":
    generate()
