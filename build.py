"""Build the flashcard site from src/hsk*.txt.

Each source line: hanzi|pinyin|thai|sentence|sentence pinyin|sentence thai

Outputs:
  docs/index.html + docs/words.json   website for GitHub Pages
  hsk-flashcards-offline.html          single file with the words built in
  dist/index.html + dist/words.json    page body for the Claude artifact
"""
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent
SRC = ROOT / "src"
DESCRIPTION = "บัตรคำศัพท์ภาษาจีน HSK 1–3 พร้อมพินอิน คำแปลไทย และประโยคตัวอย่าง"

records = []
for path in sorted(SRC.glob("hsk*.txt")):
    level = int(path.stem[3])
    for n, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        if not line.strip():
            continue
        parts = line.split("|")
        if len(parts) != 6:
            raise SystemExit(f"{path.name}:{n} has {len(parts)} fields")
        records.append([level, *[p.strip() for p in parts]])

words_json = "[\n" + ",\n".join(json.dumps(r, ensure_ascii=False) for r in records) + "\n]\n"

page = (ROOT / "index.html").read_text(encoding="utf-8")
app = (ROOT / "app.js").read_text(encoding="utf-8")
page = page.replace('<script src="app.js"></script>', "<script>\n" + app + "</script>")


def document(body_html: str) -> str:
    """Wrap the page in a full HTML document: title, fonts and styles go in <head>."""
    split = body_html.index("</style>") + len("</style>")
    head, body = body_html[:split], body_html[split:]
    return (
        "<!doctype html>\n<html lang=\"th\">\n<head>\n<meta charset=\"utf-8\">\n"
        "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1, viewport-fit=cover\">\n"
        f"<meta name=\"description\" content=\"{DESCRIPTION}\">\n"
        + head.strip() + "\n</head>\n<body>\n" + body.strip() + "\n</body>\n</html>\n"
    )


def write(path: pathlib.Path, text: str) -> None:
    path.parent.mkdir(exist_ok=True)
    path.write_text(text, encoding="utf-8")


# Website for GitHub Pages (loads words.json next to it)
write(ROOT / "docs" / "index.html", document(page.replace("<!--HSK_DATA-->", "")))
write(ROOT / "docs" / "words.json", words_json)
write(ROOT / "docs" / ".nojekyll", "")

# Offline single file (words built in, works when opened straight from disk)
inline = "<script>window.HSK_DATA=" + json.dumps(records, ensure_ascii=False) + ";</script>"
write(ROOT / "hsk-flashcards-offline.html", document(page.replace("<!--HSK_DATA-->", inline)))

# Claude artifact body (the artifact host adds the document skeleton)
write(ROOT / "dist" / "index.html", page.replace("<!--HSK_DATA-->", ""))
write(ROOT / "dist" / "words.json", words_json)

counts = {lv: sum(1 for r in records if r[0] == lv) for lv in (1, 2, 3)}
print("words:", len(records), counts)
