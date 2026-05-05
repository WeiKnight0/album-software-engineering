"""Generate rich image descriptions via multimodal LLM or OCR fallback."""

import base64
import mimetypes
from pathlib import Path
from typing import Optional

from PIL import Image

from rag.config import settings

# Try to import OpenAI for LLM description
try:
    from openai import OpenAI
    HAS_OPENAI = True
except Exception:
    HAS_OPENAI = False

# Try to import EasyOCR for fallback
try:
    import easyocr
    HAS_EASYOCR = True
except Exception:
    HAS_EASYOCR = False


PROMPT_TEMPLATE = """请对这张图片进行详细描述。要求包含以下两部分：

1. 情景描述：详细描述图片中的场景、人物、物品、环境、氛围、颜色、构图等视觉元素。
2. 文字内容：如果图片中包含任何文字（如标语、招牌、标签、屏幕文字、手写文字等），请尽可能准确地转录出来；如果没有文字，请说明"图片中无可见文字"。

请用中文回答，尽量详细、准确。"""


class OCRDescriptor:
    """Local OCR-based image descriptor (fallback when LLM is unavailable)."""

    def __init__(self) -> None:
        self._reader = None
        self._use_gpu = self._resolve_gpu()

    def _resolve_gpu(self) -> bool:
        configured = settings.embedding_device.strip().lower()
        if configured == "cpu":
            return False
        if configured not in {"", "auto"}:
            return configured == "cuda"

        try:
            import torch

            return torch.cuda.is_available()
        except Exception:
            return False

    @property
    def reader(self):
        if self._reader is None:
            self._reader = easyocr.Reader(["ch_sim", "en"], gpu=self._use_gpu)
        return self._reader

    def describe(self, image_path: Path) -> Optional[str]:
        """Generate a description based on OCR text and image metadata."""
        try:
            results = self.reader.readtext(str(image_path), detail=0)
            text = "\n".join(str(item).strip() for item in results if str(item).strip())
        except Exception as e:
            print(f"[OCR失败] {image_path.name}: {e}")
            text = ""

        # Extract image metadata
        try:
            with Image.open(image_path) as img:
                width, height = img.size
                format_ = img.format or "未知"
                mode = img.mode
        except Exception:
            width, height, format_, mode = 0, 0, "未知", "未知"

        # Parse filename for timestamp hint
        name = image_path.stem
        time_hint = ""
        if name.startswith("IMG_") and len(name) >= 15:
            # IMG_YYYYMMDD_HHMMSS
            date_part = name[4:12]
            time_part = name[13:19]
            if date_part.isdigit() and time_part.isdigit():
                time_hint = f"拍摄时间：{date_part[:4]}年{date_part[4:6]}月{date_part[6:8]}日 {time_part[:2]}:{time_part[2:4]}:{time_part[4:6]}"

        lines = ["【本地OCR描述】"]
        lines.append(f"这是一张{width}x{height}像素的{format_}格式图片。{time_hint}")

        if text:
            lines.append("图片中识别到的文字内容如下：")
            lines.append(text)
            lines.append("从文字内容判断，这可能是一张投影屏幕、演示文稿、公告牌或文档照片。")
        else:
            lines.append("图片中未识别到明显文字。")
            lines.append("从画面内容判断，这可能是一张生活照、风景照或室内场景照片。")

        return "\n".join(lines)


class ImageDescriptor:
    """Describes images using a multimodal LLM, with OCR fallback."""

    def __init__(self) -> None:
        self.client: Optional[OpenAI] = None
        self.model = settings.openai_model
        self.max_tokens = settings.openai_max_tokens
        self.ocr = OCRDescriptor() if HAS_EASYOCR else None

        if HAS_OPENAI and settings.openai_api_key:
            self.client = OpenAI(
                api_key=settings.openai_api_key,
                base_url=settings.openai_base_url,
            )

    def _encode_image(self, image_path: Path) -> tuple[str, str]:
        """Return (base64_data, mime_type)."""
        mime_type, _ = mimetypes.guess_type(str(image_path))
        if mime_type is None:
            mime_type = "image/jpeg"
        with open(image_path, "rb") as f:
            data = base64.b64encode(f.read()).decode("utf-8")
        return data, mime_type

    def _llm_describe(self, image_path: Path) -> Optional[str]:
        """Generate a rich description via multimodal LLM."""
        if not self.client:
            return None
        path = Path(image_path)
        try:
            data, mime_type = self._encode_image(path)
            url = f"data:{mime_type};base64,{data}"

            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": PROMPT_TEMPLATE},
                            {"type": "image_url", "image_url": {"url": url}},
                        ],
                    }
                ],
                max_tokens=self.max_tokens,
                temperature=0.2,
            )

            content = response.choices[0].message.content
            return content.strip() if content else None
        except Exception as e:
            print(f"[LLM描述失败] {path.name}: {e}")
            return None

    def describe(self, image_path: Path) -> Optional[str]:
        """Generate a rich description for the given image.

        Tries LLM first, falls back to OCR if LLM fails or is not configured.
        """
        path = Path(image_path)
        # Try LLM first
        llm_result = self._llm_describe(path)
        if llm_result:
            return llm_result

        # Fallback to OCR
        if self.ocr:
            print(f"[OCR降级] {path.name}: 使用本地OCR提取文字...")
            ocr_result = self.ocr.describe(path)
            if ocr_result:
                return ocr_result

        return None
