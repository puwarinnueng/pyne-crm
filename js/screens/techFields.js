// techFields.js — ส่วนบันทึกหลังทำ ใช้ร่วมกันทั้ง Form 1/2/3 (สัดส่วนสีที่ใช้, ความแดงผิว, ความติดสี, รูป After, ลายเซ็นช่าง)
// เหมือนกันทุกฟอร์มตามสเปก ("กติกากลางของทั้ง 3 ฟอร์ม") จึงมีหน้าเดียวใช้ร่วมกัน แยกแค่ payload ตอนบันทึก

import { show, onEnter } from "../router.js";
import { state } from "../state.js";
import { saveVisit, uploadImage, ensureVisitFolder } from "../mockApi.js";
import { OPTIONS } from "../data/options.js";
import { radioField, mixRatioField, formatMixRatio, bindFieldEvents, bindMixRatioEvents } from "../fieldHelpers.js";
import { readFileAsDataUrl, ensureVisitSessionKey } from "../utils.js";
import { TECH_SIGNATURE_DATA_URL } from "../data/techSignature.js";
import { visitHeaderHtml } from "../visitFlow.js";

export function initTechFields() {
  const body = document.getElementById("techBody");
  const draftBtn = document.getElementById("tuSaveDraftBtn");
  const closeBtn = document.getElementById("tuSaveCloseBtn");

  function photoSlot(key, label) {
    const url = state.visitDraft[key + "PhotoDataUrl"];
    return `
      <div class="photo-slot" data-photo-key="${key}">
        ${url ? `<img src="${url}">` : `
          <label>
            <span class="photo-slot-icon"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg></span>
            <span>${label}</span>
            <input type="file" accept="image/*" data-photo-input="${key}">
          </label>`}
      </div>`;
  }

  function render() {
    const draft = state.visitDraft;
    body.innerHTML = `
      ${visitHeaderHtml()}
      <div class="step-group">
        <div class="step-group-title">สัดส่วนสีที่ใช้ <span class="required-star">*</span></div>
        ${mixRatioField("mixRatioParts", OPTIONS.mixColors, draft)}
      </div>

      <div class="step-group">
        <div class="step-group-title">ความแดงผิว</div>
        ${radioField("redness", OPTIONS.redness, draft)}
      </div>

      <div class="step-group">
        <div class="step-group-title">ความติดสี</div>
        ${radioField("adherence", OPTIONS.adherence, draft)}
      </div>

      <div class="step-group">
        <div class="step-group-title">รูป After <span class="required-star">*</span></div>
        <div class="photo-row">${photoSlot("after", "After")}</div>
      </div>

      <div class="step-group">
        <div class="step-group-title">ลายเซ็นช่างผู้ให้บริการ</div>
        <div class="tech-sig-wrap">
          <img src="${TECH_SIGNATURE_DATA_URL}" alt="ลายเซ็นช่าง">
        </div>
        <p class="muted small" style="text-align:center">(ชนิสตา ศุภสุข)</p>
      </div>
    `;

    body.querySelectorAll("[data-photo-input]").forEach((inputEl) => {
      inputEl.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const dataUrl = await readFileAsDataUrl(file);
        state.visitDraft[inputEl.dataset.photoInput + "PhotoDataUrl"] = dataUrl;
        render();
      });
    });
  }

  bindFieldEvents(body, state.visitDraft, () => {});
  bindMixRatioEvents(body, state.visitDraft);

  document.getElementById("techBackBtn").addEventListener("click", () => show(state.formType || "form1"));

  function clearFieldErrors() {
    body.querySelectorAll(".field-error").forEach((el) => el.classList.remove("field-error"));
  }
  function flagError(selector) {
    const el = body.querySelector(selector);
    if (el) el.classList.add("field-error");
    return el;
  }

  async function uploadAndBuildFolder() {
    const draft = state.visitDraft;
    const folderMeta = {
      customerPhone: state.currentCustomer.phoneNormalized,
      customerName: state.currentCustomer.fullName || state.currentCustomer.nickname,
      serviceType: state.serviceType,
      visitKey: ensureVisitSessionKey(draft)
    };
    const folderRes = await ensureVisitFolder(folderMeta);
    const uploadMeta = { folderId: folderRes.folderId };
    const hasSignature = Boolean(draft.signatureCustomerDataUrl);
    const [beforeUp, afterUp, sigUp] = await Promise.all([
      draft.beforePhotoDataUrl ? uploadImage(draft.beforePhotoDataUrl, { ...uploadMeta, filename: "before.jpg" }) : Promise.resolve(null),
      draft.afterPhotoDataUrl ? uploadImage(draft.afterPhotoDataUrl, { ...uploadMeta, filename: "after.jpg" }) : Promise.resolve(null),
      hasSignature
        ? uploadImage(draft.signatureCustomerDataUrl, { ...uploadMeta, filename: "signature_customer.png" })
        : Promise.resolve(null)
    ]);
    return {
      beforePhotoUrl: beforeUp ? beforeUp.url : null,
      afterPhotoUrl: afterUp ? afterUp.url : null,
      signatureCustomerUrl: hasSignature ? sigUp.url : null
    };
  }

  // payload ร่วมของทั้งปุ่ม "บันทึกแบบร่าง" และ "บันทึกเสร็จและปิด Visit" — เหมือนกันทั้ง 3 ฟอร์ม
  // ต่างกันแค่ formType/serviceType และฟิลด์เฉพาะฟอร์มที่ฝังมาใน draft อยู่แล้วจากหน้าก่อนหน้า
  function buildPayload(status) {
    const draft = state.visitDraft;
    return {
      serviceId: state.visitContext.visitId,
      customerId: state.currentCustomer.customerId,
      zervaBookingId: state.visitContext.zervaBookingId,
      timeSlot: state.visitContext.timeSlot,
      serviceType: state.serviceType,
      formType: state.formType,
      status,
      visitDate: state.visitContext.visitDate || Date.now(),
      technique: draft.technique || draft.prevTechnique || null,
      colorUsed: draft.colorChoice || draft.prevColorUsed || null,
      intensity: draft.intensity || null,
      muscle: draft.muscle || null,
      shapeDesign: draft.shapeDesign === "Other" ? (draft.shapeDesignOther || "อื่นๆ") : (draft.shapeDesign || draft.prevShapeDesign || null),
      browGuard: draft.browGuard || null,
      satisfaction: draft.satisfaction || null,
      colorRetention: draft.colorRetention || null,
      wantsMoreChange: draft.wantsMoreChange || null,
      changeItems: draft.wantsMoreChange === "มี" ? (draft.changeItems || []) : [],
      redness: draft.redness || null,
      adherence: draft.adherence || null,
      mixRatio: formatMixRatio("mixRatioParts", draft),
      note: draft.adjustFromLast || draft.dontWant || null
    };
  }

  draftBtn.addEventListener("click", async () => {
    if (!state.currentCustomer || !state.visitContext) { show("home"); return; }
    draftBtn.disabled = true;
    const draft = state.visitDraft;
    const { beforePhotoUrl, afterPhotoUrl, signatureCustomerUrl } = await uploadAndBuildFolder();
    const payload = {
      ...buildPayload("draft"),
      beforePhotoUrl, afterPhotoUrl, signatureCustomerUrl,
      signatureTechUrl: "(ชนิสตา ศุภสุข) — ลายเซ็นคงที่",
      rawAnswers: { ...draft, beforePhotoDataUrl: undefined, afterPhotoDataUrl: undefined }
    };
    await saveVisit(payload);
    draftBtn.disabled = false;
    alert("บันทึกแบบร่างแล้ว — กลับมาทำต่อได้ทุกเมื่อ");
  });

  closeBtn.addEventListener("click", async () => {
    if (!state.currentCustomer || !state.visitContext) { show("home"); return; }
    clearFieldErrors();
    const draft = state.visitDraft;

    const mixRatio = formatMixRatio("mixRatioParts", draft);
    const mixEl = !mixRatio ? flagError('[data-mix-group="mixRatioParts"]') : null;
    const afterEl = !draft.afterPhotoDataUrl ? flagError('.photo-slot[data-photo-key="after"]') : null;
    const firstError = mixEl || afterEl;
    if (firstError) { firstError.scrollIntoView({ behavior: "smooth", block: "center" }); return; }

    closeBtn.disabled = true;
    const { beforePhotoUrl, afterPhotoUrl, signatureCustomerUrl } = await uploadAndBuildFolder();
    const payload = {
      ...buildPayload("เสร็จสิ้น"),
      mixRatio,
      beforePhotoUrl, afterPhotoUrl, signatureCustomerUrl,
      signatureTechUrl: "(ชนิสตา ศุภสุข) — ลายเซ็นคงที่",
      rawAnswers: { ...draft, beforePhotoDataUrl: undefined, afterPhotoDataUrl: undefined }
    };

    const res = await saveVisit(payload);
    closeBtn.disabled = false;
    state.lastSavedServiceId = res.serviceId;
    show("confirmation");
  });

  onEnter("techFields", render);
}
