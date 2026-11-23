"""Make src/chars/makemeahanzi-subset.jsonl from Make Me a Hanzi's dictionary.txt.

Usage: python3 tools/extract_makemeahanzi.py path/to/dictionary.txt

dictionary.txt comes from https://github.com/skishore/makemeahanzi (commit 618dbab8a8dd,
LGPL-3.0-or-later). The subset keeps the characters used by the HSK words plus the parts
they are built from, with only the fields this site shows.
"""
import hashlib
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SHA256 = "744bb05d5b0742e9ee35c37791f94d56a173349b3367569e7ca11e510364d203"
KEEP = ("character", "pinyin", "definition", "decomposition", "radical", "etymology")

src = pathlib.Path(sys.argv[1])
if hashlib.sha256(src.read_bytes()).hexdigest() != SHA256:
    raise SystemExit("dictionary.txt does not match the pinned SHA-256")
entries = {}
for line in src.read_text(encoding="utf-8").splitlines():
    d = json.loads(line)
    entries[d["character"]] = d

needed = []
for path in sorted((ROOT / "src").glob("hsk*.txt")):
    for line in path.read_text(encoding="utf-8").splitlines():
        for ch in line.split("|")[0]:
            if ch != "…" and ch not in needed:
                needed.append(ch)
parts = []
for ch in needed:
    ety = entries[ch].get("etymology") or {}
    for key in ("semantic", "phonetic"):
        p = ety.get(key)
        if p and p in entries and p not in needed and p not in parts:
            parts.append(p)

out = ROOT / "src" / "chars" / "makemeahanzi-subset.jsonl"
with out.open("w", encoding="utf-8") as f:
    for ch in needed + parts:
        d = entries[ch]
        f.write(json.dumps({k: d.get(k) for k in KEEP}, ensure_ascii=False) + "\n")
print(f"wrote {len(needed)} characters and {len(parts)} parts to {out.relative_to(ROOT)}")
