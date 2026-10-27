# Synthetic review photographs

21 AI-generated photorealistic produce photographs for demo reviews only. These
are fictional review assets, not photographs submitted by customers.

Generated with the built-in `image_gen` tool on 2026-10-27. The exact prompt set
and subjects are recorded in [generation.json](generation.json). JPEGs are
resized to a maximum 1200-pixel edge; `contact-sheet.jpg` provides a visual index.
The same produce photograph is reused for reviews and image slots of that type.

`scripts/demo_review_photos.py` loads these assets for the extra-demo seeder.
To replace existing extra-demo images without changing review metadata, run from
`backend`: `.venv/Scripts/python -m scripts.replace_demo_review_photos`.
The replacement checks the known demo review IDs, authors and products, updates
only image bytes, and verifies all bytes and unchanged review metadata in one
transaction.
