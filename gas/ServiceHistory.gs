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

function rowToVisit_(row) {
  return {
    serviceId: row.ServiceID,
    customerId: row.CustomerID,
    zervaBookingId: row.ZervaBookingId,
    visitDate: row.VisitDate,
    timeSlot: row.TimeSlot,
    status: row.Status,
    serviceType: row.ServiceType,
    formType: row.FormType,
    technique: row.Technique,
    colorUsed: row.ColorUsed,
    intensity: row.Intensity,
    muscle: row.Muscle,
    shapeDesign: row.ShapeDesign,
    browGuard: row.BrowGuard,
    satisfaction: row.Satisfaction,
    colorRetention: row.ColorRetention,
    wantsMoreChange: row.WantsMoreChange,
    changeItems: parseJsonArray_(row.ChangeItemsJson),
    mixRatio: row.MixRatio,
    redness: row.Redness,
    adherence: row.Adherence,
    analysis: row.Analysis,
    note: row.Note,
    notServedReason: row.NotServedReason,
    beforePhotoUrl: row.BeforePhotoUrl,
    afterPhotoUrl: row.AfterPhotoUrl,
    signatureCustomerUrl: row.SignatureCustomerUrl,
    signatureTechUrl: row.SignatureTechUrl,
    consentAgreedAt: row.ConsentAgreedAt || null,
    calendarEventId: row.CalendarEventId,
    createdAt: row.CreatedAt
  };
}

function getHistoryByCustomer(token, customerId) {
  requireSession_(token);
  const rows = sheetToObjects_(getServiceHistorySheet_());
  return rows
    .filter((r) => r.CustomerID === customerId)
    .map(rowToVisit_)
    .sort((a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime());
}

// สร้าง Visit ใหม่ตอน Step 3 (ก่อนเปิดฟอร์ม Consultation ใด ๆ) — สถานะเริ่มต้นเสมอคือ "กำลังดำเนินการ"
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
