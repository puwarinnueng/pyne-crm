/**
 * Setup.gs — รันครั้งเดียวจาก Apps Script editor (เลือกฟังก์ชัน setupSpreadsheet แล้วกด Run)
 * เพื่อสร้าง 3 แท็บ + หัวคอลัมน์ในชีตที่ตั้งไว้ใน Config.gs (SHEET_ID) ให้อัตโนมัติ
 * รันซ้ำได้อย่างปลอดภัย — ถ้าแท็บ/หัวคอลัมน์มีอยู่แล้วจะไม่สร้างซ้ำหรือลบข้อมูลเดิม
 */

const CUSTOMERS_HEADERS = [
  "CustomerID", "FullName", "Nickname", "DOB", "PhoneNormalized", "PhoneDisplay", "Line",
  "SkinProfileJson", "ProfileConfirmedAt", "CreatedAt"
];

const SERVICE_HISTORY_HEADERS = [
  "ServiceID", "CustomerID", "ZervaBookingId", "VisitDate", "TimeSlot", "Status",
  "ServiceType", "FormType",
  "Technique", "ColorUsed", "Intensity", "Muscle", "ShapeDesign", "BrowGuard",
  "Satisfaction", "ColorRetention", "WantsMoreChange", "ChangeItemsJson",
  "MixRatio", "Redness", "Adherence",
  "Analysis", "Note", "NotServedReason",
  "BeforePhotoUrl", "AfterPhotoUrl", "SignatureCustomerUrl", "SignatureTechUrl",
  "CalendarEventId",
  "RawAnswersJson", "CreatedAt", "UpdatedAt"
];

const CONFIG_HEADERS = ["Key", "Value"];

function setupSpreadsheet() {
  const ss = getSpreadsheet_();

  const customersSheet = ensureSheetWithHeaders_(ss, SHEET_NAMES.CUSTOMERS, CUSTOMERS_HEADERS);
  ensureSheetWithHeaders_(ss, SHEET_NAMES.SERVICE_HISTORY, SERVICE_HISTORY_HEADERS);
  const configSheet = ensureSheetWithHeaders_(ss, SHEET_NAMES.CONFIG, CONFIG_HEADERS);

  ensureConfigRow_(configSheet, "PASSCODE", DEFAULT_PASSCODE);

  // สำคัญ: บังคับคอลัมน์เบอร์โทรเป็น Plain text ทั้งคอลัมน์ ป้องกัน Sheets แปลงเป็นตัวเลข
  // แล้วตัดเลข 0 นำหน้าทิ้ง (เช่น 0850373790 -> 850373790) — รันซ้ำได้ปลอดภัย
  forceColumnPlainText_(customersSheet, CUSTOMERS_HEADERS, "PhoneNormalized");
  forceColumnPlainText_(customersSheet, CUSTOMERS_HEADERS, "PhoneDisplay");

  Logger.log("ตั้งค่า Sheet เรียบร้อย: " + ss.getUrl());
}

/**
 * migrateToV2Schema_ClearsAllData — รันครั้งเดียวจาก Apps Script editor (เลือกฟังก์ชันนี้แล้วกด Run)
 * เมื่ออัปเกรดจาก schema เดิม (Name/Line เดี่ยว ๆ) มาเป็น schema ใหม่ (FullName/Nickname/DOB/
 * ประวัติผิวคิ้ว/Visit มี Zerva+เวลานัด+สถานะ+ฟิลด์ Form 1/2/3 ครบ) — ตัวคอลัมน์ (CUSTOMERS_HEADERS /
 * SERVICE_HISTORY_HEADERS) เปลี่ยนไปเยอะจนต่อคอลัมน์เดิมไม่ได้ตรง ๆ
 *
 * !! ฟังก์ชันนี้ล้างข้อมูลทุกแถวในแท็บ Customers และ ServiceHistory ทิ้งทั้งหมด (เก็บแท็บ Config ไว้
 * เหมือนเดิม ไม่แตะรหัสผ่าน) แล้วเขียนหัวคอลัมน์ชุดใหม่ทับ !!
 * ใช้เฉพาะตอน Sheet ยังเป็นข้อมูลทดสอบ/ว่างอยู่เท่านั้น ถ้ามีข้อมูลลูกค้าจริงแล้วห้ามรันฟังก์ชันนี้
 * (ต้องเขียนสคริปต์ย้ายข้อมูลคอลัมน์ต่อคอลัมน์แทน)
 */
function migrateToV2Schema_ClearsAllData() {
  const ss = getSpreadsheet_();

  [SHEET_NAMES.CUSTOMERS, SHEET_NAMES.SERVICE_HISTORY].forEach((name) => {
    const sheet = ss.getSheetByName(name);
    if (sheet) sheet.clear();
  });

  const customersSheet = ensureSheetWithHeaders_(ss, SHEET_NAMES.CUSTOMERS, CUSTOMERS_HEADERS);
  ensureSheetWithHeaders_(ss, SHEET_NAMES.SERVICE_HISTORY, SERVICE_HISTORY_HEADERS);

  forceColumnPlainText_(customersSheet, CUSTOMERS_HEADERS, "PhoneNormalized");
  forceColumnPlainText_(customersSheet, CUSTOMERS_HEADERS, "PhoneDisplay");

  Logger.log("ล้างข้อมูลเดิมและตั้งหัวคอลัมน์ schema ใหม่เรียบร้อย: " + ss.getUrl());
}

/**
 * fixCustomerPhoneLeadingZero — รันครั้งเดียวจาก Apps Script editor (เลือกฟังก์ชันนี้แล้วกด Run)
 * ซ่อมเบอร์โทรที่ Sheets เคย auto-detect เป็นตัวเลขแล้วตัดเลข 0 นำหน้าทิ้งไปแล้ว (เช่น 0850373790
 * กลายเป็น 850373790) เกิดจาก sheet.appendRow() มองข้าม number format "@" ที่ตั้งไว้ล่วงหน้า
 * (แก้ที่ต้นเหตุใน createCustomer() แล้ว แต่ข้อมูลเก่าที่เพี้ยนไปแล้วต้องรันฟังก์ชันนี้ซ่อมย้อนหลัง)
 * รันซ้ำได้อย่างปลอดภัย — แถวที่ถูกต้องอยู่แล้วจะไม่ถูกแตะ
 */
function fixCustomerPhoneLeadingZero() {
  const sheet = getCustomersSheet_();
  forceColumnPlainText_(sheet, CUSTOMERS_HEADERS, "PhoneNormalized");
  forceColumnPlainText_(sheet, CUSTOMERS_HEADERS, "PhoneDisplay");

  const rows = sheetToObjects_(sheet);
  const normCol = CUSTOMERS_HEADERS.indexOf("PhoneNormalized") + 1;
  const dispCol = CUSTOMERS_HEADERS.indexOf("PhoneDisplay") + 1;
  let fixedCount = 0;

  rows.forEach((row) => {
    [["PhoneNormalized", normCol], ["PhoneDisplay", dispCol]].forEach(([key, col]) => {
      const raw = row[key];
      if (raw === "" || raw === null || raw === undefined) return;
      const digits = String(raw).replace(/[^\d]/g, "");
      // เบอร์มือถือไทยเต็มรูปแบบมี 10 หลักและขึ้นต้นด้วย 0 — ถ้าเหลือ 9 หลักและไม่ขึ้นต้นด้วย 0
      // แปลว่าเลข 0 นำหน้าหายไปแล้ว (ไม่ว่าจะถูกเก็บเป็นตัวเลขหรือ string 9 หลัก)
      if (digits.length === 9 && digits[0] !== "0") {
        sheet.getRange(row._rowIndex, col).setNumberFormat("@").setValue("0" + digits);
        fixedCount++;
      }
    });
  });

  Logger.log("ซ่อมเบอร์โทรที่ขาดเลข 0 นำหน้าแล้ว: " + fixedCount + " ค่า");
}

function forceColumnPlainText_(sheet, headers, columnName) {
  const colIndex = headers.indexOf(columnName) + 1; // 1-based
  if (colIndex <= 0) return;
  sheet.getRange(1, colIndex, sheet.getMaxRows(), 1).setNumberFormat("@");
}

function ensureSheetWithHeaders_(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  const firstRow = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  const hasHeaders = firstRow.some((v) => v !== "");
  if (!hasHeaders) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function ensureConfigRow_(configSheet, key, defaultValue) {
  const data = configSheet.getDataRange().getValues();
  const exists = data.some((row) => row[0] === key);
  if (!exists) {
    configSheet.appendRow([key, defaultValue]);
  }
}
