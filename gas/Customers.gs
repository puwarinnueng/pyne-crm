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

function rowToCustomer_(row) {
  return {
    customerId: row.CustomerID,
    fullName: row.FullName,
    nickname: row.Nickname,
    dob: row.DOB,
    phoneNormalized: row.PhoneNormalized,
    phoneDisplay: row.PhoneDisplay,
    line: row.Line,
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
  const rows = sheetToObjects_(getCustomersSheet_());

  return rows
    .filter((row) => {
      const nameHit = (String(row.FullName || "") + " " + String(row.Nickname || "")).toLowerCase().indexOf(q) >= 0;
      const lineHit = String(row.Line || "").toLowerCase().indexOf(q) >= 0;
      const phoneHit = qPhone.length >= 3 && String(row.PhoneNormalized || "").indexOf(qPhone) >= 0;
      return nameHit || lineHit || phoneHit;
    })
    .map(rowToCustomer_);
}

function listRecentCustomers(token, limit) {
  requireSession_(token);
  const rows = sheetToObjects_(getCustomersSheet_());
  return rows
    .sort((a, b) => (b.CreatedAt || 0) - (a.CreatedAt || 0))
    .slice(0, limit || 10)
    .map(rowToCustomer_);
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
  const existing = rows.find((r) => r.PhoneNormalized === normalized);
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
    const existing = rows.find((r) => r.PhoneNormalized === normalized);
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
