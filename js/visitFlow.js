// visitFlow.js — ส่วนที่ใช้ร่วมกันทุกฟอร์ม Consultation (Form 1/2/3 + หน้าบันทึกหลังทำ)
// ตาม "กติกากลางของทั้ง 3 ฟอร์ม": แสดง Customer ID/Visit ID/Zerva Booking ID/ชื่อ/ชื่อเล่น/วันเวลานัด
// ที่ดึงจากขั้นตอนก่อนหน้า + ปุ่ม "ไม่ได้รับบริการ" ที่กดได้ทุกจุดของฟอร์ม

import { state } from "./state.js";
import { show } from "./router.js";
import { closeVisitNotServed, saveVisit } from "./mockApi.js";
import { escapeHtml, formatDate } from "./utils.js";

export function visitHeaderHtml() {
  const c = state.currentCustomer;
  const v = state.visitContext;
  if (!c || !v) return "";
  return `
    <div class="box-quiet visit-header">
      <div><b>${escapeHtml(c.fullName || c.nickname || c.name || "")}</b> (${escapeHtml(c.nickname || "-")}) &nbsp;·&nbsp; ${escapeHtml(c.customerId)}</div>
      <div class="muted small">Visit ${escapeHtml(v.visitId)} &nbsp;·&nbsp; Zerva ${escapeHtml(v.zervaBookingId || "-")} &nbsp;·&nbsp; ${formatDate(v.visitDate)} ${escapeHtml(v.timeSlot || "")}</div>
    </div>`;
}

// ปุ่ม "บันทึกแบบร่าง" มุมขวาบน — กดได้ตลอดทุกจุดของฟอร์ม โดยไม่ต้องรอข้อมูลบังคับครบ
// เก็บ rawAnswers ดิบทั้งหมดไว้ก่อน ไม่ normalize เป็นฟิลด์ทีละอันเหมือนตอนปิด Visit จริง
export function wireDraftSaveButton(buttonEl) {
  if (!buttonEl) return;
  buttonEl.addEventListener("click", async () => {
    const c = state.currentCustomer;
    const v = state.visitContext;
    if (!c || !v) return;
    buttonEl.disabled = true;
    const draft = state.visitDraft;
    await saveVisit({
      serviceId: v.visitId,
      customerId: c.customerId,
      zervaBookingId: v.zervaBookingId,
      timeSlot: v.timeSlot,
      serviceType: state.serviceType,
      formType: state.formType,
      status: "draft",
      visitDate: v.visitDate || Date.now(),
      technique: draft.technique || null,
      colorUsed: draft.colorChoice || null,
      intensity: draft.intensity || null,
      rawAnswers: { ...draft, beforePhotoDataUrl: undefined, afterPhotoDataUrl: undefined, signatureCustomerDataUrl: undefined }
    });
    buttonEl.disabled = false;
    alert("บันทึกแบบร่างแล้ว — กลับมาทำต่อได้ทุกเมื่อ");
  });
}

// ปุ่ม "ไม่ได้รับบริการ" — บังคับกรอกเหตุผล แล้วปิด Visit ทันทีโดยไม่บังคับ Consent/ลายเซ็น/รายละเอียดการทำ/รูป After
export function wireNotServedButton(buttonEl) {
  if (!buttonEl) return;
  buttonEl.addEventListener("click", async () => {
    const v = state.visitContext;
    if (!v) return;
    const reason = prompt("เหตุผลที่ไม่ได้รับบริการ (บังคับกรอก):", "");
    if (reason === null) return; // กดยกเลิก
    if (!reason.trim()) { alert("กรุณาระบุเหตุผล"); return; }
    buttonEl.disabled = true;
    await closeVisitNotServed(v.visitId, reason.trim());
    state.reset();
    show("home");
  });
}
