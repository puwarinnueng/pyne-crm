// state.js — เก็บ state ระหว่างหน้าจอ (ฝั่ง client เท่านั้น, ไม่ persist)
// เทียบเท่ากับตัวแปรที่ส่งผ่านกันระหว่างหน้าใน Apps Script HtmlService

export const state = {
  currentCustomer: null,      // customer object ที่กำลังเปิดดู/เพิ่มประวัติ
  serviceType: null,          // "สักคิ้ว" | "เติมสี" (หมวดกว้าง ใช้แสดงผลจุดเดิมที่มีอยู่)
  formType: null,             // "form1" | "form2" | "form3" (ใช้เลือก/บันทึกฟอร์มที่ตรงจริง)
  visitContext: null,         // { visitId, zervaBookingId, visitDate, timeSlot } — สร้างจาก Step 3 ก่อนเปิดฟอร์มเสมอ
  pendingVisitMeta: null,     // ข้อมูลนัดที่กรอกไว้ รอเลือก form ก่อนค่อยสร้าง Visit จริง
  visitDraft: {},             // คำตอบฟอร์มที่กำลังกรอก สะสมไปเรื่อย ๆ จนกว่าจะบันทึกจริง
  browStepIndex: 0,
  lastSavedServiceId: null,

  // สำคัญ: ล้างค่าใน object เดิม (ไม่สร้าง object ใหม่) เพราะ bindFieldEvents()
  // เก็บ reference ของ state.visitDraft ไว้ตอน init หน้าจอ ถ้า reassign ใหม่
  // event handler เก่าจะยังชี้ไป object เก่า ทำให้ข้อมูลไม่ sync
  resetVisitDraft() {
    Object.keys(this.visitDraft).forEach((k) => delete this.visitDraft[k]);
  },

  reset() {
    this.currentCustomer = null;
    this.serviceType = null;
    this.formType = null;
    this.visitContext = null;
    this.pendingVisitMeta = null;
    this.resetVisitDraft();
    this.browStepIndex = 0;
  }
};
