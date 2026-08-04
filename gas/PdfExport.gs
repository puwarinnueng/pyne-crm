/**
 * PdfExport.gs — ยังเป็น stub ตอนนี้ (ไม่ใช่จุดโฟกัสของรอบเชื่อม Sheets/Drive)
 * TODO: สร้าง PDF จริงจาก ServiceHistory row + ConsentText แล้วเก็บใน Drive folder "_exports"
 */
function exportConsentPdf(token, serviceId) {
  requireSession_(token);
  return {
    success: true,
    note: "ยังไม่ได้ทำ PDF จริง — จะกลับมาทำหลังเชื่อม Sheets/Drive เสร็จ (serviceId: " + serviceId + ")"
  };
}
