/**
 * Setup.gs — รันครั้งเดียวจาก Apps Script editor (เลือกฟังก์ชัน setupSpreadsheet แล้วกด Run)
 * เพื่อสร้าง 3 แท็บ + หัวคอลัมน์ในชีตที่ตั้งไว้ใน Config.gs (SHEET_ID) ให้อัตโนมัติ
 * รันซ้ำได้อย่างปลอดภัย — ถ้าแท็บ/หัวคอลัมน์มีอยู่แล้วจะไม่สร้างซ้ำหรือลบข้อมูลเดิม
 */

const CUSTOMERS_HEADERS = [
  "CustomerID", "Name", "PhoneNormalized", "PhoneDisplay", "Line", "CreatedAt"
];

const SERVICE_HISTORY_HEADERS = [
  "ServiceID", "CustomerID", "VisitDate", "ServiceType",
  "Technique", "ColorUsed", "Intensity", "Muscle", "ShapeDesign", "BrowGuard",
  "Analysis", "Note",
  "BeforePhotoUrl", "AfterPhotoUrl", "SignatureCustomerUrl", "SignatureTechUrl",
  "ZervaBookingId", "CalendarEventId",
  "RawAnswersJson", "CreatedAt"
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
