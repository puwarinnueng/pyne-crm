# PROGRESS — สถานะการสร้างเว็บ Pyne Studio CRM

อัปเดตล่าสุด: 25 กรกฎาคม 2569
อ่านคู่กับ `implementation-plan-phase1.md` (เช็คลิสต์งานที่วางแผนไว้) — ไฟล์นี้บอกว่า **ทำไปถึงไหนแล้วจริง**

## สถานะโดยรวม

1. **`index.html` + `js/` + `css/`** (โฟลเดอร์หลัก) — เว็บแอป mock ครบ 10 หน้าจอ ใช้ `localStorage` รันบนเครื่อง local ได้เลยไม่ต้องมี Google account (ดูหัวข้อ "วิธีรันดูตอนนี้")
2. **`gas/`** (ใหม่) — โค้ด Google Apps Script backend ที่ต่อ Google Sheets/Drive จริง **เขียนเสร็จแล้ว ผ่านการตรวจ syntax แล้ว แต่ยังไม่เคย deploy/ทดสอบจริง** เพราะขั้นตอน login/สร้าง Sheet ต้องใช้บัญชี Google ของผู้ใช้เอง (ดูหัวข้อ "ขั้นตอนที่ต้องทำเอง" ด้านล่าง)

ทั้งสองชุดเป็นคนละโฟลเดอร์ ไม่ทับกัน — ยังใช้ mock (`index.html` เดิม) ต่อพัฒนา UI เร็ว ๆ ได้ตามปกติ ระหว่างที่ทดสอบ `gas/` แยกไปพร้อมกัน

## วิธีรันดูตอนนี้

```
cd pyne-crm-web
python3 -m http.server 8743
```
แล้วเปิด `http://localhost:8743/index.html` — รหัสผ่านหน้าแรก (mock) คือ `1234`

ทดสอบบนมือถือ/iPad ในวงแลนเดียวกันได้โดยเปิด `http://<IP เครื่องนี้>:8743/index.html`

ข้อมูลลูกค้าตัวอย่าง (seed) ที่มีอยู่แล้ว: **สมหญิง** (081-234-5678) มีประวัติ 2 ครั้ง, **วรรณา** (089-876-5432) ยังไม่มีประวัติ — ลองค้นหาชื่อ/เบอร์นี้เพื่อทดสอบ flow ลูกค้าเก่า หรือกด "+ ลูกค้าใหม่" เพื่อทดสอบ flow กันเบอร์ซ้ำ

### เปิดหน้าใดหน้าหนึ่งตรง ๆ ระหว่าง dev (ไม่ต้องคลิกไล่ทีละหน้า)
เติม query string ต่อท้าย `index.html` เช่น:
- `?debugScreen=home`
- `?debugScreen=customerProfile&debugCustomer=C0001`
- `?debugScreen=formBrow&debugCustomer=C0001&debugServiceType=สักคิ้ว`
- `?debugScreen=consentSign&debugCustomer=C0001&debugServiceType=สักคิ้ว`
- `?debugScreen=techFields&debugCustomer=C0001&debugServiceType=สักคิ้ว`
- `?debugScreen=formTouchup&debugCustomer=C0001&debugServiceType=เติมสี`

## โครงสร้างไฟล์

```
pyne-crm-web/
├── implementation-plan-phase1.md   ย้ายมาจากโฟลเดอร์แม่
├── PROGRESS.md                     ไฟล์นี้
├── index.html                      shell หลัก มีทุกหน้าจอเป็น <section class="screen">
├── css/style.css                   สไตล์ทั้งหมด (ธีมเขียว ตาม PDF สเปก)
└── js/
    ├── main.js                     entry point, init ทุกหน้าจอ + เปิดหน้าแรก
    ├── router.js                   สลับหน้าจอ (show/goBack), จัดการปุ่ม data-back
    ├── state.js                    เก็บ state ระหว่างหน้า (ลูกค้าปัจจุบัน, ร่างฟอร์ม ฯลฯ)
    ├── mockApi.js                  ★ จำลองฟังก์ชันฝั่งเซิร์ฟเวอร์ — ดูหัวข้อ "ต่อของจริง" ด้านล่าง
    ├── fieldHelpers.js             ตัวช่วยสร้าง field UI ใช้ซ้ำ (chip / radio / text)
    ├── signaturePad.js             canvas เซ็นชื่อ (ใช้ทั้งลายเซ็นลูกค้า/ช่าง)
    ├── utils.js                    formatDate, escapeHtml, readFileAsDataUrl
    ├── data/
    │   ├── mockData.js             ★ ฐานข้อมูลจำลอง (localStorage) + seed ตัวอย่าง
    │   ├── options.js               รายการ dropdown ทั้งหมด ตรงตาม Jotform คำต่อคำ
    │   └── consentText.js           ข้อความ Consent 4 บล็อก + ตัวเลือกความเข้ม 3 แบบ (คำต่อคำ)
    └── screens/                     1 ไฟล์ต่อ 1 หน้าจอ
        ├── gate.js                  หน้า 1: รหัสผ่าน
        ├── home.js                  หน้า 2-3: ค้นหา + ผลลัพธ์
        ├── newCustomer.js           หน้า 4: ลูกค้าใหม่ (กันเบอร์ซ้ำ)
        ├── customerProfile.js       หน้า 5: ประวัติลูกค้า
        ├── serviceType.js           หน้า 6: เลือกสักคิ้ว/เติมสี
        ├── formBrow.js              หน้า 7: ฟอร์มสักคิ้ว 3 ขั้นตอน (25 ฟิลด์)
        ├── formTouchup.js           หน้า 7 (เติมสี): ร่าง DRAFT
        ├── consentSign.js           หน้า 8: Consent + เลือกความเข้ม + เซ็นลูกค้า
        ├── techFields.js            หน้า 9: รูป Before/After + ฟิลด์ช่าง + เซ็นช่าง
        └── confirmation.js          หน้า 10: ยืนยันสำเร็จ + ปุ่ม export PDF (mock)

gas/                                 ★ ใหม่ — โค้ด Apps Script (ต่อ Sheets/Drive จริง) ยังไม่ deploy
├── appsscript.json                  Manifest: สิทธิ์ spreadsheets + drive, webapp access
├── Config.gs                        ★ ต้องแก้ก่อนใช้: SHEET_ID, DRIVE_ROOT_FOLDER_ID
├── Setup.gs                         setupSpreadsheet() — รันครั้งเดียวจาก editor สร้าง 3 แท็บ+หัวคอลัมน์อัตโนมัติ
├── Code.gs                          doGet(), checkPasscode(), include() helper
├── Utils.gs                         sheetToObjects_, objectToRow_, nextId_, getConfigValue_
├── Customers.gs                     normalizePhone, searchCustomers, createCustomer, getCustomer (จริง)
├── ServiceHistory.gs                getHistoryByCustomer, saveVisit (จริง, มี LockService)
├── DriveStorage.gs                  uploadImage — สร้างโฟลเดอร์ CustomerID_ชื่อ/วันที่_ประเภทบริการ อัตโนมัติ
├── PdfExport.gs                     ยัง stub อยู่ (ไม่ใช่ขอบเขตรอบนี้)
├── Index.html                       เหมือน index.html เดิมทุกอย่าง แค่ include Stylesheet/JavaScript แทน link/script
├── Stylesheet.html                  css/style.css ห่อด้วย <style> (compile จากไฟล์เดิม)
└── JavaScript.html                  js/*.js ทั้งหมดรวมเป็นไฟล์เดียว ตัด import/export ออก
                                      + เพิ่ม "Server API bridge" แทนที่ js/mockApi.js (เรียก google.script.run จริง)
```

**หมายเหตุ**: `gas/Stylesheet.html` และ `gas/JavaScript.html` compile มาจาก `css/style.css` และ `js/*.js` ในโฟลเดอร์หลัก —
**ถ้าแก้ UI/logic ในโฟลเดอร์หลักภายหลัง ต้องรัน `python3 build-gas.py` ใหม่** (อยู่ที่ root ของ `pyne-crm-web/`) เพื่อ compile ให้ตรงกัน
ส่วน `gas/Index.html` (โครง HTML/markup ของแต่ละหน้าจอ) ดูแลแยกด้วยมือ — ถ้าเพิ่ม/ลบ/แก้ `<section class="screen">` ใน `index.html` ต้องไปแก้ `gas/Index.html` ตามด้วยตัวเอง

## ทำไปแล้ว ✅
- ครบทั้ง 10 หน้าจอตามสเปก ทำงานเป็น flow เดียวกันจริง (ค้นหา → กันซ้ำ → เลือกบริการ → กรอกฟอร์ม → เซ็น → รูป → บันทึก → ยืนยัน)
- ฟอร์ม "สักคิ้ว" มีครบทุกฟิลด์ + ตัวเลือกจาก Jotform ต้นฉบับ คำต่อคำ (ดู `js/data/options.js`)
- ข้อความ Consent ทั้ง 4 บล็อก + ตัวเลือกความเข้ม 3 แบบ + ข้อความยินยอม คัดลอกคำต่อคำจาก Jotform (ดู `js/data/consentText.js`)
- กันลูกค้าเบอร์ซ้ำ: ถ้าเบอร์ตรงกับที่มีอยู่ ระบบเตือนและมีปุ่มพาไปหน้าลูกค้าเดิมทันที (ไม่ให้สร้างซ้ำ)
- Signature pad (canvas) ใช้ได้ทั้งลายเซ็นลูกค้าและช่าง รองรับนิ้ว/ปากกาบน iPad Safari
- ถ่ายรูป Before/After ผ่าน `<input type=file capture>` (เปิดกล้องหรือเลือกจาก Photos ได้ทั้งคู่)
- Responsive/iPad-friendly, ปุ่มใหญ่กดง่าย, ธีมสีเขียวตามแบรนด์ pyne.studio
- Mock data persist ใน localStorage — รีเฟรชหน้าแล้วข้อมูลที่กรอกไปแล้วไม่หาย

## ยังไม่ได้ทำ / ต้องทำต่อ ❌
1. **Deploy/ทดสอบ `gas/` จริง** — โค้ดเขียนเสร็จแล้ว (ผ่านการตรวจ syntax ด้วย `node --check` แล้ว) แต่ยังไม่เคยรันจริงบน Apps Script เลย เพราะต้องใช้บัญชี Google ของผู้ใช้เอง (ดูหัวข้อ "ขั้นตอนที่ต้องทำเอง" ด้านล่าง) — อาจเจอบั๊กเล็ก ๆ ตอนทดสอบจริงรอบแรกได้ (เช่น สิทธิ์/permission, query syntax)
2. **Export PDF** — ยัง stub อยู่ทั้งใน mock (`js/mockApi.js`) และจริง (`gas/PdfExport.gs`) ยังไม่สร้างไฟล์ PDF จริง
3. **ฟอร์มเติมสี** — ยังเป็นร่างขั้นต่ำ (DRAFT) ตามที่ระบุใน spec รอฟิลด์ฉบับสมบูรณ์จากร้าน
4. **รหัสผ่านหน้าแรก** — mock ยัง hardcode `1234`; ฝั่งจริง (`gas/`) อ่านจากแท็บ Config ของ Sheet แล้ว (`DEFAULT_PASSCODE` ใน `Config.gs` ใช้แค่ตอน setup ครั้งแรก แก้ภายหลังได้ตรงในชีตเลย ไม่ต้อง deploy ใหม่)
5. **เฟส 2 (คิวพรุ่งนี้)** — ยังไม่เริ่ม ดู `เฟส2-คิวพรุ่งนี้-Google-Apps-Script.pdf` ในโฟลเดอร์แม่
6. ยังไม่ได้ทดสอบบน iPad Safari ของจริง (ทดสอบผ่าน headless browser เท่านั้นระหว่างพัฒนา)
7. "Other" ในตัวเลือกแบบ chip (เช่น ลักษณะรอยเก่า, ทรงที่ออกแบบ) ยังไม่มีช่องกรอกข้อความเพิ่มเติมเมื่อเลือก — เก็บแค่คำว่า "Other" ดื้อ ๆ (simplification ชั่วคราว)

## ขั้นตอนที่ต้องทำเอง เพื่อทดสอบ `gas/` จริง (ต้องใช้บัญชี Google ของคุณ)
ทำตามลำดับนี้ — ทดสอบด้วยบัญชี/ชีต/โฟลเดอร์ของตัวเองก่อนได้เลย แล้วค่อยเปลี่ยนเป็นของร้านทีหลัง (ดูข้อ 8):

1. สร้าง **Google Sheet ใหม่เปล่า ๆ** 1 ไฟล์ (ชื่ออะไรก็ได้) → คัดลอก Sheet ID จาก URL (ส่วนระหว่าง `/d/` กับ `/edit`)
2. สร้าง **โฟลเดอร์ Google Drive ใหม่** 1 โฟลเดอร์ → คัดลอก Folder ID จาก URL (ส่วนหลัง `/folders/`)
3. เปิด `gas/Config.gs` แก้ 2 บรรทัด: `SHEET_ID` และ `DRIVE_ROOT_FOLDER_ID` ใส่ค่าที่คัดลอกมา
4. ติดตั้ง clasp (ถ้ายังไม่มี): `npm install -g @google/clasp`
5. `clasp login` — ล็อกอินด้วยบัญชี Google ของคุณเอง
6. `cd gas && clasp create --type webapp --title "Pyne CRM Test"`
7. `clasp push`
8. เปิด Apps Script editor (`clasp open`) → เลือกฟังก์ชัน `setupSpreadsheet` จากช่อง dropdown บนสุด → กด Run (▶) ครั้งเดียว → จะมี popup ขอ authorize ให้กดอนุญาตตามปกติ → เช็คว่า Sheet มี 3 แท็บ + หัวคอลัมน์ขึ้นแล้ว
9. `clasp deploy` → เปิดลิงก์ `/exec` ที่ได้ → ทดสอบทั้ง flow (ดูหัวข้อ Verification ด้านล่าง)
10. **เมื่อเจ้าของร้านตกลงใช้ระบบจริง**: กลับมาแก้แค่ 2 ค่าใน `gas/Config.gs` (`SHEET_ID`, `DRIVE_ROOT_FOLDER_ID`) เป็นของบัญชีร้าน แล้ว `clasp push` + `clasp deploy` ใหม่ — ไม่ต้องแก้โค้ดไฟล์อื่นเลย

### Verification หลัง deploy
- ค้นหาลูกค้าที่ยังไม่มี → กด "ลูกค้าใหม่" → ลองกรอกเบอร์ซ้ำ → ต้องเตือน/บังคับเลือกลูกค้าเดิม (เช็คกับแถวจริงใน Sheet)
- เพิ่มประวัติครบ flow (ฟอร์ม → consent+เซ็น → รูป+ฟิลด์ช่าง → บันทึก) → เช็คว่าแถวใหม่ขึ้นใน `ServiceHistory` และไฟล์รูป/ลายเซ็นไปอยู่ใน Drive folder ที่ถูกต้อง (`CustomerID_ชื่อ/วันที่_ประเภทบริการ/`)
- กดปุ่มบันทึกซ้ำเร็ว ๆ (double-submit) → ต้องไม่เกิดแถวซ้ำ (`LockService` ใน `ServiceHistory.gs`)

## หมายเหตุสำหรับใครมาทำต่อ
- โค้ดหลัก (`index.html`/`js/`/`css/`) เป็น vanilla JS (ES modules) ไม่มี framework/build step ไม่ต้อง `npm install` ก่อนรัน
- ชั้น `js/mockApi.js` (mock, localStorage) และ "Server API bridge" ใน `gas/JavaScript.html` (จริง, google.script.run) มีฟังก์ชันชื่อ/พารามิเตอร์เดียวกันทุกตัว — หน้าจอ (`js/screens/*.js`) เขียนครั้งเดียวใช้ได้กับทั้งสองฝั่งโดยไม่ต้องแก้อะไรเลย เพราะเรียกผ่านชั้นนี้เป็นตัวกลางเสมอ
- `gas/JavaScript.html` และ `gas/Stylesheet.html` เป็นไฟล์ **compiled** (ห้ามแก้ตรง ๆ) — แก้ที่ `js/*.js`/`css/style.css` ต้นทางแล้วรัน `python3 build-gas.py` ใหม่เสมอ (ดูหัวข้อโครงสร้างไฟล์ด้านบน)
- `state.visitDraft` ต้อง**ล้างค่าด้วย `state.resetVisitDraft()` เท่านั้น** ห้าม reassign เป็น `{}` ใหม่ เพราะหน้าจอฟอร์มผูก event listener กับ reference เดิมไว้ตอน init (ดูคอมเมนต์ใน `state.js`)
- `gas/Utils.gs`, `gas/Setup.gs` ใช้ `CUSTOMERS_HEADERS`/`SERVICE_HISTORY_HEADERS`/`CONFIG_HEADERS`/`SHEET_NAMES` เป็น global consts ร่วมกัน (Apps Script รวมทุกไฟล์ .gs เป็น scope เดียวกันอัตโนมัติ ไม่ต้อง import)
