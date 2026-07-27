/**
 * Customers.gs — ค้นหา/สร้างลูกค้า ในแท็บ Customers
 */

function normalizePhone(phone) {
  if (!phone) return "";
  let p = String(phone).replace(/[^\d+]/g, "");
  if (p.indexOf("+66") === 0) p = "0" + p.slice(3);
  else if (p.indexOf("66") === 0 && p.length > 9) p = "0" + p.slice(2);
  return p;
}

function getCustomersSheet_() {
  return getSpreadsheet_().getSheetByName(SHEET_NAMES.CUSTOMERS);
}

function rowToCustomer_(row) {
  return {
    customerId: row.CustomerID,
    name: row.Name,
    phoneNormalized: row.PhoneNormalized,
    phoneDisplay: row.PhoneDisplay,
    line: row.Line,
    createdAt: row.CreatedAt
  };
}

function searchCustomers(query) {
  const q = (query || "").trim().toLowerCase();
  if (!q) return [];
  const qPhone = normalizePhone(query);
  const rows = sheetToObjects_(getCustomersSheet_());

  return rows
    .filter((row) => {
      const nameHit = String(row.Name || "").toLowerCase().indexOf(q) >= 0;
      const lineHit = String(row.Line || "").toLowerCase().indexOf(q) >= 0;
      const phoneHit = qPhone.length >= 3 && String(row.PhoneNormalized || "").indexOf(qPhone) >= 0;
      return nameHit || lineHit || phoneHit;
    })
    .map(rowToCustomer_);
}

function listRecentCustomers(limit) {
  const rows = sheetToObjects_(getCustomersSheet_());
  return rows
    .sort((a, b) => (b.CreatedAt || 0) - (a.CreatedAt || 0))
    .slice(0, limit || 10)
    .map(rowToCustomer_);
}

function getCustomer(customerId) {
  const rows = sheetToObjects_(getCustomersSheet_());
  const row = rows.find((r) => r.CustomerID === customerId);
  return row ? rowToCustomer_(row) : null;
}

function findCustomerByPhone(phone) {
  const normalized = normalizePhone(phone);
  const rows = sheetToObjects_(getCustomersSheet_());
  const existing = rows.find((r) => r.PhoneNormalized === normalized);
  return existing ? rowToCustomer_(existing) : null;
}

function createCustomer(data) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getCustomersSheet_();
    const normalized = normalizePhone(data.phone);
    const rows = sheetToObjects_(sheet);
    const existing = rows.find((r) => r.PhoneNormalized === normalized);
    if (existing) {
      return { success: false, error: "duplicate", existing: rowToCustomer_(existing) };
    }

    const customerId = nextId_(sheet, "C", 4);
    const createdAt = Date.now();
    const record = {
      CustomerID: customerId,
      Name: data.name,
      PhoneNormalized: normalized,
      PhoneDisplay: data.phone,
      Line: data.line || "",
      CreatedAt: createdAt
    };

    // ห้ามใช้ sheet.appendRow(...) ตรงๆ สำหรับคอลัมน์เบอร์โทร — พบว่า appendRow มองข้าม
    // number format "@" (plain text) ที่ตั้งไว้ล่วงหน้าที่คอลัมน์ แล้ว auto-detect ค่าที่หน้าตาเป็นตัวเลข
    // (เช่น "0850373790") เป็นตัวเลขจริง ตัดเลข 0 นำหน้าทิ้ง (เหลือ 850373790) ต้อง setNumberFormat("@")
    // ที่ cell นั้นตรงๆ ตอนเขียนค่า เพื่อบังคับให้เป็น text แน่นอนไม่ว่า format คอลัมน์ล่วงหน้าจะติดหรือไม่
    const newRow = sheet.getLastRow() + 1;
    sheet.getRange(newRow, 1, 1, CUSTOMERS_HEADERS.length).setValues([objectToRow_(record, CUSTOMERS_HEADERS)]);
    const phoneNormCol = CUSTOMERS_HEADERS.indexOf("PhoneNormalized") + 1;
    const phoneDispCol = CUSTOMERS_HEADERS.indexOf("PhoneDisplay") + 1;
    sheet.getRange(newRow, phoneNormCol).setNumberFormat("@").setValue(record.PhoneNormalized);
    sheet.getRange(newRow, phoneDispCol).setNumberFormat("@").setValue(record.PhoneDisplay);

    return {
      success: true,
      customer: {
        customerId,
        name: data.name,
        phoneNormalized: normalized,
        phoneDisplay: data.phone,
        line: data.line || "",
        createdAt
      }
    };
  } finally {
    lock.releaseLock();
  }
}
