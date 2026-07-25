/**
 * ServiceHistory.gs — อ่าน/บันทึกประวัติการเข้ารับบริการ ในแท็บ ServiceHistory
 */

function getServiceHistorySheet_() {
  return getSpreadsheet_().getSheetByName(SHEET_NAMES.SERVICE_HISTORY);
}

function joinIfArray_(value) {
  return Array.isArray(value) ? value.join(", ") : (value || "");
}

function rowToVisit_(row) {
  return {
    serviceId: row.ServiceID,
    customerId: row.CustomerID,
    visitDate: row.VisitDate,
    serviceType: row.ServiceType,
    technique: row.Technique,
    colorUsed: row.ColorUsed,
    intensity: row.Intensity,
    muscle: row.Muscle,
    shapeDesign: row.ShapeDesign,
    browGuard: row.BrowGuard,
    analysis: row.Analysis,
    note: row.Note,
    beforePhotoUrl: row.BeforePhotoUrl,
    afterPhotoUrl: row.AfterPhotoUrl,
    signatureCustomerUrl: row.SignatureCustomerUrl,
    signatureTechUrl: row.SignatureTechUrl,
    zervaBookingId: row.ZervaBookingId,
    calendarEventId: row.CalendarEventId,
    createdAt: row.CreatedAt
  };
}

function getHistoryByCustomer(customerId) {
  const rows = sheetToObjects_(getServiceHistorySheet_());
  return rows
    .filter((r) => r.CustomerID === customerId)
    .map(rowToVisit_)
    .sort((a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime());
}

function saveVisit(payload) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const sheet = getServiceHistorySheet_();
    const serviceId = nextId_(sheet, "S", 5);
    const now = Date.now();

    const record = {
      ServiceID: serviceId,
      CustomerID: payload.customerId,
      VisitDate: now,
      ServiceType: payload.serviceType,
      Technique: payload.technique || "",
      ColorUsed: payload.colorUsed || "",
      Intensity: payload.intensity || "",
      Muscle: joinIfArray_(payload.muscle),
      ShapeDesign: joinIfArray_(payload.shapeDesign),
      BrowGuard: payload.browGuard || "",
      Analysis: payload.analysis || "",
      Note: payload.note || "",
      BeforePhotoUrl: payload.beforePhotoUrl || "",
      AfterPhotoUrl: payload.afterPhotoUrl || "",
      SignatureCustomerUrl: payload.signatureCustomerUrl || "",
      SignatureTechUrl: payload.signatureTechUrl || "",
      ZervaBookingId: payload.zervaBookingId || "",
      CalendarEventId: payload.calendarEventId || "",
      RawAnswersJson: JSON.stringify(payload.rawAnswers || {}),
      CreatedAt: now
    };

    sheet.appendRow(objectToRow_(record, SERVICE_HISTORY_HEADERS));
    return { success: true, serviceId: serviceId };
  } finally {
    lock.releaseLock();
  }
}
