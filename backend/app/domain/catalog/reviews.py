"""Review rules independent of HTTP and persistence."""
MAX_IMAGES = 3
MAX_IMAGE_BYTES = 5 * 1024 * 1024


def validate_review(content: str, rating: int, image_count: int) -> str:
    content = content.strip()
    if not content or len(content) > 1000 or "\x00" in content:
        raise ValueError("리뷰 내용은 1~1,000자로 입력해 주세요.")
    if type(rating) is not int or not 1 <= rating <= 5:
        raise ValueError("별점은 1~5점으로 선택해 주세요.")
    if not 0 <= image_count <= MAX_IMAGES:
        raise ValueError("리뷰 사진은 최대 3장까지 첨부할 수 있어요.")
    return content
