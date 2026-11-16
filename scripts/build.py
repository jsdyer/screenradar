"""Prepare the static site for GitHub Pages."""
import json
from pathlib import Path
import re
import shutil

root = Path(__file__).resolve().parents[1]
films = json.loads((root / "web" / "films.json").read_text(encoding="utf-8"))
assert films and len({entry["id"] for entry in films}) == len(films)
assert all(re.fullmatch(r"Q[1-9][0-9]*", entry["id"]) for entry in films)
destination = root / "dist"
if destination.exists():
    shutil.rmtree(destination)
shutil.copytree(root / "web", destination)
print(f"Built Screen Radar with {len(films)} Canadian film records.")
