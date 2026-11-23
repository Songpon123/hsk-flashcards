# Data license / สัญญาอนุญาตของข้อมูล

## Character structure (`src/chars/makemeahanzi-subset.jsonl`, `docs/chars.json`)

The character origins come from **Make Me a Hanzi** `dictionary.txt`
(© Shaunak Kishore and contributors, <https://github.com/skishore/makemeahanzi>, commit `618dbab8a8dd`;
itself derived from Unihan and CJKlib). They are distributed under the
[GNU LGPL 3.0 or later](licenses/LGPL-3.0.txt), together with the [GPL 3.0 text](licenses/GPL-3.0.txt) it incorporates.

Changes made for this site:

- kept only the 621 characters in the HSK 1–3 words and the parts they are built from;
- kept the `character`, `pinyin`, `definition`, `decomposition`, `radical` and `etymology` fields;
- `docs/chars.json` shortens the English definitions and adds Thai meanings of each character,
  Thai meanings of the meaning parts, and Thai translations of the etymology hints
  (`src/chars/c*.txt`, `src/chars/meaning-parts.txt`).

Rebuild the subset with `python3 tools/extract_makemeahanzi.py path/to/dictionary.txt`
(the script checks the SHA-256 of the original file).

## Words, sentences and translations

The HSK 1–3 word list follows the original HSK 2.0 levels. The example sentences, pinyin,
Thai and English translations and literal meanings in `src/hsk*.txt` and `src/extra/` were written for this project.

## ภาษาไทยโดยสรุป

ข้อมูลที่มาของตัวอักษรนำมาจาก Make Me a Hanzi (สัญญาอนุญาต LGPL-3.0 หรือใหม่กว่า) โดยตัดเหลือเฉพาะตัวอักษรที่ใช้ในชุดนี้
และเพิ่มคำแปลภาษาไทย ไฟล์ข้อมูลที่มาของตัวอักษรจึงเผยแพร่ภายใต้สัญญาอนุญาตเดียวกัน ส่วนประโยคตัวอย่างและคำแปลเรียบเรียงขึ้นสำหรับโปรเจกต์นี้
