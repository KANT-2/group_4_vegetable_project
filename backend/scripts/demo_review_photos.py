"""AI-generated photographs for synthetic demo reviews only."""
from io import BytesIO
from pathlib import Path
from PIL import Image, ImageOps

ASSETS = Path(__file__).resolve().parents[1] / 'assets' / 'demo-review-photos'


def render(vegetable: str, seed: str, *, reason: str = 'irregular', size: tuple[int, int] | None = None) -> bytes:
    """Load a generated photograph, keeping the existing seeder interface."""
    if vegetable not in {p.stem for p in ASSETS.glob('*.jpg')}:
        raise ValueError(f'Missing generated demo review photograph: {vegetable}')
    with Image.open(ASSETS / f'{vegetable}.jpg') as source:
        image = source.convert('RGB')
        if size:
            image = ImageOps.fit(image, size, method=Image.Resampling.LANCZOS)
        out = BytesIO()
        image.save(out, 'JPEG', quality=90)
        return out.getvalue()
