"""Build the flashcard site from the files in src/.

src/hsk*.txt         hanzi|pinyin|thai|sentence|sentence pinyin|sentence thai
src/extra/hsk*.txt   hanzi|pinyin|english|sentence english|literal thai|literal english
src/extra/stories.txt  hanzi|pinyin|word history thai|word history english (only words with a story)
src/chars/c*.txt     character|thai meaning|thai origin note (for pictographs and combined meanings)
src/chars/meaning-parts.txt          meaning part|dictionary hint|thai
src/chars/makemeahanzi-subset.jsonl  structure data from Make Me a Hanzi (LGPL-3.0-or-later)

Outputs:
  docs/index.html, docs/words.json, docs/chars.json   website for GitHub Pages
  hsk-flashcards-offline.html                         single file with all data built in
  dist/index.html, dist/words.json, dist/chars.json   page body for the Claude artifact
"""
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent
SRC = ROOT / "src"
DESCRIPTION = "บัตรคำศัพท์ภาษาจีน HSK 1–3 ไทย–จีน และ English–Chinese พร้อมพินอิน ประโยคตัวอย่าง และที่มาของตัวอักษร"
TYPE = {"pictophonetic": "P", "ideographic": "I", "pictographic": "G"}


def rows(path: pathlib.Path, fields: int):
    for n, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        if not line.strip():
            continue
        parts = [p.strip() for p in line.split("|")]
        if len(parts) != fields:
            raise SystemExit(f"{path.relative_to(ROOT)}:{n} has {len(parts)} fields, expected {fields}")
        yield parts


# ---------- words ----------
extra = {}
for path in sorted((SRC / "extra").glob("hsk*.txt")):
    for h, p, en, sen, lit_th, lit_en in rows(path, 6):
        extra[(h, p)] = [en, sen, lit_th, lit_en]

stories = {(h, p): [th, en] for h, p, th, en in rows(SRC / "extra" / "stories.txt", 4)}

words = []
for path in sorted(SRC.glob("hsk*.txt")):
    level = int(path.stem[3])
    for h, p, t, s, sp, st in rows(path, 6):
        if (h, p) not in extra:
            raise SystemExit(f"no English row for {h} {p}")
        words.append([level, h, p, t, s, sp, st, *extra[(h, p)], *stories.pop((h, p), ["", ""])])
if stories:
    raise SystemExit(f"stories for words not in the list: {sorted(stories)}")

# ---------- characters ----------
mmah = {}
for line in (SRC / "chars" / "makemeahanzi-subset.jsonl").read_text(encoding="utf-8").splitlines():
    d = json.loads(line)
    mmah[d["character"]] = d

thai = {}
for path in sorted((SRC / "chars").glob("c*.txt")):
    for ch, th, note in rows(path, 3):
        thai[ch] = (th, note)
part_thai = {(c, hint): th for c, hint, th in rows(SRC / "chars" / "meaning-parts.txt", 3)}


def short_def(text: str, limit: int = 60) -> str:
    """Keep whole dictionary senses (split at ';') up to about `limit` characters."""
    kept = []
    for sense in (s.strip() for s in (text or "").split(";")):
        if sense and (not kept or len("; ".join(kept + [sense])) <= limit):
            kept.append(sense)
    return "; ".join(kept)


chars = {}
for _, h, *_rest in words:
    for ch in h:
        if ch == "…" or ch in chars:
            continue
        if ch not in mmah or ch not in thai:
            raise SystemExit(f"character {ch} is missing from the dictionary subset or the Thai list")
        d, (th, note) = mmah[ch], thai[ch]
        ety = d.get("etymology") or {}
        kind = TYPE.get(ety.get("type"), "N")
        entry = {"py": " / ".join(d.get("pinyin") or []), "en": short_def(d.get("definition")), "th": th, "k": kind}
        if kind == "P":
            sem, pho, hint = ety.get("semantic"), ety.get("phonetic"), ety.get("hint", "")
            if sem:
                if (sem, hint) not in part_thai:
                    raise SystemExit(f"no Thai for meaning part {sem} ({hint}) of {ch}")
                entry.update(sem=sem, semEn=hint, semTh=part_thai[(sem, hint)])
            if pho:
                entry["pho"] = pho
                if pho in mmah and mmah[pho].get("pinyin"):
                    entry["phoPy"] = mmah[pho]["pinyin"][0]
        elif kind in ("I", "G"):
            if not note:
                raise SystemExit(f"no Thai origin note for {ch}")
            entry.update(noteEn=ety.get("hint", ""), noteTh=note)
        else:
            dec = d.get("decomposition") or ""
            entry["parts"] = [c for c in dec if not ("⿰" <= c <= "⿿") and c not in "？?"]
        chars[ch] = entry

# ---------- pages ----------
words_json = "[\n" + ",\n".join(json.dumps(r, ensure_ascii=False) for r in words) + "\n]\n"
chars_json = "{\n" + ",\n".join(f"{json.dumps(k, ensure_ascii=False)}:{json.dumps(v, ensure_ascii=False)}" for k, v in chars.items()) + "\n}\n"

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


online = page.replace("<!--HSK_DATA-->", "")
write(ROOT / "docs" / "index.html", document(online))
write(ROOT / "docs" / "words.json", words_json)
write(ROOT / "docs" / "chars.json", chars_json)
write(ROOT / "docs" / ".nojekyll", "")

inline = ("<script>window.HSK_DATA=" + json.dumps(words, ensure_ascii=False)
          + ";window.HSK_CHARS=" + json.dumps(chars, ensure_ascii=False) + ";</script>")
write(ROOT / "hsk-flashcards-offline.html", document(page.replace("<!--HSK_DATA-->", inline)))

write(ROOT / "dist" / "index.html", online)
write(ROOT / "dist" / "words.json", words_json)
write(ROOT / "dist" / "chars.json", chars_json)

counts = {lv: sum(1 for r in words if r[0] == lv) for lv in (1, 2, 3)}
kinds = {k: sum(1 for c in chars.values() if c["k"] == k) for k in "PIGN"}
print("words:", len(words), counts, "| characters:", len(chars), kinds)
