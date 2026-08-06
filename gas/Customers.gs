/**
 * Customers.gs — ค้นหา/สร้างลูกค้า + ประวัติผิวและคิ้ว ในแท็บ Customers
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

function parseSkinProfile_(json) {
  if (!json) return { skinType: null, hairLook: null, hairDensity: null, browShape: [], muscle: null, muscleNote: "", muscleEvaluatedAt: null };
  try {
    return JSON.parse(json);
  } catch (e) {
    return { skinType: null, hairLook: null, hairDensity: null, browShape: [], muscle: null, muscleNote: "", muscleEvaluatedAt: null };
  }
}

function customerPhoneNormalized_(row) {
  return String(row.PhoneNormalized || row.PhoneNormalize || "");
}

function phoneMatches_(storedPhone, queryPhone) {
  const stored = normalizePhone(storedPhone);
  const query = normalizePhone(queryPhone);
  if (!stored || !query || query.length < 3) return false;
  if (stored.indexOf(query) >= 0) return true;

  // Google Sheets can return phone-looking text as a Number when the cell was not stored as plain text,
  // which strips the leading 0 from Thai mobile numbers. Compare digit-only variants without leading
  // zeroes so 850373790 still matches a user search for 0850373790.
  const storedDigits = String(stored).replace(/\D/g, "");
  const queryDigits = String(query).replace(/\D/g, "");
  const storedNoLead = storedDigits.replace(/^0+/, "");
  const queryNoLead = queryDigits.replace(/^0+/, "");
  return (
    storedDigits.indexOf(queryDigits) >= 0 ||
    queryDigits.indexOf(storedDigits) >= 0 ||
    storedNoLead.indexOf(queryNoLead) >= 0 ||
    queryNoLead.indexOf(storedNoLead) >= 0
  );
}

function debugCustomerSearch(token, query) {
  requireSession_(token);
  const sheet = getCustomersSheet_();
  const values = sheet.getDataRange().getValues();
  const displayValues = sheet.getDataRange().getDisplayValues();
  const headers = (displayValues[0] || values[0] || []).map((h) => String(h || "").trim());
  const rows = sheetToObjects_(sheet);
  const qPhone = normalizePhone(query);
  const sample = rows.slice(0, 3).map((row, idx) => {
    const displayRow = displayValues[idx + 1] || [];
    const phoneNormalized = customerPhoneNormalized_(row);
    const phoneDisplay = row.PhoneDisplay;
    return {
      rowIndex: row._rowIndex,
      customerId: row.CustomerID || "",
      phoneNormalized: phoneNormalized,
      phoneDisplay: phoneDisplay || "",
      displayPhoneNormalized: displayRow[headers.indexOf("PhoneNormalized")] || "",
      displayPhoneDisplay: displayRow[headers.indexOf("PhoneDisplay")] || "",
      normalizedMatch: phoneMatches_(phoneNormalized, qPhone),
      displayMatch: displayRow.some((cell) => phoneMatches_(cell, qPhone))
    };
  });
  return {
    query: query,
    qPhone: qPhone,
    sheetName: sheet.getName(),
    lastRow: sheet.getLastRow(),
    headers: headers,
    rowCount: rows.length,
    sample: sample
  };
}

function customerDobForClient_(value) {
  if (!value) return null;
  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  return String(value);
}

function rowToCustomer_(row) {
  return {
    customerId: String(row.CustomerID || ""),
    fullName: String(row.FullName || ""),
    nickname: String(row.Nickname || ""),
    dob: customerDobForClient_(row.DOB),
    phoneNormalized: customerPhoneNormalized_(row),
    phoneDisplay: String(row.PhoneDisplay || ""),
    line: String(row.Line || ""),
    skinProfile: parseSkinProfile_(row.SkinProfileJson),
    profileConfirmedAt: row.ProfileConfirmedAt || null,
    createdAt: row.CreatedAt
  };
}

function searchCustomers(token, query) {
  requireSession_(token);
  const q = (query || "").trim().toLowerCase();
  if (!q) return [];
  const qPhone = normalizePhone(query);
  const sheet = getCustomersSheet_();
  const rows = sheetToObjects_(sheet);
  const displayValues = sheet.getDataRange().getDisplayValues();

  return rows
    .filter((row, idx) => {
      const nameHit = (String(row.FullName || "") + " " + String(row.Nickname || "")).toLowerCase().indexOf(q) >= 0;
      const lineHit = String(row.Line || "").toLowerCase().indexOf(q) >= 0;
      const phoneHit = phoneMatches_(customerPhoneNormalized_(row), qPhone) || phoneMatches_(row.PhoneDisplay, qPhone);
      const displayRow = displayValues[idx + 1] || [];
      const displayPhoneHit = qPhone.length >= 3 && displayRow.some((cell) => phoneMatches_(cell, qPhone));
      return nameHit || lineHit || phoneHit || displayPhoneHit;
    })
    .map(rowToCustomer_);
}

function visitActivityTime_(visit) {
  return Number(visit.updatedAt || visit.createdAt || visit.visitDate) || 0;
}

function listRecentCustomers(token, limit) {
  requireSession_(token);
  const max = limit || 10;
  const customers = sheetToObjects_(getCustomersSheet_()).map(rowToCustomer_);
  const history = sheetToObjects_(getServiceHistorySheet_()).map(rowToVisit_);
  const statsByCustomerId = {};

  history.forEach((visit) => {
    const customerId = visit.customerId;
    if (!customerId) return;
    const current = statsByCustomerId[customerId] || {
      visitsCount: 0,
      lastVisit: null,
      lastActivityAt: 0
    };
    const activityAt = visitActivityTime_(visit);
    current.visitsCount += 1;
    if (!current.lastVisit || activityAt > current.lastActivityAt) {
      current.lastVisit = visit;
      current.lastActivityAt = activityAt;
    }
    statsByCustomerId[customerId] = current;
  });

  return customers
    .map((c) => {
      const stats = statsByCustomerId[c.customerId] || null;
      const lastVisit = stats && stats.lastVisit ? stats.lastVisit : null;
      return Object.assign({}, c, {
        visitsCount: stats ? stats.visitsCount : 0,
        lastVisitDate: lastVisit ? lastVisit.visitDate : null,
        lastTechnique: lastVisit ? (lastVisit.technique || lastVisit.serviceType || "-") : "-",
        lastActivityAt: stats ? stats.lastActivityAt : (Number(c.createdAt) || 0)
      });
    })
    .sort((a, b) => (b.lastActivityAt || 0) - (a.lastActivityAt || 0))
    .slice(0, max)
    .map((c) => {
      const copy = Object.assign({}, c);
      delete copy.lastActivityAt;
      return copy;
    });
}

function getCustomer(token, customerId) {
  requireSession_(token);
  const rows = sheetToObjects_(getCustomersSheet_());
  const row = rows.find((r) => r.CustomerID === customerId);
  return row ? rowToCustomer_(row) : null;
}

function findCustomerByPhone(token, phone) {
  requireSession_(token);
  const normalized = normalizePhone(phone);
  const rows = sheetToObjects_(getCustomersSheet_());
  const existing = rows.find((r) => phoneMatches_(customerPhoneNormalized_(r), normalized) || phoneMatches_(r.PhoneDisplay, normalized));
  return existing ? rowToCustomer_(existing) : null;
}

// รายชื่อลูกค้าทั้งหมด พร้อมสถิติที่ join จากแท็บ ServiceHistory (จำนวนครั้ง, วันที่ล่าสุด, เทคนิคล่าสุด)
// ใช้แสดงในตาราง Customers — ต้องคืนรูปแบบเดียวกับ js/mockApi.js:listCustomersWithStats() ทุกฟิลด์
function listCustomersWithStats(token) {
  requireSession_(token);
  const customers = sheetToObjects_(getCustomersSheet_()).map(rowToCustomer_);
  const history = sheetToObjects_(getServiceHistorySheet_()).map(rowToVisit_);

  return customers
    .map((c) => {
      const visits = history
        .filter((v) => v.customerId === c.customerId)
        .sort((a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime());
      const lastVisit = visits[0] || null;
      return Object.assign({}, c, {
        visitsCount: visits.length,
        lastVisitDate: lastVisit ? lastVisit.visitDate : null,
        lastTechnique: lastVisit ? (lastVisit.technique || lastVisit.serviceType || "-") : "-"
      });
    })
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

function createCustomer(token, data) {
  requireSession_(token);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getCustomersSheet_();
    const normalized = normalizePhone(data.phone);
    const rows = sheetToObjects_(sheet);
    const existing = rows.find((r) => phoneMatches_(customerPhoneNormalized_(r), normalized) || phoneMatches_(r.PhoneDisplay, normalized));
    if (existing) {
      return { success: false, error: "duplicate", existing: rowToCustomer_(existing) };
    }

    // รูปแบบ Customer ID ตามสเปก: PYN-000123 (prefix คงที่ + เลขรัน 6 หลัก)
    const customerId = nextId_(sheet, "PYN-", 6);
    const createdAt = Date.now();
    const emptySkinProfile = { skinType: null, hairLook: null, hairDensity: null, browShape: [], muscle: null, muscleNote: "", muscleEvaluatedAt: null };
    const record = {
      CustomerID: customerId,
      FullName: data.fullName,
      Nickname: data.nickname,
      DOB: data.dob || "",
      PhoneNormalized: normalized,
      PhoneDisplay: data.phone,
      Line: data.line || "",
      SkinProfileJson: JSON.stringify(emptySkinProfile),
      ProfileConfirmedAt: "",
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
        fullName: data.fullName,
        nickname: data.nickname,
        dob: data.dob || null,
        phoneNormalized: normalized,
        phoneDisplay: data.phone,
        line: data.line || "",
        skinProfile: emptySkinProfile,
        profileConfirmedAt: null,
        createdAt
      }
    };
  } finally {
    lock.releaseLock();
  }
}

// บันทึกว่าลูกค้ายืนยันข้อมูลส่วนตัวถูกต้องแล้ว พร้อมวันเวลา (ตามสเปก Step 2)
function confirmCustomerProfile(token, customerId) {
  requireSession_(token);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getCustomersSheet_();
    const rows = sheetToObjects_(sheet);
    const row = rows.find((r) => r.CustomerID === customerId);
    if (!row) return { success: false };
    const col = CUSTOMERS_HEADERS.indexOf("ProfileConfirmedAt") + 1;
    const confirmedAt = Date.now();
    sheet.getRange(row._rowIndex, col).setValue(confirmedAt);
    return { success: true, customer: rowToCustomer_(Object.assign({}, row, { ProfileConfirmedAt: confirmedAt })) };
  } finally {
    lock.releaseLock();
  }
}

// บันทึกประวัติผิวและคิ้วของลูกค้า (ข้อมูลระดับลูกค้า แก้ไขได้ ใช้ซ้ำได้ทุก Visit)
function saveSkinProfile(token, customerId, skinProfile) {
  requireSession_(token);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getCustomersSheet_();
    const rows = sheetToObjects_(sheet);
    const row = rows.find((r) => r.CustomerID === customerId);
    if (!row) return { success: false };
    const merged = Object.assign(parseSkinProfile_(row.SkinProfileJson), skinProfile);
    const col = CUSTOMERS_HEADERS.indexOf("SkinProfileJson") + 1;
    sheet.getRange(row._rowIndex, col).setValue(JSON.stringify(merged));
    return { success: true, customer: rowToCustomer_(Object.assign({}, row, { SkinProfileJson: JSON.stringify(merged) })) };
  } finally {
    lock.releaseLock();
  }
}

// อัปเดตผลประเมินกล้ามเนื้อคิ้วล่าสุด (กรอกในฟอร์ม 1/2 ตอนวัดทรงจริง) กลับไปแสดงใน Customer Profile
function updateMuscleEvaluation(token, customerId, muscle, muscleNote) {
  requireSession_(token);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getCustomersSheet_();
    const rows = sheetToObjects_(sheet);
    const row = rows.find((r) => r.CustomerID === customerId);
    if (!row) return { success: false };
    const current = parseSkinProfile_(row.SkinProfileJson);
    const merged = Object.assign(current, { muscle: muscle, muscleNote: muscleNote || "", muscleEvaluatedAt: Date.now() });
    const col = CUSTOMERS_HEADERS.indexOf("SkinProfileJson") + 1;
    sheet.getRange(row._rowIndex, col).setValue(JSON.stringify(merged));
    return { success: true, customer: rowToCustomer_(Object.assign({}, row, { SkinProfileJson: JSON.stringify(merged) })) };
  } finally {
    lock.releaseLock();
  }
}
