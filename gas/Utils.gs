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
  const displayValues = sheet.getDataRange().getDisplayValues();
  const headers = values[0].map((h) => String(h || "").trim());
  const rows = values.slice(1);
  return rows
    .map((row, i) => {
      const obj = { _rowIndex: i + 2 }; // แถวจริงใน sheet (1-based, +1 สำหรับ header)
      headers.forEach((h, colIdx) => {
        const displayValue = displayValues[i + 1] ? displayValues[i + 1][colIdx] : "";
        const shouldUseDisplay = ["PhoneNormalized", "PhoneNormalize", "PhoneDisplay"].indexOf(h) >= 0;
        obj[h] = shouldUseDisplay ? String(displayValue || row[colIdx] || "") : row[colIdx];
      });
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

// ==== Session helpers (login) ====
// เก็บ session token "ปัจจุบัน" ไว้ที่เดียวใน Script Properties แอปนี้มี admin คนเดียว จึงรองรับแค่
// 1 session ที่ active พร้อมกัน — login เครื่องใหม่จะเขียนทับ token เก่า ทำให้เครื่องเดิม logout อัตโนมัติ
function getSessionToken_() {
  return PropertiesService.getScriptProperties().getProperty("SESSION_TOKEN");
}

function setSessionToken_(token) {
  PropertiesService.getScriptProperties().setProperty("SESSION_TOKEN", token);
}

function clearSessionToken_() {
  PropertiesService.getScriptProperties().deleteProperty("SESSION_TOKEN");
}

// เรียกที่ต้นทุกฟังก์ชันที่ต้อง login ก่อนถึงจะใช้ได้ — โยน error กลับไปให้ client ผ่าน
// google.script.run .withFailureHandler ถ้า token ไม่มี/ไม่ตรงกับ session ที่ active อยู่จริง
// กันไม่ให้ใครเปิด console เรียก google.script.run ข้ามหน้า login ไปยิงข้อมูลตรงๆ ได้
function requireSession_(token) {
  const stored = getSessionToken_();
  if (!stored || !token || String(token) !== String(stored)) {
    throw new Error("UNAUTHORIZED");
  }
}

// ==== Password hashing ====
// ไม่เก็บรหัสผ่านตัวเต็มในแท็บ Config เลย — เก็บแค่ salted SHA-256 hash (PASSWORD_HASH + PASSWORD_SALT)
// ใครก็ตามที่เปิดดู/แชร์ Sheet ได้ (ซึ่งมักจะเป็นกลุ่มกว้างกว่าคนที่แก้โค้ดได้) จะไม่เห็นรหัสผ่านจริง
function generateSalt_() {
  return Utilities.getUuid();
}

function hashPassword_(password, salt) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(password) + String(salt));
  return bytes.map((b) => ((b < 0 ? b + 256 : b).toString(16).padStart(2, "0"))).join("");
}
