// visitFlow.js — ส่วนที่ใช้ร่วมกันทุกฟอร์ม Consultation (Form 1/2/3 + หน้าบันทึกหลังทำ)

import { state } from "./state.js?v=20260808ae";
import { show } from "./router.js?v=20260808ae";
import { closeVisitNotServed, saveVisit } from "./mockApi.js?v=20260808ae";
import { appAlert, appConfirm, appPrompt } from "./dialogs.js?v=20260808ae";
import { showToast } from "./toast.js?v=20260808ae";
import { escapeHtml, formatDate, resolveTouchupTechnique, resolveTouchupShape, resolveTouchupColor } from "./utils.js?v=20260808ae";
import { withIcon } from "./icons.js?v=20260808ae";

export function visitHeaderHtml() {
  const c = state.currentCustomer;
  const v = state.visitContext;
  if (!c || !v) return "";
  return `
    <div class="box-quiet visit-header">
      <div><b>${escapeHtml(c.fullName || c.nickname || c.name || "")}</b> (${escapeHtml(c.nickname || "-")}) &nbsp;·&nbsp; ${escapeHtml(c.customerId)}</div>
      <div class="muted small">คิว ${escapeHtml(v.visitId)} &nbsp;·&nbsp; Zerva ${escapeHtml(v.zervaBookingId || "-")} &nbsp;·&nbsp; ${formatDate(v.visitDate)} ${escapeHtml(v.timeSlot || "")}</div>
    </div>`;
}

export function setDraftSaveLoading(buttonEl, isLoading) {
  if (!buttonEl) return;
  if (isLoading) {
    if (!buttonEl.dataset.idleHtml) buttonEl.dataset.idleHtml = buttonEl.innerHTML;
    buttonEl.innerHTML = "กำลังบันทึก...";
    buttonEl.setAttribute("aria-busy", "true");
    buttonEl.disabled = true;
    return;
  }
  buttonEl.innerHTML = buttonEl.dataset.idleHtml || withIcon("save", "บันทึกร่าง");
  buttonEl.removeAttribute("aria-busy");
  buttonEl.disabled = false;
}

export async function promptAfterDraftSaved() {
  showToast("บันทึกร่างแล้ว", { tone: "ok" });
  const goHome = await appConfirm("บันทึกร่างแล้ว กลับหน้าลูกค้าเลยไหม?", {
    title: "บันทึกแล้ว",
    okText: "กลับหน้าลูกค้า",
    cancelText: "อยู่หน้านี้ต่อ"
  });
  if (!goHome) return;
  state.reset();
  show("home", { data: { mode: "oldCustomerSearch", preserveSearch: true } });
}

export function wireDraftSaveButton(buttonEl) {
  if (!buttonEl) return;
  if (!buttonEl.querySelector("svg")) {
    buttonEl.innerHTML = withIcon("save", "บันทึกร่าง");
  }
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
        technique: resolveTouchupTechnique(draft) || null,
        colorUsed: resolveTouchupColor(draft) || null,
        intensity: draft.intensity || null,
        muscle: draft.muscle || null,
        shapeDesign: resolveTouchupShape(draft) || null,
        browGuard: draft.browGuard || null,
        rawAnswers: {
          ...draft,
          formStepIndex: state.formStepIndex || 0,
          beforePhotoDataUrl: undefined,
          afterPhotoDataUrl: undefined,
          signatureCustomerDataUrl: undefined
        }
      });
      await promptAfterDraftSaved();
    } catch (e) {
      console.warn("saveVisit (draft) failed:", e);
      await appAlert("บันทึกไม่สำเร็จ ลองเช็คเน็ตแล้วกดอีกครั้ง", { title: "บันทึกไม่สำเร็จ" });
    } finally {
      setDraftSaveLoading(buttonEl, false);
    }
  });
}

export function wireNotServedButton(buttonEl) {
  if (!buttonEl) return;
  buttonEl.addEventListener("click", async () => {
    const v = state.visitContext;
    if (!v) return;
    const reason = await appPrompt("บอกเหตุผลสั้น ๆ ว่าทำไมไม่ได้รับบริการ", {
      title: "ปิดคิว — ไม่ได้รับบริการ",
      inputLabel: "เหตุผล",
      placeholder: "เช่น ลูกค้าไม่มา / เลื่อนนัด / ยกเลิก",
      required: true,
      requiredMessage: "กรอกเหตุผลก่อนนะ",
      okText: "ปิดคิว",
      cancelText: "ยกเลิก"
    });
    if (reason === null) return;
    buttonEl.disabled = true;
    try {
      await closeVisitNotServed(v.visitId, reason.trim());
      showToast("ปิดคิวแล้ว", { tone: "ok" });
      state.reset();
      show("home", { data: { mode: "oldCustomerSearch", preserveSearch: true } });
    } catch (e) {
      console.warn("closeVisitNotServed failed:", e);
      await appAlert("ปิดคิวไม่สำเร็จ ลองอีกครั้ง", { title: "ทำไม่สำเร็จ" });
      buttonEl.disabled = false;
    }
  });
}
