// visitFlow.js — ส่วนที่ใช้ร่วมกันทุกฟอร์ม Consultation (Form 1/2/3 + หน้าบันทึกหลังทำ)
// ตาม "กติกากลางของทั้ง 3 ฟอร์ม": แสดง Customer ID/Visit ID/Zerva Booking ID/ชื่อ/ชื่อเล่น/วันเวลานัด
// ที่ดึงจากขั้นตอนก่อนหน้า + ปุ่ม "ไม่ได้รับบริการ" ที่กดได้ทุกจุดของฟอร์ม

import { state } from "./state.js";
import { show } from "./router.js";
import { closeVisitNotServed, saveVisit } from "./mockApi.js";
import { appAlert, appConfirm, appPrompt } from "./dialogs.js";
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

export function setDraftSaveLoading(buttonEl, isLoading) {
  if (!buttonEl) return;
  if (isLoading) {
    buttonEl.dataset.idleText = buttonEl.textContent;
    buttonEl.textContent = "กำลังบันทึก...";
    buttonEl.setAttribute("aria-busy", "true");
    buttonEl.disabled = true;
    return;
  }
  buttonEl.textContent = buttonEl.dataset.idleText || "บันทึกแบบร่าง";
  buttonEl.removeAttribute("aria-busy");
  buttonEl.disabled = false;
}

export async function promptAfterDraftSaved() {
  const goHome = await appConfirm("บันทึกแบบร่างแล้ว — ต้องการอยู่หน้านี้ต่อหรือกลับไปหน้าลูกค้าเก่า?", {
    title: "บันทึกแบบร่างแล้ว",
    okText: "กลับหน้าหลัก",
    cancelText: "อยู่หน้านี้ต่อ"
  });
  if (!goHome) return;
  state.reset();
  show("home", { data: { mode: "oldCustomerSearch" } });
}

// ปุ่ม "บันทึกแบบร่าง" มุมขวาบน — กดได้ตลอดทุกจุดของฟอร์ม โดยไม่ต้องรอข้อมูลบังคับครบ
// เก็บ rawAnswers ดิบทั้งหมดไว้ก่อน ไม่ normalize เป็นฟิลด์ทีละอันเหมือนตอนปิด Visit จริง
export function wireDraftSaveButton(buttonEl) {
  if (!buttonEl) return;
  buttonEl.addEventListener("click", async () => {
    const c = state.currentCustomer;
    const v = state.visitContext;
    if (!c || !v) return;
    setDraftSaveLoading(buttonEl, true);
    const draft = state.visitDraft;
    try {
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
      await promptAfterDraftSaved();
    } catch (e) {
      console.warn("saveVisit (draft) failed:", e);
      await appAlert("บันทึกแบบร่างไม่สำเร็จ — เช็คสัญญาณอินเทอร์เน็ตแล้วลองใหม่อีกครั้ง", { title: "บันทึกไม่สำเร็จ" });
    } finally {
      setDraftSaveLoading(buttonEl, false);
    }
  });
}

// ปุ่ม "ไม่ได้รับบริการ" — บังคับกรอกเหตุผล แล้วปิด Visit ทันทีโดยไม่บังคับ Consent/ลายเซ็น/รายละเอียดการทำ/รูป After
export function wireNotServedButton(buttonEl) {
  if (!buttonEl) return;
  buttonEl.addEventListener("click", async () => {
    const v = state.visitContext;
    if (!v) return;
    const reason = await appPrompt("กรุณาระบุเหตุผลที่ไม่ได้รับบริการ เพื่อปิด Visit นี้", {
      title: "ไม่ได้รับบริการ",
      inputLabel: "เหตุผล",
      placeholder: "เช่น ลูกค้ายกเลิก / ไม่มาตามนัด / เลื่อนนัด",
      required: true,
      requiredMessage: "กรุณาระบุเหตุผล",
      okText: "ยืนยันปิด Visit",
      cancelText: "ยกเลิก"
    });
    if (reason === null) return; // กดยกเลิก
    buttonEl.disabled = true;
    try {
      await closeVisitNotServed(v.visitId, reason.trim());
      state.reset();
      show("home");
    } catch (e) {
      console.warn("closeVisitNotServed failed:", e);
      await appAlert("ปิด Visit ไม่สำเร็จ — เช็คสัญญาณอินเทอร์เน็ตแล้วลองใหม่อีกครั้ง", { title: "ทำรายการไม่สำเร็จ" });
      buttonEl.disabled = false;
    }
  });
}
