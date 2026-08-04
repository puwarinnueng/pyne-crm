/**
 * Utils.gs — ฟังก์ชันช่วยเหลือที่ใช้ร่วมกันหลายไฟล์
 */

function getConfigValue_(key) {
  const sheet = getSpreadsheet_().getSheetByName(SHEET_NAMES.CONFIG);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === key) return data[i][1];
  }
  return null;
}

// เขียนค่าใหม่ทับแถวที่มี key ตรงกันในแท็บ Config ถ้ายังไม่มี key นี้จะเพิ่มแถวใหม่ให้
function setConfigValue_(key, value) {
  const sheet = getSpreadsheet_().getSheetByName(SHEET_NAMES.CONFIG);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === key) {
      sheet.getRange(i + 1, 2).setValue(value);
      return;
    }
  }
  sheet.appendRow([key, value]);
}

// อ่านทั้งชีตเป็น array ของ object (ใช้ header แถวแรกเป็น key) — สะดวกกว่าไล่ index คอลัมน์เอง
function sheetToObjects_(sheet) {
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const rows = values.slice(1);
  return rows
    .map((row, i) => {
      const obj = { _rowIndex: i + 2 }; // แถวจริงใน sheet (1-based, +1 สำหรับ header)
      headers.forEach((h, colIdx) => { obj[h] = row[colIdx]; });
      return obj;
    })
    .filter((obj) => obj[headers[0]] !== ""); // ข้ามแถวว่าง
}

function objectToRow_(obj, headers) {
  return headers.map((h) => (obj[h] === undefined || obj[h] === null ? "" : obj[h]));
}

function nextId_(sheet, prefix, padLength) {
  const lastRow = sheet.getLastRow();
  const count = lastRow <= 1 ? 0 : lastRow - 1;
  return prefix + String(count + 1).padStart(padLength, "0");
}
