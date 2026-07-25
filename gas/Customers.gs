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
    note: row.Note,
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

function getCustomer(customerId) {
  const rows = sheetToObjects_(getCustomersSheet_());
  const row = rows.find((r) => r.CustomerID === customerId);
  return row ? rowToCustomer_(row) : null;
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
      Note: data.note || "",
      CreatedAt: createdAt
    };
    sheet.appendRow(objectToRow_(record, CUSTOMERS_HEADERS));

    return {
      success: true,
      customer: {
        customerId,
        name: data.name,
        phoneNormalized: normalized,
        phoneDisplay: data.phone,
        line: data.line || "",
        note: data.note || "",
        createdAt
      }
    };
  } finally {
    lock.releaseLock();
  }
}
