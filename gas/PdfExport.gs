/**
 * PdfExport.gs — สร้าง Consent / Service summary เป็น PDF จริงใน Google Drive
 *
 * ใช้ Google Doc ชั่วคราวเป็นตัวกลางแล้ว export เป็น PDF เพราะเสถียรกว่า HTML-to-PDF
 * ใน Apps Script และไม่ต้องเปิด Advanced Drive service เพิ่ม
 */

const PDF_FIELD_LABELS = {
  hadBrowBefore: "เคยสักคิ้วมาก่อนหรือไม่",
  oldMarkLook: "ลักษณะรอยเก่าที่เห็นในปัจจุบัน",
  oldMarkTone: "โทนสีรอยเดิม",
  fixPoints: "จุดที่ต้องการแก้ไขจากรอยเดิม",
  browHairLook: "ลักษณะขนคิ้ว",
  browHairDensity: "ความแน่นของขนคิ้ว",
  skinType: "ประเภทผิว",
  hasScar: "ผิวบริเวณคิ้วมีแผลเป็นหรือไม่",
  scarCause: "สาเหตุแผลเป็น",
  desiredArea: "จุดที่ต้องการ",
  irritation7d: "ผิวระคายเคืองบริเวณคิ้วภายใน 7 วัน",
  irritationDetail: "รายละเอียดความระคายเคือง",
  allergyInfo: "มีอาการแพ้/ข้อมูลสำคัญที่ต้องแจ้งช่างหรือไม่",
  allergyDetail: "รายละเอียดอาการแพ้",
  concerns: "ปัญหาหลักที่กังวล",
  desiredOverview: "ภาพรวมที่ต้องการ",
  desiredFeel: "ฟีลคิ้วที่ต้องการ",
  notWanted: "สิ่งที่ไม่อยากได้เด็ดขาด",
  dontWant: "สิ่งที่ไม่อยากได้เด็ดขาด",
  adjustFromLast: "สิ่งที่อยากปรับจากครั้งก่อน",
  touchupPrice: "ค่าเติมสี (บาท)",
  colorChoice: "สีที่เลือก"
};

function pdfFormTypeLabel_(formType) {
  if (formType === "form1") return "สักคิ้วครั้งแรก";
  if (formType === "form2") return "สักทับรอยเก่า";
  if (formType === "form3") return "เติมสีคิ้ว";
  return "";
}

function pdfDateTime_(value, pattern) {
  if (!value) return "-";
  var date = Object.prototype.toString.call(value) === "[object Date]" ? value : new Date(Number(value));
  if (!date || isNaN(date.getTime())) return String(value);
  return Utilities.formatDate(date, "Asia/Bangkok", pattern || "d MMM yyyy HH:mm");
}

function pdfValue_(value) {
  if (Array.isArray(value)) return value.length ? value.join(", ") : "-";
  if (value === undefined || value === null || value === "") return "-";
  return String(value);
}

function pdfRows_(rows) {
  return rows
    .filter(function(row) { return row[1] !== undefined && row[1] !== null && row[1] !== ""; })
    .map(function(row) { return [String(row[0]), pdfValue_(row[1])]; });
}

function appendPdfSection_(body, title, rows) {
  rows = pdfRows_(rows);
  if (!rows.length) return;
  body.appendParagraph(title).setHeading(DocumentApp.ParagraphHeading.HEADING2);
  var table = body.appendTable(rows);
  for (var i = 0; i < table.getNumRows(); i += 1) {
    var labelCell = table.getRow(i).getCell(0);
    labelCell.setBackgroundColor("#f5f0ea");
    labelCell.editAsText().setBold(true);
  }
  body.appendParagraph("");
}

function findPdfVisit_(serviceId) {
  var rows = sheetToObjects_(getServiceHistorySheet_());
  var row = rows.find(function(r) { return String(r.ServiceID || "") === String(serviceId || ""); });
  return row ? rowToVisit_(row) : null;
}

function findPdfCustomer_(customerId) {
  var rows = sheetToObjects_(getCustomersSheet_());
  var row = rows.find(function(r) { return String(r.CustomerID || "") === String(customerId || ""); });
  return row ? rowToCustomer_(row) : null;
}

function getPdfExportFolder_(customer, visit) {
  var customerName = customer ? (customer.fullName || customer.nickname || "") : "";
  var customerPhone = customer ? (customer.phoneNormalized || customer.phoneDisplay || "") : "";
  var visitKey = visit.serviceId || todayDateString_();
  var serviceName = visit.serviceType || pdfFormTypeLabel_(visit.formType) || "service";

  var root = getDriveRootFolder_();
  var exportRoot = getOrCreateSubfolder_(root, "_exports").folder;
  var customerFolderName = sanitizeFolderName_((normalizePhone(customerPhone) || "unknown") + "_" + customerName);
  var customerFolder = getOrCreateSubfolder_(exportRoot, customerFolderName).folder;
  var visitFolderName = sanitizeFolderName_(visitKey + "_" + serviceName);
  return getOrCreateSubfolder_(customerFolder, visitFolderName).folder;
}

function appendPdfRawAnswers_(body, raw) {
  var rows = Object.keys(PDF_FIELD_LABELS)
    .filter(function(key) {
      var value = raw[key];
      return value !== undefined && value !== null && value !== "" && !(Array.isArray(value) && value.length === 0);
    })
    .map(function(key) {
      return [PDF_FIELD_LABELS[key], raw[key]];
    });
  appendPdfSection_(body, "Consultation Answers", rows);
}

function createConsentPdf_(customer, visit) {
  var raw = visit.rawAnswers || {};
  var formLabel = pdfFormTypeLabel_(visit.formType);
  var filename = [
    "Pyne_Consent",
    visit.serviceId || "service",
    customer ? (customer.customerId || "customer") : "customer"
  ].join("_");

  var doc = DocumentApp.create(filename);
  var docFile = DriveApp.getFileById(doc.getId());
  var body = doc.getBody();

  body.clear();
  body.appendParagraph("Pyne Studio Consent Form")
    .setHeading(DocumentApp.ParagraphHeading.HEADING1);
  body.appendParagraph(formLabel || visit.serviceType || "-");
  body.appendParagraph("Exported: " + pdfDateTime_(Date.now()));
  body.appendParagraph("");

  appendPdfSection_(body, "Customer", [
    ["Customer ID", customer && customer.customerId],
    ["ชื่อ-นามสกุล", customer && customer.fullName],
    ["ชื่อเล่น", customer && customer.nickname],
    ["วันเกิด", customer && customer.dob],
    ["โทรศัพท์", customer && (customer.phoneDisplay || customer.phoneNormalized)],
    ["Line", customer && customer.line]
  ]);

  appendPdfSection_(body, "Visit", [
    ["Service ID", visit.serviceId],
    ["Service Type", visit.serviceType],
    ["Form", formLabel],
    ["Status", normalizeVisitStatus_(visit.status)],
    ["Visit Date", pdfDateTime_(visit.visitDate, "d MMM yyyy")],
    ["Time Slot", visit.timeSlot],
    ["Zerva Booking ID", visit.zervaBookingId]
  ]);

  appendPdfRawAnswers_(body, raw);

  appendPdfSection_(body, "Service Summary", [
    ["Technique", visit.technique],
    ["Color", visit.colorUsed],
    ["Intensity", visit.intensity],
    ["Muscle", visit.muscle],
    ["Shape Design", visit.shapeDesign],
    ["Brow Guard", visit.browGuard],
    ["Satisfaction", visit.satisfaction],
    ["Color Retention", visit.colorRetention],
    ["Wants More Change", visit.wantsMoreChange],
    ["Change Items", visit.changeItems],
    ["Mix Ratio", visit.mixRatio],
    ["Redness", visit.redness],
    ["Adherence", visit.adherence],
    ["Analysis", visit.analysis],
    ["Note", visit.note],
    ["Not Served Reason", visit.notServedReason]
  ]);

  appendPdfSection_(body, "Files", [
    ["Before Photo", visit.beforePhotoUrl],
    ["After Photo", visit.afterPhotoUrl],
    ["Customer Signature", visit.signatureCustomerUrl],
    ["Technician Signature", visit.signatureTechUrl]
  ]);

  appendPdfSection_(body, "Consent", [
    ["Consent Agreed At", pdfDateTime_(visit.consentAgreedAt || raw.agreedAt)],
    ["Final Agreement", raw.finalAgree || raw.consentAgree],
    ["Customer Signature", visit.signatureCustomerUrl ? "Signed" : ""],
    ["Technician Signature", visit.signatureTechUrl ? "Signed" : ""]
  ]);

  doc.saveAndClose();

  var exportFolder = getPdfExportFolder_(customer, visit);
  var pdfBlob = docFile.getBlob().getAs(MimeType.PDF).setName(filename + ".pdf");
  var pdfFile = exportFolder.createFile(pdfBlob);
  docFile.setTrashed(true);

  return {
    success: true,
    fileId: pdfFile.getId(),
    url: pdfFile.getUrl(),
    filename: filename + ".pdf",
    note: "สร้าง PDF แล้ว"
  };
}

function exportConsentPdf(token, serviceId) {
  requireSession_(token);
  if (!serviceId) return { success: false, error: "missing_service_id", note: "ไม่พบ Service ID สำหรับ export PDF" };

  var visit = findPdfVisit_(serviceId);
  if (!visit) return { success: false, error: "visit_not_found", note: "ไม่พบข้อมูล Visit นี้" };

  var customer = findPdfCustomer_(visit.customerId);
  if (!customer) return { success: false, error: "customer_not_found", note: "ไม่พบข้อมูลลูกค้าของ Visit นี้" };

  return createConsentPdf_(customer, visit);
}
