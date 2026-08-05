/**
 * ServiceHistory.gs — สร้าง/อ่าน/บันทึก/ปิด ประวัติการเข้ารับบริการ ในแท็บ ServiceHistory
 */

function getServiceHistorySheet_() {
  return getSpreadsheet_().getSheetByName(SHEET_NAMES.SERVICE_HISTORY);
}

function joinIfArray_(value) {
  return Array.isArray(value) ? value.join(", ") : (value || "");
}

function parseJsonArray_(json) {
  if (!json) return [];
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v : [];
  } catch (e) {
    return [];
  }
}

function parseJsonObject_(json) {
  if (!json) return {};
  try {
    const v = JSON.parse(json);
    return v && typeof v === "object" && !Array.isArray(v) ? v : {};
  } catch (e) {
    return {};
  }
}

function dateValueForClient_(value) {
  if (!value) return null;
  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value.getTime())) {
    return value.getTime();
  }
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function stringForClient_(value) {
  if (value === undefined || value === null) return "";
  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  return String(value);
}

function rowToVisit_(row) {
  return {
    serviceId: stringForClient_(row.ServiceID),
    customerId: stringForClient_(row.CustomerID),
    zervaBookingId: stringForClient_(row.ZervaBookingId),
    visitDate: dateValueForClient_(row.VisitDate),
    timeSlot: stringForClient_(row.TimeSlot),
    status: stringForClient_(row.Status),
    serviceType: stringForClient_(row.ServiceType),
    formType: stringForClient_(row.FormType),
    technique: stringForClient_(row.Technique),
    colorUsed: stringForClient_(row.ColorUsed),
    intensity: stringForClient_(row.Intensity),
    muscle: stringForClient_(row.Muscle),
    shapeDesign: stringForClient_(row.ShapeDesign),
    browGuard: stringForClient_(row.BrowGuard),
    satisfaction: stringForClient_(row.Satisfaction),
    colorRetention: stringForClient_(row.ColorRetention),
    wantsMoreChange: stringForClient_(row.WantsMoreChange),
    changeItems: parseJsonArray_(row.ChangeItemsJson),
    mixRatio: stringForClient_(row.MixRatio),
    redness: stringForClient_(row.Redness),
    adherence: stringForClient_(row.Adherence),
    analysis: stringForClient_(row.Analysis),
    note: stringForClient_(row.Note),
    notServedReason: stringForClient_(row.NotServedReason),
    beforePhotoUrl: stringForClient_(row.BeforePhotoUrl),
    afterPhotoUrl: stringForClient_(row.AfterPhotoUrl),
    signatureCustomerUrl: stringForClient_(row.SignatureCustomerUrl),
    signatureTechUrl: stringForClient_(row.SignatureTechUrl),
    consentAgreedAt: dateValueForClient_(row.ConsentAgreedAt) || null,
    rawAnswers: parseJsonObject_(row.RawAnswersJson),
    calendarEventId: stringForClient_(row.CalendarEventId),
    createdAt: dateValueForClient_(row.CreatedAt)
  };
}

function getHistoryByCustomer(token, customerId) {
  requireSession_(token);
  const rows = sheetToObjects_(getServiceHistorySheet_());
  return rows
    .filter((r) => stringForClient_(r.CustomerID) === String(customerId || ""))
    .map(rowToVisit_)
    .sort((a, b) => (Number(b.visitDate) || 0) - (Number(a.visitDate) || 0));
}

// สร้าง Visit ใหม่หลังเลือก Form 1/2/3 แล้ว — สถานะเริ่มต้นเสมอคือ "กำลังดำเนินการ"
// คืน visitId (= serviceId) กลับไปให้หน้าฟอร์มถัดไปใช้เป็น payload.serviceId ตอนบันทึกแบบร่าง/ปิด Visit
// เพื่ออัปเดตแถวเดิมแทนการสร้างแถวซ้ำ (ดู saveVisit ด้านล่าง)
function createVisit(token, payload) {
  requireSession_(token);
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const sheet = getServiceHistorySheet_();
    const visitId = nextId_(sheet, "S", 4);
    const now = Date.now();

    const record = {
      ServiceID: visitId,
      CustomerID: payload.customerId,
      ZervaBookingId: payload.zervaBookingId || "",
      VisitDate: payload.visitDate || now,
      TimeSlot: payload.timeSlot || "",
      Status: "กำลังดำเนินการ",
      ServiceType: payload.serviceType || "",
      FormType: payload.formType || "",
      CreatedAt: now
    };

    sheet.appendRow(objectToRow_(record, SERVICE_HISTORY_HEADERS));
    return { success: true, visitId: visitId, visit: rowToVisit_(record) };
  } finally {
    lock.releaseLock();
  }
}

// ปิด Visit ด้วยสถานะ "ไม่ได้รับบริการ" — บังคับกรอกเหตุผล ไม่บังคับ Consent/ลายเซ็น/รายละเอียดการทำ/รูป After
function closeVisitNotServed(token, visitId, reason) {
  requireSession_(token);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getServiceHistorySheet_();
    const rows = sheetToObjects_(sheet);
    const row = rows.find((r) => r.ServiceID === visitId);
    if (!row) return { success: false };
    const statusCol = SERVICE_HISTORY_HEADERS.indexOf("Status") + 1;
    const reasonCol = SERVICE_HISTORY_HEADERS.indexOf("NotServedReason") + 1;
    const updatedCol = SERVICE_HISTORY_HEADERS.indexOf("UpdatedAt") + 1;
    sheet.getRange(row._rowIndex, statusCol).setValue("ไม่ได้รับบริการ");
    sheet.getRange(row._rowIndex, reasonCol).setValue(reason);
    sheet.getRange(row._rowIndex, updatedCol).setValue(Date.now());
    return { success: true };
  } finally {
    lock.releaseLock();
  }
}

// ถ้า payload.serviceId ตรงกับ Visit ที่เคยสร้าง/บันทึกแบบร่างไว้แล้ว (สร้างจาก createVisit() เสมอ
// ก่อนเปิดฟอร์มตามสเปก) จะอัปเดตแถวเดิมแทนการสร้างแถวใหม่ — merge เฉพาะคีย์ที่ payload ส่งมา
// ทับค่าที่มีอยู่เดิม (คีย์ที่ไม่ได้ส่งมาคงค่าเดิมไว้) ตรงกับพฤติกรรม js/mockApi.js:saveVisit()
function saveVisit(token, payload) {
  requireSession_(token);
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const sheet = getServiceHistorySheet_();
    const now = Date.now();

    const patch = {
      CustomerID: payload.customerId,
      ZervaBookingId: payload.zervaBookingId,
      VisitDate: payload.visitDate,
      TimeSlot: payload.timeSlot,
      Status: payload.status,
      ServiceType: payload.serviceType,
      FormType: payload.formType,
      Technique: payload.technique,
      ColorUsed: payload.colorUsed,
      Intensity: payload.intensity,
      Muscle: payload.muscle !== undefined ? joinIfArray_(payload.muscle) : undefined,
      ShapeDesign: payload.shapeDesign !== undefined ? joinIfArray_(payload.shapeDesign) : undefined,
      BrowGuard: payload.browGuard,
      Satisfaction: payload.satisfaction,
      ColorRetention: payload.colorRetention,
      WantsMoreChange: payload.wantsMoreChange,
      ChangeItemsJson: payload.changeItems !== undefined ? JSON.stringify(payload.changeItems) : undefined,
      MixRatio: payload.mixRatio,
      Redness: payload.redness,
      Adherence: payload.adherence,
      Analysis: payload.analysis,
      Note: payload.note,
      BeforePhotoUrl: payload.beforePhotoUrl,
      AfterPhotoUrl: payload.afterPhotoUrl,
      SignatureCustomerUrl: payload.signatureCustomerUrl,
      SignatureTechUrl: payload.signatureTechUrl,
      ConsentAgreedAt: payload.rawAnswers && payload.rawAnswers.agreedAt !== undefined ? payload.rawAnswers.agreedAt : undefined,
      RawAnswersJson: payload.rawAnswers !== undefined ? JSON.stringify(payload.rawAnswers) : undefined,
      UpdatedAt: now
    };
    // ตัดคีย์ที่เป็น undefined ออก (ไม่ส่งมาจาก client รอบนี้) กันเขียนทับค่าที่ดีอยู่แล้วด้วยค่าว่าง
    Object.keys(patch).forEach((k) => { if (patch[k] === undefined) delete patch[k]; });

    if (payload.serviceId) {
      const rows = sheetToObjects_(sheet);
      const existingRow = rows.find((r) => r.ServiceID === payload.serviceId);
      if (existingRow) {
        const merged = Object.assign({}, existingRow, patch);
        sheet.getRange(existingRow._rowIndex, 1, 1, SERVICE_HISTORY_HEADERS.length)
          .setValues([objectToRow_(merged, SERVICE_HISTORY_HEADERS)]);
        return { success: true, serviceId: payload.serviceId };
      }
    }

    const visitId = nextId_(sheet, "S", 4);
    const record = Object.assign({ ServiceID: visitId, CreatedAt: now }, patch);
    sheet.appendRow(objectToRow_(record, SERVICE_HISTORY_HEADERS));
    return { success: true, serviceId: visitId };
  } finally {
    lock.releaseLock();
  }
}
