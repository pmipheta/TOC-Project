# PDPA Assignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ทำให้เว็บ Data Masking ปัจจุบันตรงกับ ToC Assignment โดยแก้เฉพาะส่วนที่ขาดและรักษาพฤติกรรมที่ทำงานแล้ว

**Architecture:** คง Flask และ `mask_data(t)` ใน `app.py`; แก้ Regex ในจุดเดิม ไม่แยก service หรือเพิ่ม dependency ใช้ `unittest` และ Flask test client ตรวจแต่ละงาน โดยเพิ่มลิงก์ source ใน template เดิม

**Tech Stack:** Python, standard-library `re`/`unittest`, Flask, Jinja, CSS, Gunicorn

**Spec:** `ToC Assignment 1_2569.pdf` หน้า 1–2 (อ่านจากภาพทั้งสองหน้า เพราะ text extraction ภาษาไทยเสีย)

## Global Constraints

- Regex: “ใช้ re ของ Python เท่านั้น”
- Input: “Text ที่ผู้ใช้งานป้อนเข้าเองทางคีย์บอร์ด”; Output: “Text ที่ได้รับการเซ็นเซอร์แล้ว”
- ปิดบัตรเครดิตเหลือ 4 ตัวท้าย; อีเมลเหลือตัวแรก/สุดท้ายของชื่อและโดเมน; โทรศัพท์เหลือ 4 ตัวท้าย
- DOB ต้องเก็บ `DOB:` และสองหลักแรกของปี พ.ศ.; Address ต้องปิดเฉพาะเลขที่บ้าน
- หน้าเว็บต้องมีลิงก์ Source code บน GitHub
- คลิป YouTube ไม่เกิน 10 นาที เน้น Regular Expression; กลุ่ม 10–12 คนและแจกแจงหน้าที่ตอนนำเสนอ
- ส่งวันพุธที่ 14 ตุลาคม 2569 ก่อน 09:00 น. ตามเวลาประเทศไทย
- ไม่เพิ่ม upload, database, login, API ใหม่, validation ปฏิทิน/บัตรเครดิต, UI redesign หรือ dependency ใหม่
- ไม่เปลี่ยน routes, form field, template variables หรือ signature ของฟังก์ชันเดิม
- ใช้ข้อมูลสมมติในการตรวจและนำเสนอ ไม่บันทึกข้อความส่วนบุคคลเพิ่ม

## สถานะที่ตรวจจริง ณ 2026-10-10

- อ่านไฟล์ทั้งหมดที่ tracked: `app.py`, `templates/index.html`, `static/style.css`, `requirements.txt`, `Procfile`
- ไม่พบ README, PROJECT_STATUS หรือ AGENTS.md ในรายการไฟล์ repository; ห้ามถือว่ามีข้อมูลสถานะจากเอกสารเหล่านี้
- PDF เป็น untracked; มี `__pycache__/` จากการตรวจรอบก่อน อย่ารวมทั้งสองรายการใน commit โดยอัตโนมัติ
- `GET /` และ `POST /mask` ผ่าน Flask test client ด้วย HTTP 200
- ตัวอย่างบัตรเครดิตและอีเมลตรง PDF; ที่อยู่เลขที่บ้านเดี่ยวผ่าน; โทรศัพท์ได้ `XXXX-XXX-7894` และ DOB ได้ `XX/XX/25XX` ซึ่งผิด PDF
- `Address:` จับคำแรกใด ๆ และ `\s*` ข้ามบรรทัดได้ จึงทำข้อมูลที่ไม่ใช่เลขที่บ้านหาย
- รองรับบัตรและโทรศัพท์แบบไม่มีขีดอยู่แล้ว ต้องรักษาไว้; ไม่จำเป็นต้องเพิ่มรูปแบบอื่น
- ไม่มี tests ปัจจุบัน; หน้าเว็บไม่มีลิงก์ GitHub; remote คือ `https://github.com/pmipheta/TOC-Project.git`
- มี deployment entry point `web: gunicorn app:app` แต่ยังไม่มีหลักฐาน URL เว็บที่ใช้งานจริงหรือคลิปนำเสนอ

## File Map และ interfaces ร่วม

| ไฟล์ | งาน |
|---|---|
| `app.py` | แก้ replacement โทรศัพท์/DOB และขอบเขต Regex ที่อยู่ |
| `templates/index.html` | เพิ่มลิงก์ GitHub |
| `tests/test_mask_data.py` (สร้าง) | unit tests แบบ `unittest.TestCase` สำหรับ masking |
| `tests/test_web.py` (สร้าง) | Flask test client และตรวจ HTML ด้วย standard-library `html.parser` |

คง `mask_data(t: str) -> str` (คำอธิบายสัญญา ไม่บังคับเพิ่ม type annotation), `app` เป็น Flask instance, `GET /`, `POST /mask` รับ form field `data`, และ template variables `original`/`mask_text` ไม่มี callers อื่นจากการค้น `rg`

## Review Focus

1. โทรศัพท์/บัตรแบบไม่มีขีดต้องยังทำงาน — tests งาน 1
2. หลายข้อมูลและหลายบรรทัดในข้อความเดียวต้องถูกแปลงทุกจุด — tests งาน 4
3. DOB มีช่องว่างหลัง colon ต้องเก็บช่องว่างและ prefix — tests งาน 2
4. Address ไม่มีเลขที่บ้านต้องไม่กินคำหรือบรรทัดถัดไป — tests งาน 3
5. ข้อความมี HTML ต้องถูก escape เมื่อแสดง original/result — tests งาน 4

---

### Task 1: แก้โทรศัพท์และล็อกพฤติกรรมบัตรเครดิต/อีเมลที่ผ่านแล้ว

**เป้าหมาย:** โทรศัพท์ตรง PDF โดยไม่กระทบ rules ที่ผ่านแล้ว
**Dependencies:** ไม่มี; ใช้ dependencies ปัจจุบัน หาก environment ยังไม่มีให้รัน `python -m pip install -r requirements.txt`
**Files:** Modify `app.py:10-11`; Create/Test `tests/test_mask_data.py`
**Interfaces:** Consumes/Produces `mask_data(t: str) -> str`; งาน 2–4 เพิ่ม tests หรือเรียกสัญญานี้ต่อ

- [ ] เพิ่ม `MaskDataTests.test_phone` และ `test_existing_card_email` ด้วย assertions ต่อไปนี้ (ใช้ `subTest` สำหรับแต่ละคู่):

```python
assert mask_data('093-245-7894') == 'XXX-XXX-7894'
assert mask_data('0932457894') == 'XXX-XXX-7894'
assert mask_data('1234-5678-9012-3456') == 'XXXX-XXXX-XXXX-3456'
assert mask_data('1234567890123456') == 'XXXX-XXXX-XXXX-3456'
assert mask_data('somchai.d@company.com') == 's*******d@company.com'
```

- [ ] รัน `python -B -m unittest discover -s tests -p test_mask_data.py -v`; ยืนยัน phone FAIL ส่วน card/email PASS
- [ ] เปลี่ยน replacement ของโทรศัพท์สองจุดเป็น `XXX-XXX-\1`; ไม่แก้ rules บัตรหรืออีเมล
- [ ] รันคำสั่งเดิม ต้องทุก test PASS; commit เฉพาะสองไฟล์ด้วย message `fix: match assignment phone masking format`

**Done:** คู่ตัวอย่างทั้งหมดตรงผลลัพธ์ข้างต้น
**ความเสี่ยง:** ผู้ใช้ที่เคยได้รับ prefix 4 X จะได้รับ 3 X ตามโจทย์; ไม่มีการเขียนหรือย้ายข้อมูล

### Task 2: เก็บ prefix และช่องว่างของ DOB

**เป้าหมาย:** ปิดวัน/เดือนและสองหลักท้ายของปีโดยรักษา `DOB:`
**Dependencies:** งาน 1 สำหรับไฟล์และ test class; logic ไม่ขึ้นกับโทรศัพท์
**Files:** Modify `app.py:26`, `tests/test_mask_data.py`
**Interfaces:** ใช้และคง `mask_data(t: str) -> str`; งาน 4 ใช้ผลลัพธ์ DOB นี้

- [ ] เพิ่ม `MaskDataTests.test_dob`:

```python
assert mask_data('DOB:25/12/2549') == 'DOB:XX/XX/25XX'
assert mask_data('DOB: 25/12/2549') == 'DOB: XX/XX/25XX'
assert mask_data('25/12/2549') == '25/12/2549'
assert mask_data('DOB:25/12/25490') == 'DOB:25/12/25490'
```

- [ ] รัน `python -B -m unittest discover -s tests -p test_mask_data.py -v`; ยืนยัน DOB tests มี FAIL ก่อนแก้
- [ ] ปรับ Regex ให้ capture `DOB:` และช่องว่างแนวนอนหลัง colon แล้วใส่กลับใน replacement; ห้ามจับวันเกิดที่เป็นส่วนต้นของเลขยาวกว่ารูปแบบปี 4 หลัก ห้ามข้ามบรรทัด ไม่เพิ่มการตรวจวันจริงในปฏิทิน
- [ ] รันคำสั่งเดิม ต้องทุก test PASS; commit สองไฟล์ด้วย message `fix: preserve DOB prefix when masking`

**Done:** DOB ตัวอย่างและช่องว่างผ่าน โดยวันที่ไม่มี prefix ไม่เปลี่ยน
**ความเสี่ยง:** ข้อความที่มีช่องว่างหลัง DOB จะเริ่มถูกปิด; prefix ที่เคยหายจะกลับมา ไม่มีการแปลง พ.ศ./ค.ศ.

### Task 3: จำกัด Address ให้ปิดเฉพาะเลขที่บ้าน

**เป้าหมาย:** ป้องกันการลบชื่อถนนหรือข้อมูลบรรทัดถัดไป
**Dependencies:** งาน 1–2 สำหรับ regression suite
**Files:** Modify `app.py:28`, `tests/test_mask_data.py`
**Interfaces:** คง `mask_data(t: str) -> str`; ผลลัพธ์ต้องรักษาส่วนที่เหลือของ address และ newline

- [ ] เพิ่ม `MaskDataTests.test_address`:

```python
assert mask_data('Address: 689 ซอยลาดกระบัง 19 ถนนลาดกระบัง แขวงลาดกระบัง เขตลาดกระบัง กรุงเทพฯ') == 'Address: XXX ซอยลาดกระบัง 19 ถนนลาดกระบัง แขวงลาดกระบัง เขตลาดกระบัง กรุงเทพฯ'
assert mask_data('Address: 689/12 ถนนลาดกระบัง') == 'Address: XXX ถนนลาดกระบัง'
assert mask_data('Address: ถนนลาดกระบัง') == 'Address: ถนนลาดกระบัง'
assert mask_data('Address:\nDOB:25/12/2549') == 'Address:\nDOB:XX/XX/25XX'
```

- [ ] รัน `python -B -m unittest discover -s tests -p test_mask_data.py -v`; ยืนยันเคสไม่มีเลขที่บ้าน/ข้ามบรรทัด FAIL
- [ ] ใช้ช่องว่างแนวนอนหลัง `Address:` และจับ token เลขที่บ้านที่เป็นตัวเลขหรือเลขคั่น `/` ทั้ง token; ไม่จับส่วนต้นของคำอื่น ไม่ปิดเลขซอย และไม่เพิ่ม address parser
- [ ] รันคำสั่งเดิม ต้องทุก test PASS; commit สองไฟล์ด้วย message `fix: mask only the address house number`

**Done:** ตัวอย่างเต็มจาก PDF ผ่าน เลขที่บ้านแบบ `/` ถูกปิดครบ และข้อมูลที่ไม่ใช่บ้านไม่หาย
**ความเสี่ยง:** ที่อยู่ malformed จะคงข้อความแทนการปิดคำแรก; รูปแบบเลขที่บ้านนอก numeric/slash ยังไม่ได้กำหนดในโจทย์ ไม่อ้างว่าเป็นระบบป้องกันข้อมูลส่วนบุคคลทุกชนิด

### Task 4: เพิ่มลิงก์ Source และตรวจ web flow ที่รวมทุกประเภท

**เป้าหมาย:** หน้าเว็บตรงข้อส่งงานและแสดง masking ที่แก้แล้วครบ
**Dependencies:** งาน 1–3 สำหรับ combined output; ลิงก์ทำได้อิสระ
**Files:** Modify `templates/index.html`; Create/Test `tests/test_web.py`
**Interfaces:** Consumes `app`, `mask_data(t: str) -> str`, `POST /mask` field `data`; Produces ลิงก์ HTML ไป `https://github.com/pmipheta/TOC-Project` บน GET และผล POST คง `#data`/`#mask_text`

- [ ] เพิ่ม `WebTests.test_source_link` ตรวจ GET และ POST มี anchor href เป็น URL ข้างต้นและข้อความลิงก์ที่อ่านได้ ด้วย `HTMLParser`; รัน `python -B -m unittest discover -s tests -p test_web.py -v` ต้อง FAIL เพราะยังไม่มีลิงก์
- [ ] เพิ่ม anchor ใน template เดิม ใช้ชื่อ `Source code on GitHub`; ไม่เพิ่ม CSS หรือปรับ layout ที่ไม่จำเป็น
- [ ] เพิ่ม `WebTests.test_combined_output` ใช้ input ทั้งห้าตัวอย่างจาก tests งานก่อนคั่นด้วย newline; POST ต้อง 200, textarea `data` เท่ากับ input และ textarea `mask_text` เท่ากับ expected ทั้งห้าบรรทัด โดยตรวจค่าที่ parser อ่าน ไม่เปรียบ HTML ทั้งหน้า
- [ ] เพิ่ม `WebTests.test_html_escaping`: POST `<script>alert(1)</script> DOB:25/12/2549`; assert response ไม่มี literal `<script>` และ textarea ผลลัพธ์ที่ decode แล้วเท่ากับ `<script>alert(1)</script> DOB:XX/XX/25XX` คง autoescape ของ Jinja
- [ ] รัน `python -B -m unittest discover -s tests -v`; ต้องทุก test PASS แล้ว commit เฉพาะ template/test ด้วย message `feat: link assignment source from web page`

**Done:** ลิงก์มีบนทั้งสองหน้า และ combined masking/escaping ผ่าน
**ความเสี่ยง:** ห้ามใช้ `|safe` กับ input/output; ชื่อและลิงก์ repository เป็น public metadata อยู่แล้ว ไม่ส่งข้อความผู้ใช้ไป GitHub

## งานส่งมอบตาม requirement (ไม่ใช่การเพิ่มฟีเจอร์)

Dependencies: งาน 1–4 ผ่านก่อนบันทึก demonstration สุดท้าย ไม่มีไฟล์โค้ดใหม่หรือ interface ใหม่; ผลส่งมอบคือ URL เว็บ, URL source และ URL คลิป

- [ ] รัน `python -B -m unittest discover -s tests -v` และ `git diff --check`; ต้อง PASS/ไม่มี whitespace errors
- [ ] เปิดเว็บ local ด้วย `python -B -m flask --app app run`; ทดลองห้าตัวอย่างและคลิกลิงก์ GitHubตรวจด้วยตา
- [ ] ตรวจหรือจัดเตรียม public deployment ด้วย `Procfile` เดิม; เลือก hosting หลังทราบ environment จริง ไม่เพิ่ม config ล่วงหน้า และอย่าใช้ Flask debug server สำหรับเว็บสาธารณะ
- [ ] เมื่อมี URL จริงแล้ว รัน `curl.exe -I <WEB_URL>` ต้อง HTTP 200 และตรวจ form POST/ลิงก์ source บนเว็บจริงด้วยข้อมูลสมมติ หากต้องมีบัญชีหรือค่าใช้จ่ายให้บันทึกสิ่งที่ต้องใช้ ไม่อ้างว่า deploy แล้ว
- [ ] จัดคลิป YouTube ไม่เกิน 10 นาที อธิบาย Regex ทั้งห้าประเภท ตัวอย่าง/หลายกรณี และหน้าที่สมาชิก 10–12 คน; ตรวจระยะเวลาและการเปิดลิงก์โดยผู้รับ
- [ ] ส่งลิงก์เว็บและคลิปผ่านช่องทางใน PDF ก่อนเวลาที่กำหนด; การเผยแพร่หรือส่งจริงต้องเป็นขั้นตอนที่ผู้ใช้มอบหมาย ไม่รวมการส่งอัตโนมัติในการ implement โค้ด

ความเสี่ยงการส่งมอบ: ยังไม่ทราบ hosting, URL เว็บ, สมาชิกและคลิป; tests local ไม่ยืนยันการเข้าถึงเว็บ/GitHub/YouTube จากภายนอก ใช้ข้อมูลสมมติเท่านั้นในการเผยแพร่

## Requirement Cross-check / Self-review

| Requirement | หลักฐาน/งานที่ครอบคลุม |
|---|---|
| Web app, keyboard text input, masked text output | มีแล้ว; งาน 4 ตรวจ routes และ textarea |
| Python `re` เท่านั้น | มีแล้ว; งาน 1–3 แก้ใน implementation เดิม |
| บัตรเครดิต/อีเมล | ผ่านตัวอย่างแล้ว; งาน 1 regression และงาน 4 combined |
| โทรศัพท์ | งาน 1 |
| DOB | งาน 2 |
| Address เฉพาะเลขที่บ้าน | งาน 3 |
| Source link บนเว็บ | งาน 4 |
| URL เว็บ, คลิป <=10 นาที, กลุ่ม/หน้าที่, กำหนดส่ง | checklist ส่งมอบ; สถานะยังไม่ยืนยัน |
| ความครอบคลุม Regex, การออกแบบเว็บ, คุณภาพนำเสนอ | tests หลายกรณี, ใช้ UI เดิม, ตรวจเว็บและคลิป; ไม่รับประกันคะแนน |

ตรวจชื่อ interfaces/field/variables ตรงกันทุกงานแล้ว แต่ละงานมี test cycle และเกณฑ์จบแยกกัน ไม่เพิ่ม product scope จาก PDF ไม่มีขั้นตอน migrate/delete ข้อมูลหรือเปลี่ยน dependency
