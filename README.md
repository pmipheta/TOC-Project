# PDPA Data Masking Tool

เว็บแอป Flask สำหรับปกปิดข้อมูลส่วนบุคคลในข้อความและ log ด้วย Python Regular Expression พร้อมแสดงตำแหน่งที่ตรงกฎ แยกผลลัพธ์ตามประเภท และรองรับภาษาไทย/อังกฤษ

🌐 **ทดลองใช้งานเว็บ:** [https://toc-project-clq8.onrender.com](https://toc-project-clq8.onrender.com)

> โปรเจกต์นี้เป็นเครื่องมือสาธิตการทำ data masking ตามรูปแบบที่กำหนด ไม่ใช่ระบบตรวจจับหรือทำข้อมูลนิรนามตาม PDPA แบบครบวงจร

## ความสามารถหลัก

- ปกปิดบัตรเครดิต โทรศัพท์ อีเมล วันเกิด และเลขที่บ้าน
- รองรับบัตรเครดิตและโทรศัพท์ทั้งแบบมีขีดและไม่มีขีด
- ปิดชื่ออีเมลยาว 1–2 ตัวทั้งหมด และเก็บ domain ไว้
- เน้นสีข้อมูลที่ตรงกฎขณะพิมพ์
- แสดงผลแบบข้อความเต็มหรือรายการแยกประเภท
- โหลดตัวอย่างสั้นและตัวอย่าง log ยาว
- คัดลอกผลลัพธ์ และสลับภาษาไทย/อังกฤษ
- ใช้งานฟอร์มหลักได้แม้ JavaScript ไม่ทำงาน

## รูปแบบข้อมูลที่รองรับ

| ประเภท | Input ตัวอย่าง | Output ตัวอย่าง |
|---|---|---|
| บัตรเครดิต | `1234-5678-9012-3456` | `XXXX-XXXX-XXXX-3456` |
| บัตรเครดิตไม่มีขีด | `1234567890123456` | `XXXX-XXXX-XXXX-3456` |
| โทรศัพท์ | `093-245-7894` | `XXX-XXX-7894` |
| โทรศัพท์ไม่มีขีด | `0932457894` | `XXX-XXX-7894` |
| อีเมล | `somchai.d@company.com` | `s*******d@company.com` |
| อีเมลชื่อสั้น | `ab@example.com` | `**@example.com` |
| วันเกิด | `DOB:25/12/2549` | `DOB:XX/XX/25XX` |
| เลขที่บ้าน | `Address: 689/12 ถนนลาดกระบัง` | `Address: XXX ถนนลาดกระบัง` |

## เริ่มใช้งานบน Windows

ต้องมี Python 3.10 ขึ้นไป เปิด PowerShell ในโฟลเดอร์โปรเจกต์แล้วรัน:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m flask --app app run
```

ถ้า PowerShell ไม่อนุญาตให้ activate virtual environment ให้เรียก Python โดยตรง:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m flask --app app run
```

จากนั้นเปิด <http://127.0.0.1:5000> และหยุดเซิร์ฟเวอร์ด้วย `Ctrl+C`

### macOS / Linux

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python -m flask --app app run
```

## โครงสร้างโปรเจกต์

```text
TOC-Project/
├── app.py                    # Flask entry point และ HTTP routes
├── backend/
│   ├── __init__.py           # Public exports ของ masking module
│   └── masking.py            # Regex rules, masking engine และ span metadata
├── templates/
│   └── index.html            # หน้าเว็บและคู่มือ Regex
├── static/
│   ├── app.js                # Entry point และ event orchestration ฝั่ง browser
│   ├── js/
│   │   ├── i18n.js           # ภาษาไทย/อังกฤษและข้อความสถานะ
│   │   ├── highlights.js     # Render highlight และ live highlight requests
│   │   └── results.js        # จัดกลุ่มและ render ผลลัพธ์ตามประเภท
│   ├── style.css             # Styles และ responsive layout
│   └── examples.json         # ตัวอย่างข้อความสั้นและ long log
├── tests/                    # Python และ JavaScript regression tests
├── requirements.txt
└── Procfile                  # Gunicorn entry point สำหรับ deployment
```

Dependency flow หลัก:

```text
Browser → templates/index.html → static/js helpers → static/app.js
   │
   ├── POST /highlight → app.py → backend/masking.py
   └── POST /mask      → app.py → backend/masking.py → rendered HTML
```

`backend/masking.py` ไม่มี dependency กับ Flask จึงเรียกใช้และทดสอบแยกจากเว็บได้ ส่วน `app.py` ยังคง export `mask_data()` และ `mask_with_highlights()` เพื่อรักษา interface เดิม

## HTTP endpoints

| Method | Path | หน้าที่ |
|---|---|---|
| `GET` | `/` | แสดงแบบฟอร์ม masking |
| `POST` | `/mask` | รับ form field ชื่อ `data` แล้ว render ผลลัพธ์ |
| `POST` | `/highlight` | รับ JSON `{"text": "..."}` และคืน `input_spans` |

ตัวอย่าง response จาก `/highlight`:

```json
{
  "input_spans": [
    {"start": 0, "end": 10, "kind": "phone"}
  ]
}
```

ค่า `end` เป็น exclusive offset และตำแหน่งนับตาม Unicode code points

## การทดสอบ

รัน Python tests:

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
```

รัน JavaScript UI tests โดยใช้ Node.js 18 ขึ้นไป:

```powershell
node --test tests/test_ui.js
```

ตรวจ syntax ของ frontend scripts:

```powershell
node --check static/js/i18n.js
node --check static/js/highlights.js
node --check static/js/results.js
node --check static/app.js
```

ชุดทดสอบครอบคลุม Regex 100 กรณี, Flask routes, HTML escaping, Unicode offsets, long log, การแยกประเภท, clipboard, localization และ request debounce

## การ Deploy

Repository มี `Procfile` สำหรับระบบที่รองรับ Gunicorn:

```text
web: gunicorn app:app
```

Gunicorn เหมาะกับ Linux hosting เช่น Render ส่วนการพัฒนาใน Windows ให้ใช้ Flask development server ตามคำสั่งด้านบน ไม่ควรเปิด Flask debug server เป็น public production server

## ความเป็นส่วนตัวและข้อจำกัด

- ระบบไม่มี database, login, upload หรือการบันทึกข้อความลง storage ของแอป
- ข้อความจะถูกส่งไปยัง server เมื่อกด Mask Data
- เมื่อเปิด JavaScript ข้อความจะถูกส่งไปยัง `/highlight` หลังหยุดพิมพ์ประมาณ 250 ms
- Regex ตรวจเฉพาะรูปแบบที่ระบุ ไม่ครอบคลุมชื่อ เลขบัตรประชาชน หนังสือเดินทาง บัญชีธนาคาร หรือข้อมูลสุขภาพ
- วันเกิดต้องขึ้นต้นด้วย `DOB:` และไม่ได้ตรวจว่าเป็นวันที่จริง
- ที่อยู่ต้องขึ้นต้นด้วย `Address:` และปิดเฉพาะเลขที่บ้าน
- หมายเลขบัตรไม่ได้ตรวจด้วย Luhn algorithm และหมายเลขโทรศัพท์ไม่ได้รองรับทุกรูปแบบ เช่น `+66`
- ไม่ควรส่งข้อมูลจริงที่อ่อนไหวไปยัง deployment ที่ไม่ไว้วางใจ

## การเพิ่มหรือแก้กฎ Masking

แก้ `RULES` ใน `backend/masking.py` โดยรักษาลำดับของกฎ เพราะลำดับมีผลเมื่อ pattern ซ้อนกัน จากนั้นเพิ่ม expected cases ใน `tests/test_regex_100.py` และรันทั้ง Python/JavaScript tests ก่อน deploy

ถ้าเพิ่มประเภทข้อมูลใหม่ ต้องเพิ่ม label ที่ `static/js/results.js` เพื่อให้มุมมองแยกประเภทแสดงชื่อหมวดได้ถูกต้อง
