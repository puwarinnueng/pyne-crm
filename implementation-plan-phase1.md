# Implementation Plan — เฟส 1: ระบบ CRM หลัก (Google Apps Script)

อ้างอิงสเปกละเอียดจาก `สรุปงานแบบละเอียด-Google-Apps-Script.pdf` — ไฟล์นี้คือเช็คลิสต์การลงมือสร้างจริง เรียงตามลำดับที่ควรทำ

## 0. Setup (ทำครั้งเดียว)
- [ ] เจ้าของร้านเปิดใช้งาน Apps Script API ที่บัญชี Google ของร้าน (script.google.com/home/usersettings)
- [ ] เจ้าของร้านรัน `clasp login` ด้วยบัญชี Google ของร้าน
- [ ] สร้าง Google Sheet ใหม่เป็นฐานข้อมูล (หรือใช้ไฟล์ที่ร้านเตรียมไว้) แล้วสร้าง 3 แท็บ: `Customers`, `ServiceHistory`, `Config` พร้อมหัวคอลัมน์ตามสเปก
- [ ] สร้างโฟลเดอร์ Google Drive หลัก `Pyne Studio CRM` พร้อมโฟลเดอร์ย่อย `_exports`
- [ ] `clasp create --type webapp --title "Pyne CRM"` ผูกกับ Sheet ข้างบน
- [ ] ตั้งค่า `Config` sheet: ใส่ค่า `PASSCODE` เริ่มต้น + รายการ dropdown ทั้งหมด (คัดลอกจากสเปกหัวข้อ Config)

## 1. Backend — สร้างตามลำดับนี้
1. `appsscript.json` — เพิ่มสิทธิ์ `https://www.googleapis.com/auth/spreadsheets`, `.../drive`, ตั้ง `webapp.access: ANYONE`, `executeAs: USER_DEPLOYING`
2. `Code.gs`
   - `doGet(e)` → เสิร์ฟ `Index.html`
   - `checkPasscode(pin)` → เทียบกับ `Config.PASSCODE`
3. `Customers.gs`
   - `normalizePhone(phone)` → ตัดช่องว่าง/ขีด, แปลง `+66`/`66` นำหน้าให้เป็น `0` มาตรฐานเดียว
   - `searchCustomers(query)` → ค้นจากชื่อ/เบอร์(normalize)/ชื่อ LINE แบบ partial match
   - `createCustomer(data)` → เช็ค `normalizePhone` ซ้ำก่อนเสมอ ถ้าซ้ำคืน error พร้อม CustomerID เดิม
4. `ServiceHistory.gs`
   - `getHistoryByCustomer(customerId)` → คืนทุกแถวของลูกค้าคนนั้น เรียงล่าสุดก่อน
   - `saveVisit(payload)` → `LockService.getScriptLock()` ก่อนเขียน, append แถวใหม่, ปลดล็อกใน `finally`
5. `DriveStorage.gs`
   - `uploadImage(base64, customerId, visitFolderName, filename)` → สร้างโฟลเดอร์ตาม convention `CustomerID_ชื่อเล่น/วันที่_ประเภทบริการ/` ถ้ายังไม่มี แล้วคืน fileUrl
6. `PdfExport.gs`
   - `exportConsentPdf(serviceId)` → ดึงข้อมูลจาก ServiceHistory + ConsentText.html มา render แล้ว export เป็น PDF เก็บใน `_exports`

## 2. Frontend — สร้างตามลำดับนี้ (แต่ละไฟล์ = 1 หน้าจอ ตามสเปกข้อ 1)
1. `Index.html` — shell หลัก + CSS ร่วม + passcode gate (หน้าจอ 1)
2. `Search.html` — ช่องค้นหา + ปุ่มลูกค้าใหม่ + แสดงผลลัพธ์ (หน้าจอ 2-3)
3. `NewCustomer.html` — ฟอร์มลูกค้าใหม่ + เรียก `createCustomer`, โชว์ error เบอร์ซ้ำแบบ real-time (หน้าจอ 4)
4. `CustomerProfile.html` — โชว์ `getHistoryByCustomer` + ปุ่มเพิ่มประวัติใหม่ (หน้าจอ 5)
5. `ServiceTypeSelect.html` — เลือกสักคิ้ว/เติมสี (หน้าจอ 6)
6. `FormBrow.html` — ฟอร์มหลายขั้นตอน 25 ฟิลด์ตรงตาม Jotform (หน้าจอ 7) — แบ่ง step ตามกลุ่มในสเปก (ประวัติ → ลักษณะคิ้ว/ผิว → เป้าหมาย → consent)
7. `ConsentText.html` — เนื้อหา consent คำต่อคำ (แยกไฟล์ต่างหาก แก้ได้อิสระ)
8. `Signature.html` — canvas signature pad (ใช้ซ้ำได้ทั้งลูกค้า/ช่าง) (หน้าจอ 8)
9. `PhotoCapture.html` — `<input type=file accept=image/* capture>` x2 (before/after) (หน้าจอ 9)
10. `Confirmation.html` — แสดงผลสำเร็จ + ปุ่ม Export PDF (หน้าจอ 10)

## 3. เชื่อมหน้าจอเข้าด้วยกัน
- [ ] ใช้ `google.script.run` เรียก backend จากทุกหน้า พร้อม loading state
- [ ] เก็บ state ระหว่างหน้า (CustomerID ที่เลือก, คำตอบฟอร์มที่กรอกแล้ว) ด้วย JS object ฝั่ง client ก่อน submit จริงตอนจบ flow

## 4. ทดสอบก่อนส่งมอบ
- [ ] สร้างลูกค้าเบอร์ซ้ำ → ต้องเตือนและบังคับเลือกลูกค้าเดิม
- [ ] กดบันทึกฟอร์มรัว ๆ (double-submit) → ต้องไม่เกิดแถวซ้ำ (LockService ทำงาน)
- [ ] อัปโหลดรูป → เช็กว่าไฟล์ไปอยู่ในโฟลเดอร์ Drive ที่ถูกต้อง และลิงก์ถูกบันทึกใน Sheet
- [ ] เซ็นชื่อทั้งลูกค้าและช่างแล้วดูว่าไฟล์ภาพลายเซ็นถูกต้อง
- [ ] Export PDF → ฟอนต์ไทยแสดงถูกต้อง ไม่ตัดคำ
- [ ] ทดสอบทั้ง flow บน iPad Safari จริง (ไม่ใช่แค่ browser บนคอม)

## 5. Deploy
- [ ] `clasp push`
- [ ] `clasp deploy --description "v1"` (Execute as: Me, Access: Anyone with the link)
- [ ] เปิดลิงก์ `/exec` บน iPad → Add to Home Screen
- [ ] ส่งมอบลิงก์ + รหัสผ่านให้เจ้าของร้าน

## ยังรอก่อนเริ่มได้เต็มที่
- ฟิลด์ฟอร์ม "เติมสี" ฉบับสมบูรณ์ (ตอนนี้ยังใช้ร่างเบื้องต้นจากสเปก)
- บัญชี Google ของร้านสำหรับ `clasp login`
- รหัสผ่านหน้าแรกที่ต้องการใช้จริง
