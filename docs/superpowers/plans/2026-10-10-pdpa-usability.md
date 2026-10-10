# แผนเพิ่มตัวอย่าง คำอธิบาย Regex การคัดลอก และโหมดผลลัพธ์

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. รอบนี้จัดทำแผนเท่านั้น ยังไม่อนุมัติให้ implement หรือเผยแพร่

**Goal:** ให้ผู้ใช้ทดลอง masking เข้าใจ Regex ทั้งห้าประเภท อ่านผลเป็นข้อความเต็มหรือรายการแยกประเภท และนำผลลัพธ์ไปใช้ต่อได้ง่ายขึ้น

**Architecture:** ใช้ Flask/Jinja และ form POST เดิม เพิ่ม JavaScript ธรรมดาไฟล์เดียวสำหรับตัวอย่าง clipboard และโหมดผลลัพธ์ ใช้ HTML `<details>` สำหรับคำอธิบาย ผลสองโหมดมาจาก masked text ชุดเดียวกัน ไม่ย้าย masking ไป browser; Task 7 เพิ่ม `POST /highlight` เพื่อใช้ Python Regex ชุดเดิมตรวจ input ขณะพิมพ์

**Tech Stack:** Python `re`, Flask, Jinja, HTML/CSS, browser Clipboard API, `unittest`, Node.js built-in test runner สำหรับทดสอบ JavaScript โดยไม่เพิ่ม npm dependency

**Spec:** ขอบเขตฟีเจอร์และสัญญาพฤติกรรมในแผนนี้; ยึด masking ตาม `ToC Assignment 1_2569.pdf` และแผน `docs/superpowers/plans/2026-10-10-pdpa-assignment.md`

## ขอบเขตและเหตุผลที่เลือก

ผู้ใช้ขอแผนภาษาไทยสำหรับไอเดียเพิ่มเติม แผนนี้เลือกสามไอเดียที่แนะนำล่าสุด: ปุ่มโหลดตัวอย่าง แผงอธิบาย Regex และปุ่มคัดลอกผลลัพธ์ เป็นสมมติฐานเพื่อให้มีแผนที่ตรวจได้ ผู้ใช้ปรับขอบเขตได้ก่อนเริ่มงาน

แนวทางที่เลือก: เพิ่มในหน้าเดิม เพราะใช้ input/result และ CSS ที่มีอยู่ได้ ทางเลือกแบบสร้างหน้า tutorial แยกจะเพิ่มการนำทาง และแบบ live masking จะเปลี่ยน flow เดิม จึงไม่เลือกทั้งสองอย่าง

เพิ่มเติมตามคำขอผู้ใช้พร้อมภาพอ้างอิง: โหมดเริ่มต้นแสดง masked text เต็มทุกบรรทัด และ toggle เป็นรายการแยก Credit Card, Email, Phone Number, Date of Birth, Address แบบภาพที่สอง ภาพใช้เป็นแนวทางของส่วนผลลัพธ์ ไม่ใช่คำขอให้สร้างระบบบันทึกข้อมูลหรือ redesign ทั้งเว็บ

ขอบเขตเดิมไม่รวม masking counts, upload, login, database หรือการเปลี่ยน masking Regex ผู้ใช้เพิ่ม highlight input/output, ตัวอย่าง long log และ Clear input ตาม Tasks 5–7 ด้านล่าง ฟีเจอร์เหล่านี้เป็นงานเสริมจาก PDF

## Global Constraints

- คง `mask_data(t: str) -> str`, `GET /`, `POST /mask`, form field `data`, variables `original`/`mask_text`, textarea IDs `data`/`mask_text`
- คง autoescape; ห้ามใช้ `|safe` หรือใส่ข้อความจากผู้ใช้ผ่าน `innerHTML`
- JavaScript ใช้ `.value` สำหรับ textarea และ `.textContent` สำหรับข้อความสถานะ
- ปุ่มใหม่เป็น `type="button"` ไม่ submit form และใช้งานผ่าน keyboard ได้
- ไม่อ่าน clipboard; เขียนเฉพาะผล masked ที่ผู้ใช้สั่งคัดลอก ไม่เก็บข้อมูลใน storage/analytics
- เมื่อไม่มี JavaScript การกรอก/ส่งข้อความเดิมและ `<details>` ยังใช้ได้ ปุ่ม JS ซ่อนด้วย `hidden` จนผูก handlers สำเร็จ
- ต้องรักษา input เดิมเมื่อยกเลิกโหลดตัวอย่าง; เมื่อ JS ทำงาน การยืนยันโหลดตัวอย่างหรือ `input` event จากการพิมพ์/วางข้อความต้องล้าง canonical result และซ่อนผลเก่า/controls ทันที เมื่อปิด JS ผลหมายถึงการ submit ครั้งล่าสุดและมีคำกำกับชัดเจน
- ผลเริ่มต้นเป็นข้อความเต็ม คงลำดับ ช่องว่าง newline และ prefix ทุกตัวตาม `mask_text`; แสดงครบโดยไม่ต้องเลื่อนภายในกล่องผลลัพธ์ แต่หน้าเว็บเลื่อนตามปกติได้
- toggle เปลี่ยนเฉพาะการแสดงผล ไม่มี POST ใหม่ ไม่แก้ input/canonical result; ปุ่ม copy คัดลอก canonical text รวม prefix/newline เหมือนกันทุกโหมด
- จัดหมวดจาก masked text เท่านั้น ไม่อ่าน original เพื่อสร้างรายการ และไม่อ้างว่าบันทึกข้อมูลสำเร็จตามคำว่า Saved Information ในภาพ
- คัดลอกด้วย `navigator.clipboard.writeText()` จาก click โดยตรง; handle promise rejection และกรณีไม่มี API
- เมื่อ copy ล้มเหลวต้องมีข้อความเต็มที่เลือกคัดลอกเองได้ งาน 3 ใช้ textarea ที่ยังมองเห็น; งาน 4 สลับกลับ pre โหมดข้อความเต็ม ไม่เปิดเผย textarea canonical ที่ซ่อนไว้
- Clipboard ต้องใช้ secure context และอาจถูกปฏิเสธได้: [MDN writeText](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText) ไม่ใช้ `execCommand` fallback

## สถานะตอนเขียน Tasks 1–4 (ประวัติ; สถานะปัจจุบันดูส่วน Tasks 5–7)

- หน้าเว็บมี form และ readonly result รวมลิงก์ GitHub แล้ว แต่ยังไม่มีฟีเจอร์เสริมทั้งสี่และยังไม่มี JavaScript
- `app.py` มี rules ครบทั้งห้าประเภท; บัตรและโทรศัพท์มีทั้งแบบขีด/ไม่มีขีด; DOB เก็บ prefix/space/tab; Address รองรับตัวเลขและ `/`
- ใช้ `tests/test_web.py:PageParser` ตรวจ anchors และ textarea ได้แล้ว; ยังไม่ตรวจ buttons/details
- รัน `python -B -m unittest discover -s tests -v` แล้วผ่าน 8 methods รวมชุด 100 cases
- `tests/test_regex_100.py` ยัง untracked เช่นเดียวกับเอกสาร/PDF; ห้าม stage ทุกไฟล์ด้วย `git add .`
- เว็บเคย deploy Render Free โดย auto-deploy จาก `main`; การ push จะมีผลต่อเว็บจริง รอบนี้ไม่ push
- ไม่พบ README หรือ PROJECT_STATUS จากการสำรวจเดิม; ไม่ใช้เอกสารที่ไม่มีอยู่สรุปสถานะ

## File Map และสัญญาที่งานใช้ร่วมกัน

| ไฟล์ | หน้าที่ |
|---|---|
| `templates/index.html` (แก้) | ปุ่ม/สถานะ/details และ script ผ่าน `url_for` |
| `static/app.js` (สร้าง) | click handlers โหลดตัวอย่าง คัดลอก และ toggle/จัดหมวดผล |
| `static/style.css` (แก้เท่าที่ต้องใช้) | focus/button/details ให้สอดคล้องหน้าเดิม; ไม่ redesign |
| `tests/test_web.py` (แก้) | HTML contracts และตัวอย่างที่ส่งผ่าน Flask |
| `tests/test_ui.js` (สร้าง) | ทดสอบ script จริงด้วย `node:test`, `node:assert/strict`, `node:vm` และ DOM stub เท่าที่ script ใช้ |

DOM contract: `#load-example-btn`, `#copy-result-btn`, `#action-status` (`role="status"`, `aria-live="polite"`), `#regex-guide` (`details`), และ IDs เดิม `#data`, `#mask_text`, `#result-section`

งาน 4 เพิ่ม `#result-view-toggle` (type button, aria-pressed), `pre#result-text`, `#result-categories` (hidden เริ่มต้น) คง `textarea#mask_text` readonly ไว้เป็น canonical source สำหรับ tests/copy และซ่อนจากการแสดงผล/keyboard เมื่อมี pre แทน ไม่ duplicate id

JS โหลดด้วย `defer`; ตัว handler ค้นองค์ประกอบด้วย IDs ไม่ต้อง export global function หรือ module ใหม่ Tasks 1–4 ไม่ทำ network request; Task 5 โหลดไฟล์ตัวอย่าง static และ Task 7 เรียก `POST /highlight` ตามสัญญาด้านล่าง

## Review Focus

1. ผู้ใช้มีข้อความอยู่แล้ว: Cancel ต้องไม่เปลี่ยน input/result — งาน 1
2. โหลดตัวอย่างหรือพิมพ์/วาง input หลัง masking: ผลเก่าต้องถูกล้างและซ่อน — งาน 1; งาน 4 ครอบคลุมสองโหมด
3. ไม่มี result/ปิด JS: ไม่มีปุ่ม copy ที่ใช้งานไม่ได้ และ form เดิมยังทำงาน — งาน 3
4. browser ปฏิเสธหรือไม่มี Clipboard API: แจ้งทางเลือก manual โดยไม่อ้างว่าคัดลอกสำเร็จ — งาน 3
5. HTML/newline ใน result: คัดลอกค่าจริงครบ ไม่สร้าง DOM จาก input — งาน 3 และ regression เดิม
6. ข้อความหลายรายการ/ไม่ตรงประเภท: ต้องไม่หายหรือถูกจัดผิดเพราะตำแหน่งบรรทัด — งาน 4

---

### Task 1: ปุ่มโหลดตัวอย่างด้วยข้อมูลสมมติ

**เป้าหมาย:** โหลดข้อความที่ครอบคลุมทุกประเภท โดยไม่ลบข้อความเดิมโดยไม่ยืนยัน
**Dependencies:** ไม่มี; ใช้ DOM/form เดิม
**Files:** แก้ `templates/index.html`, `static/style.css`, `tests/test_web.py`; สร้าง `static/app.js`, `tests/test_ui.js`
**Interfaces:** Consumes `#data` และ optional `#result-section`/`#mask_text`; Produces `#load-example-btn`, `#action-status`, script shared ที่งาน 3 เพิ่ม handler ต่อ

ตัวอย่างกำหนดแน่นอนเป็นห้าบรรทัดดังนี้ (ไม่มี newline ท้าย):

```text
1234-5678-9012-3456
somchai.d@company.com
093-245-7894
DOB:25/12/2549
Address: 689 ซอยลาดกระบัง 19 ถนนลาดกระบัง
```

ผลที่ expected:

```text
XXXX-XXXX-XXXX-3456
s*******d@company.com
XXX-XXX-7894
DOB:XX/XX/25XX
Address: XXX ซอยลาดกระบัง 19 ถนนลาดกระบัง
```

- [ ] เพิ่ม `WebTests.test_example_controls`: GET/POST มี button `load-example-btn` ชื่อ `โหลดตัวอย่าง`, type button, hidden; มี status live region และ script `src=/static/app.js` defer ขยาย parser เดิมเฉพาะ attrs ที่ต้อง assert
- [ ] เพิ่ม `tests/test_ui.js`: resolve script จากตำแหน่งไฟล์ test และ assert ด้วย `existsSync` ก่อน read/evaluate ด้วย vm เพื่อให้ไฟล์ที่ขาดรายงาน assertion ชัดเจนแทน ENOENT; ทดสอบ empty input โหลดครบห้าบรรทัด, nonempty input ใช้ confirm ชื่อ `แทนที่ข้อความปัจจุบันด้วยตัวอย่างหรือไม่?`, Cancel ไม่เปลี่ยน input/result, OK แทนข้อความและล้าง/ซ่อนผลเก่า; ยืนยัน handler ไม่ submit และเรียก focus บน input
- [ ] เพิ่ม JS test สำหรับ `input` event จากการพิมพ์/วาง: input ใหม่คงอยู่ แต่ `#mask_text.value` ว่าง, result section ซ่อน, status ของผลเก่าถูกล้าง; หน้าไม่มี result ไม่ crash
- [ ] รัน `python -B -m unittest discover -s tests -p test_web.py -v` และ `node --test tests/test_ui.js`; ต้องเห็น FAIL จาก controls/script ที่ขาด ไม่ใช่ import/runtime setup error
- [ ] เพิ่ม markup/script/handler ขั้นต่ำ: เก็บตัวอย่างเป็น constant ใน JS, เช็ค `.value !== ''` ก่อน confirm, หลังโหลดล้างผลเก่า/ซ่อน section ถ้ามี, แสดง `โหลดตัวอย่างแล้ว กด Mask Data เพื่อประมวลผล`; เปิดเผยปุ่มเมื่อ bind เสร็จ ไม่ auto-submit
- [ ] ผูก `input` event ให้ล้าง/ซ่อนผลเก่าเช่นเดียวกับโหลดตัวอย่างที่ยืนยันแล้ว และเพิ่มคำกำกับผล `ผลลัพธ์จากการประมวลผลครั้งล่าสุด` เพื่อไม่อ้างว่าผลเปลี่ยนตามการพิมพ์เมื่อปิด JS
- [ ] เพิ่ม `WebTests.test_example_masking` ส่ง fixture ข้างต้นและ assert textarea input/result ตามค่าข้างต้น ไม่ derive expected ด้วย `mask_data`
- [ ] รันสองคำสั่งเดิมและ `git diff --check`; ต้อง PASS ตรวจด้วย browser ว่าปุ่มใช้ Tab/Enter ได้ ก่อน commit เฉพาะไฟล์งานนี้ด้วย `feat: load fictional masking example`

**Done:** ตัวอย่างครบห้าประเภท cancel รักษาข้อความ; เมื่อ JS ทำงานทั้งการโหลดตัวอย่างและแก้ input ล้างผลเก่า เมื่อปิด JS มีคำกำกับว่าผลมาจากการ submit ครั้งล่าสุด
**ความเสี่ยง:** OK เปลี่ยน input ในหน้าเท่านั้น ยืนยันก่อนแทนข้อมูล ไม่มีการบันทึกข้อมูลหรือส่ง request เพิ่ม

### Task 2: แผงอธิบาย Regex ทั้งห้าประเภท

**เป้าหมาย:** ช่วยผู้ใช้เข้าใจสิ่งที่ปิดและสิ่งที่เก็บ รวมข้อจำกัดจริง
**Dependencies:** ไม่มี; อ่าน `app.py` ณ implementation เพื่อให้คำอธิบายตรง pattern ปัจจุบัน
**Files:** แก้ `templates/index.html`, `static/style.css` เท่าที่จำเป็น, `tests/test_web.py`
**Interfaces:** Produces `details#regex-guide` พร้อม summary `Regex ทำงานอย่างไร` บน GET/POST; ไม่เปลี่ยน JS/backend contract

- [ ] เพิ่ม `WebTests.test_regex_guide`: GET/POST มี details/summary และหัวข้อ `บัตรเครดิต`, `อีเมล`, `โทรศัพท์`, `วันเกิด`, `ที่อยู่`; assert pattern จริงทุกประเภทและ replacement string ของบัตร/โทรศัพท์/DOB/Address รวมแบบมีขีดและไม่มีขีด ส่วนอีเมล assert คำอธิบาย callback `mask_email` ว่าเก็บตัวแรก/ตัวสุดท้าย โดเมน และแทนตัวกลางด้วย `*` ตามจำนวน ไม่สมมติว่ามี replacement string
- [ ] รัน `python -B -m unittest discover -s tests -p test_web.py -v`; test ใหม่ต้อง FAIL เพราะ guide ยังไม่มี
- [ ] เพิ่ม `<details>` ปิดไว้เริ่มต้น แยกห้าหัวข้อ: แสดง pattern จริงใน `<code>`, อธิบาย capture group/การแทนค่ารวม callback อีเมลโดยไม่แสดง function ทั้งตัว, input/output ตาม fixture ที่ระบุในแผนงาน 1 ซึ่งไม่ต้องรอ implementation งาน 1 คง HTML escaping
- [ ] ระบุข้อจำกัดใน guide: อีเมลชื่อยาวหนึ่ง/สองตัวไม่มีตัวกลางให้ปิด, DOB ตรวจรูปแบบไม่ตรวจวันจริงและไม่แปลงปี, Address รองรับ numeric/slash เท่านั้น; ไม่กล่าวอ้างว่าเซ็นเซอร์ข้อมูลส่วนบุคคลทุกชนิด
- [ ] รันคำสั่งเดิมและ `git diff --check`; ต้อง PASS ตรวจเปิด/ปิด details ด้วย keyboard และ pattern ยาวบนจอมือถือไม่ทำหน้า overflow ก่อน commit ด้วย `feat: explain the five masking regex rules`

**Done:** คำอธิบายตรง implementation ทุก rule ใช้งานได้โดยไม่ต้อง JavaScript
**ความเสี่ยง:** pattern ที่แสดงเป็นข้อความอาจ drift เมื่อแก้ backend ภายหลัง ต้องแก้ guide/tests ใน change เดียวกัน ไม่ refactor backend เพื่อสร้าง metadata ในงานนี้

### Task 3: ปุ่มคัดลอกผลลัพธ์พร้อม error handling

**เป้าหมาย:** คัดลอกเฉพาะผลที่แสดงหลัง masking ด้วยการคลิกของผู้ใช้
**Dependencies:** งาน 1 สำหรับ script/status; ไม่ขึ้นกับ guide งาน 2
**Files:** แก้ `templates/index.html`, `static/app.js`, `tests/test_web.py`, `tests/test_ui.js`; ใช้ style ปุ่มจากงาน 1
**Interfaces:** Consumes `#mask_text`, `#action-status`, browser `navigator.clipboard.writeText(text) -> Promise`; Produces `button#copy-result-btn` ชื่อ `คัดลอกผลลัพธ์` เฉพาะภายใน result section

- [ ] เพิ่ม `WebTests.test_copy_control`: GET และ empty result ไม่มี copy button; POST ที่มีผลมี button type button hidden ใน result; ยืนยัน readonly ของ textarea เดิม
- [ ] เพิ่ม JS tests: writeText ได้ค่าผลจริงตรงทั้งข้อความ/newline/HTML, ไม่ได้ input เดิม; แสดง success หลัง promise resolve เท่านั้น; reject/ไม่มี API แจ้ง failure; script รันได้เมื่อไม่มี result; โหลดตัวอย่างแล้วไม่สามารถ copy ผลเก่า
- [ ] เพิ่ม test กรณี promise copy ยังไม่เสร็จแล้ว input เปลี่ยน: เมื่อ resolve/reject ภายหลังต้องไม่เขียนทับ status ใหม่หรือเปิดผลเก่ากลับมา handler ใช้ snapshot ของค่าที่คัดลอก และตรวจว่ายังเป็น canonical result ปัจจุบันก่อนเปลี่ยน feedback
- [ ] รัน `python -B -m unittest discover -s tests -p test_web.py -v` และ `node --test tests/test_ui.js`; tests ใหม่ต้อง FAIL
- [ ] เพิ่ม button และ handler หลัง DOM โหลด: ถ้า canonical result ว่างให้จบโดยไม่เขียน clipboard; เรียก writeText โดยตรงใน click, await แล้วแจ้ง `คัดลอกผลลัพธ์แล้ว` เฉพาะเมื่อยังเป็นผลปัจจุบัน; catch/ไม่มี API แจ้ง `คัดลอกอัตโนมัติไม่ได้ โปรดเลือกข้อความผลลัพธ์และคัดลอกเอง` โดย textarea ผลงานนี้ยังแสดงให้เลือกได้ ไม่อ่าน clipboard ไม่ใช้ deprecated fallback
- [ ] รัน `python -B -m unittest discover -s tests -v`, `node --test tests/test_ui.js`, `git diff --check`; ต้อง PASS ทั้ง regression และ 100 cases เดิม
- [ ] ตรวจ browser จริงบน localhost/HTTPS: copy แล้ว paste ในช่องข้อความแยกเพื่อเทียบครบหลายบรรทัด; ปิด JS แล้ว form ยังส่งได้ และตรวจกรณี permission ถูกปฏิเสธ ก่อน commit ด้วย `feat: copy masked output with accessible feedback`

**Done:** success/failure feedback ตรงผลจริง ไม่ส่งข้อมูลเพิ่ม และไม่มี uncaught promise rejection
**ความเสี่ยง:** clipboard เป็นของระบบ ผู้ใช้อาจนำข้อมูลไปวางที่อื่น; masked result ยังมีข้อมูลที่โจทย์ให้เก็บ browser policy ต่างกันจึงต้องมี manual copy เสมอ

### Task 4: Toggle ระหว่างข้อความเต็มและรายการผลลัพธ์ตามภาพ

**เป้าหมาย:** แสดงข้อความเต็มเป็นค่าเริ่มต้น และสลับเป็นรายการแบ่งประเภทที่อ่านง่ายบนมือถือ
**Dependencies:** งาน 1 สำหรับ script/status และงาน 3 สำหรับ canonical copy contract; ไม่ขึ้นกับ guide งาน 2
**Files:** แก้ `templates/index.html`, `static/app.js`, `static/style.css`, `tests/test_web.py`, `tests/test_ui.js`; ไม่แก้ `app.py` หรือ signature ของ `mask_data`
**Interfaces:** Consumes `#mask_text.value` เท่านั้น; Produces `pre#result-text`, `#result-categories`, `button#result-view-toggle`; งาน copy ยังอ่าน `#mask_text.value` เสมอ

กติกาจัดหมวดที่เลือกเพื่อรองรับ input เป็น free text ของ assignment:

- ใช้ทั้งบรรทัดจาก canonical result ไม่สมมติว่าบรรทัดที่ 1–5 เป็นประเภทใด; trim เฉพาะสำเนาสำหรับตรวจประเภท โดย canonical result ห้ามเปลี่ยน
- Credit Card: ทั้งบรรทัดตรง `XXXX-XXXX-XXXX-` ตามด้วยเลข 4 ตัว; Phone Number: `XXX-XXX-` ตามด้วยเลข 4 ตัว
- Email: ทั้งบรรทัดเป็น token เดี่ยวที่มีชื่อและโดเมนคั่นด้วย `@`; นี่เป็นการจัดหมวดข้อความที่ backend ทำแล้ว ไม่เพิ่ม email validation/masking rules
- Date of Birth: ทั้งบรรทัดตรง `DOB:` ตามด้วย space/tab และ `XX/XX/` ตามด้วยเลข 2 ตัวกับ `XX`; ในรายการซ่อน prefix `DOB:` เพราะหัวข้อบอกประเภทแล้ว
- Address: บรรทัดขึ้นต้น `Address:` ตามด้วย space/tab และ `XXX` เป็น token; ในรายการแสดงส่วนหลัง prefix เช่น `XXX ซอยลาดกระบัง 19 ถนนลาดกระบัง` ครบทั้งบรรทัด
- หลายรายการประเภทเดียวกันแสดงทุกค่าเรียงตามลำดับเดิม; ไม่ deduplicate ไม่มีค่าไม่ต้องแสดงหมวดนั้น
- บรรทัดไม่ตรงรูปแบบ รวมข้อความผสมหลายประเภทในบรรทัดเดียว แสดงทั้งบรรทัดในหมวด `ข้อความอื่น` ตามลำดับเดิม ไม่ทิ้งหรือพยายามแยกด้วย parser ใหม่ ที่อยู่หลายบรรทัด: ส่วนต่อที่ไม่มี prefix อยู่ในหมวดนี้ ข้อความเต็มยังคงต้นฉบับผลทั้งหมด
- canonical text ยังคงบรรทัดว่าง/whitespace ครบ; โหมดรายการไม่ต้องสร้างการ์ดจากบรรทัดว่าง แต่ห้ามใช้ผลรายการแทนข้อมูลสำหรับ copy

- [ ] เพิ่ม `WebTests.test_result_views`: GET/empty result ไม่มี toggle; POST มี pre ที่ text เท่ากับ masked result ทุกตัว มี textarea canonical เดิม และ categories hidden; assert toggle type button, aria-controls และ aria-pressed false
- [ ] เพิ่ม JS tests: fixture ทั้งห้าประเภทจากงาน 1 จัดหมวดตรง expected, DOB/address ตัดเฉพาะ prefix ในรายการ; สลับไปกลับ input/canonical text ไม่เปลี่ยนและไม่ submit; จัดหลาย card/email ครบ; mixed-line อยู่ใน `ข้อความอื่น`; ไม่มีผลไม่ crash; โหลดตัวอย่างล้างผลเก่าทั้งสองโหมด
- [ ] เพิ่ม JS test ยืนยัน copy ในโหมดรายการยังส่ง canonical text ห้าบรรทัดรวม `DOB:`/`Address:` ให้ writeText และ HTML payload ในหมวดอื่นถูกใส่ผ่าน textContent ไม่มี innerHTML
- [ ] เพิ่ม JS tests ให้ copy reject/ไม่มี API ขณะอยู่โหมดรายการ: กลับโหมดข้อความเต็มโดย pre แสดง, categories ซ่อน, aria-pressed false และ label `แสดงแบบรายการ`; canonical ไม่เปลี่ยนและมี failure status เมื่อผลถูกล้างระหว่างรอ promise ห้าม fallback เปิดผลเก่ากลับมา
- [ ] ขยาย tests ของงาน 1 ทั้งโหลดตัวอย่างและ `input` event: ล้าง pre และ children ของ categories, ซ่อน result section, reset toggle เป็นโหมดข้อความเต็ม; tests เดิมของงาน 1/3 ต้องยังผ่าน
- [ ] รัน `python -B -m unittest discover -s tests -p test_web.py -v` และ `node --test tests/test_ui.js`; tests ใหม่ต้อง FAIL ก่อน implement
- [ ] เพิ่ม pre ด้วย Jinja autoescape แสดงข้อความเต็มแม้ปิด JS: `white-space: pre-wrap`, `overflow-wrap: anywhere`, ไม่จำกัดความสูงหรือใส่ internal vertical scroll; คง canonical textarea hidden readonly เพื่อรักษา interface เดิม
- [ ] เพิ่ม toggle ซ่อนจน JS พร้อม: เริ่ม label `แสดงแบบรายการ`, กดแล้วเปลี่ยนเป็น `แสดงข้อความเต็ม`; aria-pressed true เมื่อรายการแสดง ใช้ hidden สลับสอง containers โดยไม่แก้ค่าผลหรือบันทึก mode ใน storage
- [ ] ขยาย error branch ของ copy จากงาน 3 ให้สลับกลับโหมดข้อความเต็มก่อนแจ้ง failure เพื่อเลือกคัดลอกเองได้; ใช้การตั้ง view เดียวกับ toggle ไม่อ่าน input ใหม่หรือเปิด textarea ที่ซ่อน
- [ ] สร้างรายการจาก canonical masked text ผ่าน createElement/textContent; ใช้ semantic headings/list หรือ dl ให้มี label/value แยกชัดเจน border และ divider ตามภาพ รองรับข้อความที่อยู่ยาวโดย wrap และคง focus ที่ toggle
- [ ] รัน `python -B -m unittest discover -s tests -v`, `node --test tests/test_ui.js`, `git diff --check`; ต้อง PASS ตรวจ browser ที่ความกว้าง 375px/desktop, Tab/Enter toggle, copy ทั้งสองโหมด, ไม่มี JS แล้วอ่านข้อความเต็มและ submit ได้
- [ ] commit เฉพาะไฟล์งานนี้ด้วย `feat: toggle full text and categorized masking results`

**Done:** ตัวอย่างห้าประเภทแสดงข้อความเต็มตามคำขอ สลับเป็นรายการตามภาพและกลับได้ ข้อมูลไม่เปลี่ยน/ไม่หาย copy ผลเดียวกันทั้งสองโหมด; copy ล้มเหลวกลับมาเลือกข้อความเต็มได้ และ input เปลี่ยนล้างผลทั้งสองโหมด
**ความเสี่ยง:** โหมดรายการจัดหมวดเป็นรายบรรทัด ไม่ใช่ตัวแยกข้อมูลจาก log ทุกชนิด; ข้อความผสม/ส่วนต่อของที่อยู่จะแสดงในหมวดอื่น คงโหมดข้อความเต็มเป็นแหล่งอ้างอิง ไม่เพิ่มระบบบันทึกหรือ Edit Information ตามภาพ

## ตรวจแผนเทียบขอบเขตและ handoff

## ขอบเขตเพิ่มเติม: log ยาวและ Regex highlights (คำขอผู้ใช้ล่าสุด)

**สถานะ implementation (2026-10-10):** โค้ด Tasks 5–7 และ automated checks ผ่านแล้ว รายละเอียดอยู่ใน [execution record](2026-10-10-pdpa-usability-execution.md); ผู้ใช้สั่ง `commit push` ให้เผยแพร่งานนี้พร้อม baseline UI ที่ค้างอยู่ ยังไม่ได้ตรวจ overlay/IME ใน browser จริง

ใช้ Superpowers writing-plans จัดงานต่อจาก Tasks 1–4 ที่ implement แล้ว ข้อกำหนดใหม่ในส่วนนี้มีลำดับเหนือข้อความเดิมที่ห้ามเพิ่ม API/แก้ `app.py` เฉพาะเท่าที่จำเป็นสำหรับ highlights ไม่เปลี่ยนผล masking, routes เดิม, form fields หรือเพิ่ม dependency

สถานะปัจจุบัน: มีเมนูผลสองปุ่มแบบ GitHub แทน toggle ปุ่มเดี่ยว, Thai/English menu และธีม orange/black แล้ว ให้ยึดโค้ดปัจจุบันไม่ย้อนกลับ UI ตามขั้นตอนเก่า งานใหม่ต้องรักษา tests และ DOM contracts เดิม

**พฤติกรรมที่เลือก:** input ยังเป็น textarea ที่แก้ได้ พร้อมชั้น highlight ซ้อนด้านหลัง; output full text แสดง mark ในข้อความจริง ส่วน categorized view ยังคงการจัดหมวดรายบรรทัด ข้อความผสมอยู่ใน “ข้อความอื่น” พร้อม highlights โดยไม่เพิ่ม log parser highlight ช่วงที่ Regex เซ็นเซอร์จริง ไม่ใช่ทั้งบรรทัดหรือทุกคำที่ดูคล้ายข้อมูล

ใช้ Python `re` เป็นแหล่ง rules เดียว ไม่คัดลอก masking Regex เป็น JavaScript เพื่อให้ live input กับผล server ตรงกัน ตัวอย่างทั้งหมดเป็นข้อมูลสมมติ ไม่เพิ่มการบันทึกหรือ logging raw text

### Task 5: ปุ่มโหลดตัวอย่างเดิมสลับ default / long log

**เป้าหมาย:** ปุ่มเดียวโหลดสองตัวอย่างสลับกัน โดยยังรักษาการยืนยันก่อนแทนข้อความ
**Dependencies:** Task 1 และระบบภาษาในโค้ดปัจจุบัน
**Files:** แก้ `static/app.js`, `tests/test_ui.js`, `tests/test_web.py`; สร้าง `tests/fixtures/long_log.txt`, `tests/fixtures/long_log_masked.txt`, `static/examples.json`
**Interfaces:** `#load-example-btn` เดิม; `static/examples.json` มี keys `default` และ `long_log` เป็น strings; JS โหลด fixture JSON ผ่าน static route ของ Flask ไม่เพิ่ม endpoint ตัวอย่าง

- [ ] เขียน long log fixture ประมาณ 15–20 บรรทัด มี timestamp, INFO/WARN/DEBUG, ข้อความธรรมดา และข้อมูลทั้งห้าประเภทแทรกกลางประโยค หลายรายการในบรรทัดเดียวและหลายบรรทัด มีบัตร/โทรศัพท์ทั้งสองแบบ มี DOB space/tab และ Address numeric/slash; ไม่ใช้ข้อมูลจริง
- [ ] เขียน expected fixture ด้วยมือ คงเนื้อหา/บรรทัดทุกตัวนอก masking; ชื่อถนน/เลขซอยไม่หาย ไม่มีการคำนวณ expected ด้วย `mask_data` ขณะ test
- [ ] เพิ่ม test โหลดครั้งแรก default, ครั้งที่สอง long log, ครั้งที่สาม default; Cancel คงข้อความและไม่เลื่อนตัวอย่าง; ไม่ auto-submit; หลังยืนยันล้างผลเก่าทั้งสองโหมด
- [ ] ย้าย default เดิมเข้าสู่ JSON พร้อม long log fixture ใช้ไฟล์นี้เป็นแหล่งข้อความเดียว tests assert JSON ตรง fixtures ไม่ทำสำเนาข้อความยาวอีกชุดใน JS; ปุ่มแสดงเมื่อข้อมูลโหลดสำเร็จ หาก fetch ล้มเหลวแจ้ง error ภาษาไทย/อังกฤษและไม่เปลี่ยน input
- [ ] ดัชนีตัวอย่างเริ่ม default ทุกครั้งที่เปิด/submit หน้า ไม่เก็บใน storage; ยืนยันแล้วจึงเลื่อนดัชนี แสดงสถานะ `โหลดตัวอย่างแบบสั้นแล้ว` / `โหลดตัวอย่าง log ยาวแล้ว` พร้อมข้อความให้กด Mask Data และคำแปลอังกฤษ
- [ ] เพิ่ม Python test ส่ง long log ไป POST /mask แล้ว assert canonical output ตรง expected fixture และ input ยังครบ; อัปเดต test_ui harness เพื่อ mock fetch สำเร็จ/ล้มเหลวและรอ initialization จริง
- [ ] รัน `python -B -m unittest discover -s tests -v`, `node --test tests/test_ui.js`, `git diff --check`; ต้อง PASS ก่อน commit `feat: alternate short and long log examples`

**Done:** มีปุ่มโหลดเพียงปุ่มเดียว สลับสองตัวอย่างจริง Cancel ไม่เปลี่ยน state และ long log masked ตรง expected
**ความเสี่ยง:** ตัวอย่างถูก fetch แบบ async ปุ่มต้องไม่พร้อมใช้ก่อนข้อมูลพร้อม ห้ามใช้ input event ของผู้ใช้เลื่อนดัชนีตัวอย่าง

### Task 6: Clear input และ reset ผลทั้งหมด

**เป้าหมาย:** ล้างข้อมูลในหน้าได้ทันทีและกลับไปพร้อมรับ input ใหม่
**Dependencies:** Task 1 clearResult และ Task 5 example state
**Files:** แก้ `templates/index.html`, `static/app.js`, `static/style.css`, `tests/test_web.py`, `tests/test_ui.js`
**Interfaces:** `button#clear-input-btn` type button ชื่อ `ล้างข้อความ` / `Clear input`; ใช้ clearResult เดิมและ reset example index เป็น default

- [ ] เพิ่ม tests: Clear ทำให้ input/canonical/pre ว่าง categories ล้าง result section ซ่อน เมนูผลกลับ full text, example ถัดไปเป็น default; ไม่ POST, focus input และไม่เปลี่ยน language
- [ ] เพิ่มปุ่มรองใน form-actions ซ่อนจน JS พร้อม; กดแล้วล้าง input กับผล/status เดิมทั้งหมด แจ้ง `ล้างข้อความแล้ว` / `Input cleared.` ผ่าน live region ไม่ต้อง confirm เพราะเป็นการกดล้างโดยตรง
- [ ] ปิดปุ่มเมื่อ input/result ว่างหรือกำลัง submit; input/example handlers อัปเดต disabled ตามค่าจริง เพิ่ม tests สำหรับหน้าไม่มีผลและ late clipboard completion ต้องไม่ทับข้อความ clear
- [ ] รัน Python/Node tests และ diff check ตามงาน 5; commit `feat: clear input and reset masking results`

**Done:** Clear รีเซ็ตหน้าและลำดับตัวอย่างครบ โดยคงภาษาและไม่ส่ง request masking
**ความเสี่ยง:** ล้างข้อความที่ยังไม่บันทึกในหน้าโดยตั้งใจ ไม่ใช่การลบข้อมูลบน server หรือการรับประกันล้าง browser history/clipboard

### Task 7: Highlights ที่ตรงกับ Python Regex ใน input และ output

**เป้าหมาย:** เห็นช่วงที่ masking จับได้ในข้อความ log ยาวทั้งก่อนและหลังประมวลผล
**Dependencies:** Tasks 5–6 และ canonical copy/result menu ปัจจุบัน
**Files:** แก้ `app.py`, `templates/index.html`, `static/app.js`, `static/style.css`, `tests/test_mask_data.py`, `tests/test_web.py`, `tests/test_ui.js`; สร้าง `tests/test_highlights.py`
**Interfaces:**
- คง `mask_data(t: str) -> str` เป็น wrapper ที่คืนข้อความเหมือนเดิม
- เพิ่ม `mask_with_highlights(t: str) -> dict` คืน `{text: str, input_spans: [...], output_spans: [...]}`; span คือ `{start: int, end: int, kind: str}` end exclusive และ offsets เป็น Unicode code points; kind เป็น `card|email|phone|dob|address`
- เพิ่ม `POST /highlight` JSON `{text: string}` คืน input spans เท่านั้น ใช้สำหรับ live input; ไม่คืน raw text ซ้ำ ไม่ persist/log ข้อความ ตรวจ Content-Type, JSON object และ string จริง ไม่ coercion; request ผิดตอบ JSON error พร้อม 400/415 ตามกรณี
- POST /mask ใช้ shared engine ส่ง canonical text และ span metadata ใน script application/json ผ่าน Jinja `tojson`; template variables เดิมคงอยู่ ไม่ใช้ `|safe` กับข้อความผู้ใช้
- DOM เพิ่ม input mirror ที่ `aria-hidden=true` และ `pointer-events:none`; textarea#data ยังเป็น input จริงและมี label; output pre#result-text ใช้ text nodes/mark ไม่เปลี่ยนค่าของ textarea#mask_text

- [ ] เขียน backend tests ก่อนแก้: shared engine text เท่ากับผลเดิมทั้ง 100 cases และ long fixture; spans เรียง ไม่ซ้อน อยู่ในขอบเขต และ substring ที่ระบุเป็นข้อมูลประเภทนั้น; input/output offsets ถูกแม้ email ความยาวลดหรือ card ไม่มีขีดกลายเป็นมีขีด
- [ ] เพิ่มเคส Unicode/emoji ก่อนข้อมูล, Thai address, หลาย match, no-match, email 1–2 ตัวไม่ถูกปิดจึงไม่มี spans; ข้อมูลที่ mask แล้ว/ข้อความเลียนแบบ XXXX ที่ engine ไม่เปลี่ยนต้องไม่สร้าง highlight เทียม
- [ ] รวม patterns/replacements/callback ที่มีอยู่ไว้ใน shared engine รักษาลำดับ substitutions เดิมทุกตัว ขณะ replace บันทึกช่วงที่เปลี่ยนจริงและปรับ mapping input/output ตามความยาวใหม่ หาก substitutions ทับช่วงเดิมให้ merge ช่วงที่ซ้อนและยึดประเภทจาก rule แรก ไม่แยก path ที่ใช้ Regex คนละชุด
- [ ] เพิ่ม tests /highlight สำหรับ valid JSON, missing/nonstring field, invalid JSON, wrong content type และ HTTP errors; ทำ endpoint โดย reuse shared engine ห้าม log input เพิ่ม อัปเดต guide/test หากการจัดตำแหน่งโค้ดเปลี่ยนแต่ pattern ต้องคงเดิม
- [ ] เขียน JS tests: debounce input 250ms, AbortController ยกเลิก request เก่าและ request sequence กัน response เก่าทับ input ใหม่; error แสดงสถานะไม่ block form; Clear/example ต้องยกเลิก pending แล้วล้าง/refresh highlights ตาม input ใหม่
- [ ] ทำ input mirror ซ้อน textareaด้วย font/line-height/padding/wrapping เดียวกัน เน้นพื้นหลังช่วง match โดย textarea ใช้พื้นโปร่งใสและตัวอักษรอ่านได้ตามเดิม ไม่ใช้ contenteditable; sync scroll และ resize ทั้งสองแกน ไม่ intercept keyboard/selection/IME; no-JS หรือ fetch error ยังคง textarea ปกติ
- [ ] แปลง code-point offsets ด้วย `Array.from(text)` ก่อน slice ใน JS ห้ามใช้ Python offsets กับ JS UTF-16 slice โดยตรง; สร้าง mark/text nodes ด้วย createElement/textContent เท่านั้น ป้องกัน HTML/script จาก input
- [ ] render output highlights จาก output_spans ของ engine ไม่ค้น marker XXXX ด้วย Regex ใหม่; copy ยังคง plain canonical text ไม่รวม markup; categorized view ใช้ช่วง offset ของแต่ละบรรทัดและชดเชย prefix DOB/Address ที่ตัดในรายการ ไม่เพิ่มการแยก mixed-line เป็น fields
- [ ] ใช้ highlight สี orange แบบ subdued และ legend แปลไทย/อังกฤษ บอกว่าเป็นช่วงที่ตรงกฎเซ็นเซอร์ ไม่อ้างว่าตรวจพบข้อมูลส่วนบุคคลทั้งหมด mark ต้องไม่กลบตัวอักษร/focus และลด motion ตาม theme เดิม
- [ ] รัน `python -B -m unittest discover -s tests -v`, `node --test tests/test_ui.js`, `node --check static/app.js`, `git diff --check`; ต้องผ่านทั้งหมด ทดสอบ browser desktop/375px กับ log ยาว การพิมพ์ภาษาไทย/IME, scroll, resize, selection, copy, switching language/view และ Clear ระหว่าง request
- [ ] commit `feat: highlight regex matches in input and masked output` เมื่อ checks ผ่าน; browser ที่ตรวจไม่ได้ต้องรายงาน ไม่ถือ DOM stubs เป็นหลักฐาน overlay alignment

**Done:** live input highlights กับผล server ตรง rules เดียวกัน output highlight ช่วงจริง แม้ข้อมูลกลางประโยค Unicode และความยาวเปลี่ยน โดย canonical result/copy ไม่เปลี่ยน
**ความเสี่ยง:** textarea overlay ต้องตรวจ alignment บน browser จริง; live highlights ส่ง input ไป server แม้ก่อนกด Mask Data จึงต้องมีคำอธิบายไทย/อังกฤษใกล้ input ว่า `ข้อความจะถูกส่งไปตรวจ Regex ขณะพิมพ์` ไม่บันทึกเพิ่ม; ถ้า network ล้มเหลว masking ผ่าน form ยังทำงานได้

### ตรวจขอบเขตเพิ่มเติมกับแผนเดิม

- งาน 5 เปลี่ยน default example flow ที่เดิมโหลดค่าเดียว ต้องอัปเดต tests เดิมที่คาดค่าคงที่ทุก click
- งาน 6 reuse การล้างผลเดิม งาน 7 ขยายการล้างให้ครอบคลุม mirrors/spans/pending requests ไม่สร้างระบบ reset อีกชุด
- งาน 7 เป็นข้อยกเว้นที่ผู้ใช้ร้องขอต่อ “ไม่แก้ app.py/ไม่เพิ่ม API” เพื่อ reuse Python re เท่านั้น ไม่มีการเพิ่ม framework/dependency
- เมนูผลสองปุ่มแบบ GitHub และระบบภาษาในโค้ดปัจจุบันเป็น baseline ไม่ implement toggle label เดี่ยวจาก Task 4 เวอร์ชันแรก
- รอบนี้เขียนแผนเท่านั้น ยังไม่ implement/commit/push งานใหม่; การเผยแพร่ต้องตรวจ pending changes ปัจจุบันก่อน เพราะ main มี Render auto-deploy

## Checklist ส่งมอบเดิม (Tasks 1–4)

| สิ่งที่ตกลงในแผน | งาน/หลักฐาน |
|---|---|
| โหลดตัวอย่างครบห้าประเภท | งาน 1 + expected ที่กำหนดเอง |
| อธิบาย Regex | งาน 2 + guide contract/tests |
| คัดลอกผล | งาน 3 + success/reject/missing API tests |
| ข้อความเต็มและ toggle รายการตามภาพ | งาน 4 + canonical invariant/categorization/mobile tests |
| คง masking และ form เดิม | regression 100 cases + web tests |
| รักษาข้อมูลเดิม/escaping/keyboard | งาน 1 cancel, งาน 3 escaping และ browser checks |
| Tasks 1–4 ไม่เพิ่ม dependencies/backend/API | JavaScript มาตรฐาน, Node built-ins; Task 7 เป็นข้อยกเว้นเฉพาะ backend highlights และยังไม่เพิ่ม dependency |

แผนตรวจแล้วว่าชื่อ DOM IDs ตรงกัน dependencies ไม่มีวงจร: งาน 1 → งาน 3 → งาน 4; งาน 2 ทำแยกได้ แต่ละงานจบด้วย tests ของตัวเอง งาน 4 ขยาย clear/fallback ของงาน 1/3 โดยยังรัน tests เดิมได้ครบ การคัดลอกล้มเหลวไม่ติด hidden canonical textarea; guide อีเมลอธิบาย callback จริง; test สำหรับ script ที่ยังไม่มีรายงาน assertion ชัดเจน

ก่อน implementation ตรวจ `node --version` และเลือก Node ที่รองรับ built-in test runner หากไม่มี Node ให้รายงานเครื่องมือที่ขาดก่อน ห้ามเพิ่ม npm framework เพื่อแก้ช่องว่างนี้ Flask test client ไม่ execute JavaScript จึงใช้แทน JS/browser checks ไม่ได้

รอบปรับแผนนี้ไม่ได้ commit/push/deploy product; ก่อน push ให้ regression Tasks 1–4 และ checks ของ Tasks 5–7 ที่ implement ผ่าน และผู้ใช้มอบหมายเผยแพร่ เพราะ Render auto-deploy จาก main ส่วน browser checks ที่เครื่องมือใช้งานไม่ได้ต้องรายงานว่าไม่ได้ตรวจจริง ห้ามนับ DOM stub เป็น browser coverage
