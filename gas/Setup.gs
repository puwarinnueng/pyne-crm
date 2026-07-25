/**
 * Setup.gs — รันครั้งเดียวจาก Apps Script editor (เลือกฟังก์ชัน setupSpreadsheet แล้วกด Run)
 * เพื่อสร้าง 3 แท็บ + หัวคอลัมน์ในชีตที่ตั้งไว้ใน Config.gs (SHEET_ID) ให้อัตโนมัติ
 * รันซ้ำได้อย่างปลอดภัย — ถ้าแท็บ/หัวคอลัมน์มีอยู่แล้วจะไม่สร้างซ้ำหรือลบข้อมูลเดิม
 */

const CUSTOMERS_HEADERS = [
  "CustomerID", "Name", "PhoneNormalized", "PhoneDisplay", "Line", "Note", "CreatedAt"
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

  ensureSheetWithHeaders_(ss, SHEET_NAMES.CUSTOMERS, CUSTOMERS_HEADERS);
  ensureSheetWithHeaders_(ss, SHEET_NAMES.SERVICE_HISTORY, SERVICE_HISTORY_HEADERS);
  const configSheet = ensureSheetWithHeaders_(ss, SHEET_NAMES.CONFIG, CONFIG_HEADERS);

  ensureConfigRow_(configSheet, "PASSCODE", DEFAULT_PASSCODE);

  Logger.log("ตั้งค่า Sheet เรียบร้อย: " + ss.getUrl());
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
