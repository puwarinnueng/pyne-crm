/**
 * Setup.gs — รันครั้งเดียวจาก Apps Script editor (เลือกฟังก์ชัน setupSpreadsheet แล้วกด Run)
 * เพื่อล้างข้อมูลเดิมทั้งหมดในชีตที่ตั้งไว้ใน Config.gs (SHEET_ID) แล้วสร้าง 3 แท็บ
 * (Customers, ServiceHistory, Config) พร้อมหัวคอลัมน์ชุดล่าสุดขึ้นมาใหม่ทั้งหมด
 *
 * !! ล้างข้อมูลทุกแถวในทั้ง 3 แท็บทิ้งก่อนสร้างใหม่เสมอ (รวม Config — Username/Password/Passcode
 * จะถูกรีเซ็ตกลับเป็นค่า default ใน Config.gs ด้วย) ใช้เฉพาะตอนต้องการเริ่มต้น Sheet ใหม่ทั้งหมด
 * ถ้ามีข้อมูลลูกค้าจริงอยู่แล้วห้ามรัน !!
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
  "ConsentAgreedAt",
  "CalendarEventId",
  "RawAnswersJson", "CreatedAt", "UpdatedAt"
];

const CONFIG_HEADERS = ["Key", "Value"];

function setupSpreadsheet() {
  const ss = getSpreadsheet_();

  const customersSheet = resetSheetWithHeaders_(ss, SHEET_NAMES.CUSTOMERS, CUSTOMERS_HEADERS);
  resetSheetWithHeaders_(ss, SHEET_NAMES.SERVICE_HISTORY, SERVICE_HISTORY_HEADERS);
  const configSheet = resetSheetWithHeaders_(ss, SHEET_NAMES.CONFIG, CONFIG_HEADERS);

  configSheet.appendRow(["PASSCODE", DEFAULT_PASSCODE]);
  configSheet.appendRow(["USERNAME", DEFAULT_USERNAME]);
  configSheet.appendRow(["PASSWORD", DEFAULT_PASSWORD]);

  // บังคับคอลัมน์เบอร์โทรเป็น Plain text ทั้งคอลัมน์ตั้งแต่ก่อนมีข้อมูลใด ๆ ป้องกัน Sheets แปลงเป็น
  // ตัวเลขแล้วตัดเลข 0 นำหน้าทิ้ง (เช่น 0850373790 -> 850373790)
  forceColumnPlainText_(customersSheet, CUSTOMERS_HEADERS, "PhoneNormalized");
  forceColumnPlainText_(customersSheet, CUSTOMERS_HEADERS, "PhoneDisplay");

  Logger.log("ล้างข้อมูลเดิมและตั้งค่า Sheet ใหม่ทั้งหมดเรียบร้อย: " + ss.getUrl());
}

function resetSheetWithHeaders_(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (sheet) {
    sheet.clear();
  } else {
    sheet = ss.insertSheet(name);
  }
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.setFrozenRows(1);
  return sheet;
}

function forceColumnPlainText_(sheet, headers, columnName) {
  const colIndex = headers.indexOf(columnName) + 1; // 1-based
  if (colIndex <= 0) return;
  sheet.getRange(1, colIndex, sheet.getMaxRows(), 1).setNumberFormat("@");
}
