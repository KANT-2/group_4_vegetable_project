from io import BytesIO
import pytest
from PIL import Image
from app.domain.catalog.reviews import validate_review, MAX_IMAGE_BYTES
from app.presentation.catalog.reviews import clean_image


def photo():
    output = BytesIO()
    Image.new("RGB", (40, 30), "orange").save(output, "PNG")
    return output.getvalue()


@pytest.mark.parametrize("count", [0, 1, 3])
def test_text_required_with_optional_photos(count):
    assert validate_review("  신선해요  ", 5, count) == "신선해요"


@pytest.mark.parametrize("content,rating,count", [(" ", 5, 0), ("a" * 1001, 5, 0), ("ok", 0, 0), ("ok", True, 0), ("ok", 5, 4), ("nul\x00", 5, 0)])
def test_bad_reviews_rejected(content, rating, count):
    with pytest.raises(ValueError):
        validate_review(content, rating, count)


def test_image_reencoded_as_jpeg():
    cleaned = clean_image(photo(), "image/png")
    with Image.open(BytesIO(cleaned)) as image:
        assert image.format == "JPEG"
        assert image.size == (40, 30)
        assert not image.getexif()


@pytest.mark.parametrize("raw,mime", [(b"<script>alert(1)</script>", "image/png"), (b"x", "image/svg+xml"), (b"x" * (MAX_IMAGE_BYTES + 1), "image/jpeg")], ids=["fake-image", "svg", "too-large"])
def test_fake_svg_and_oversize_images_rejected(raw, mime):
    with pytest.raises(ValueError):
        clean_image(raw, mime)
