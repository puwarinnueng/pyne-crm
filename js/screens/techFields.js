// techFields.js — ส่วนบันทึกหลังทำ ใช้ร่วมกันทั้ง Form 1/2/3 (สัดส่วนสีที่ใช้, ความแดงผิว, ความติดสี, รูปหลังทำ, ลายเซ็นช่าง)
// เหมือนกันทุกฟอร์มตามสเปก ("กติกากลางของทั้ง 3 ฟอร์ม") จึงมีหน้าเดียวใช้ร่วมกัน แยกแค่ payload ตอนบันทึก

import { show, onEnter } from "../router.js?v=20260808ae";
import { state } from "../state.js?v=20260808ae";
import { saveVisit, uploadImage, ensureVisitFolder } from "../mockApi.js?v=20260808ae";
import { appAlert } from "../dialogs.js?v=20260808ae";
import { OPTIONS } from "../data/options.js?v=20260808ae";
import { radioField, mixRatioField, formatMixRatio, bindFieldEvents, bindMixRatioEvents } from "../fieldHelpers.js?v=20260808ae";
import {
  readFileAsDataUrl, ensureVisitSessionKey, draftPhotoUrl, hasDraftPhoto, selectionIncludesOther,
  resolveTouchupTechnique, resolveTouchupShape, resolveTouchupColor
} from "../utils.js?v=20260808ae";
import { TECH_SIGNATURE_DATA_URL } from "../data/techSignature.js?v=20260808ae";
import { promptAfterDraftSaved, setDraftSaveLoading } from "../visitFlow.js?v=20260808ae";
import { showToast } from "../toast.js?v=20260808ae";
import { mountVisitStripOnly, wireCancelButton, LAST_CONSULT_STEP } from "../formWizard.js?v=20260808ae";

export function initTechFields() {
  const body = document.getElementById("techBody");
  const chromeEl = document.getElementById("techChrome");
  const draftBtn = document.getElementById("tuSaveDraftBtn");
  const closeBtn = document.getElementById("tuSaveCloseBtn");

  function photoSlot(key, label) {
    const url = draftPhotoUrl(state.visitDraft, key);
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
    state.formStepIndex = 5;
    mountVisitStripOnly(chromeEl);
    body.innerHTML = `
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
        <div class="step-group-title">รูปหลังทำ <span class="required-star">*</span></div>
        <div class="photo-row">${photoSlot("after", "หลังทำ")}</div>
      </div>

      <div class="step-group">
        <div class="step-group-title">ลายเซ็นช่างผู้ให้บริการ</div>
        <div class="tech-sig-wrap">
          <img src="${TECH_SIGNATURE_DATA_URL}" alt="ลายเซ็นช่าง">
        </div>
        <p class="muted small text-center">(ชนิสตา ศุภสุข)</p>
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

  document.getElementById("techBackBtn")?.addEventListener("click", () => {
    state.formStepIndex = LAST_CONSULT_STEP;
    const screenId = state.formType === "form3" ? "formTouchup" : (state.formType || "form1");
    show(screenId);
  });
  wireCancelButton(document.getElementById("techCancelBtn"));

  function clearFieldErrors() {
    body.querySelectorAll(".field-error").forEach((el) => el.classList.remove("field-error"));
  }
  function flagError(selector) {
    const el = body.querySelector(selector);
    if (el) el.classList.add("field-error");
    return el;
  }

  function missingRequiredBeforeClose(draft) {
    if (!hasDraftPhoto(draft, "before")) return "รูปก่อนทำ";
    if (!hasDraftPhoto(draft, "after")) return "รูปหลังทำ";
    if (!draft.finalAgree) return "ใบยินยอม";
    if (!(draft.signatureCustomerDataUrl || draft.existingSignatureCustomerUrl)) return "ลายเซ็นลูกค้า";
    if (!draft.hasScar || !draft.irritation7d || !draft.allergyInfo) return "ข้อมูลความพร้อมก่อนรับบริการ";
    if (draft.hasScar === "มี" && !(draft.scarCause || []).length) return "สาเหตุแผลเป็น";
    if (draft.hasScar === "มี" && selectionIncludesOther(draft.scarCause) && !draft.scarCauseOther?.trim()) return "รายละเอียดแผลเป็น";
    if (draft.irritation7d === "มี" && !draft.irritationDetail?.trim()) return "รายละเอียดความระคายเคือง";
    if (draft.allergyInfo === "มี" && !draft.allergyDetail?.trim()) return "รายละเอียดอาการแพ้/ข้อมูลสำคัญ";
    if (state.formType === "form1") {
      if (!(draft.concerns || []).length) return "ปัญหาหลักที่กังวล";
      if (!draft.desiredOverview) return "ภาพรวมที่ต้องการ";
      if (!draft.intensity) return "ระดับความเข้ม";
      if (!draft.preServiceAgree) return "ยอมรับเงื่อนไขก่อนเริ่มบริการ";
    }
    if (state.formType === "form2") {
      if (!(draft.oldMarkLook || []).length) return "ลักษณะรอยเก่า";
      if (!(draft.fixPoints || []).length) return "จุดที่ต้องการแก้ไข";
      if (!draft.desiredOverview) return "ภาพรวมที่ต้องการ";
      if (!draft.intensity) return "ระดับความเข้ม";
      if (!draft.preServiceAgree) return "ยอมรับเงื่อนไขก่อนเริ่มบริการ";
    }
    if (state.formType === "form3") {
      if (!draft.satisfaction) return "ความพึงพอใจหลังลอก";
      if (!draft.colorRetention) return "การติดสีโดยรวม";
      if (!draft.wantsMoreChange) return "มีสิ่งที่ต้องการแก้ไขเพิ่มเติมหรือไม่";
      if (draft.wantsMoreChange === "มี" && !(draft.changeItems || []).length) return "สิ่งที่ต้องการแก้ไขเพิ่มเติม";
      if (!draft.intensity) return "ระดับความเข้ม";
      if (!(draft.technique || draft.prevTechnique)) return "เทคนิคที่เลือก";
      if (!(draft.colorChoice || draft.prevColorUsed)) return "สีที่เลือก";
      if (!(draft.shapeDesign || draft.prevShapeDesign)) return "ทรงที่ออกแบบ";
    }
    return "";
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
      beforePhotoUrl: beforeUp ? beforeUp.url : (draft.existingBeforePhotoUrl || null),
      afterPhotoUrl: afterUp ? afterUp.url : (draft.existingAfterPhotoUrl || null),
      signatureCustomerUrl: hasSignature ? sigUp.url : (draft.existingSignatureCustomerUrl || null)
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
      technique: resolveTouchupTechnique(draft) || draft.prevTechnique || null,
      colorUsed: resolveTouchupColor(draft) || draft.prevColorUsed || null,
      intensity: draft.intensity || null,
      muscle: draft.muscle || null,
      shapeDesign: resolveTouchupShape(draft) || draft.prevShapeDesign || null,
      browGuard: draft.browGuard || null,
      satisfaction: draft.satisfaction || null,
      colorRetention: draft.colorRetention || null,
      wantsMoreChange: draft.wantsMoreChange || null,
      changeItems: draft.wantsMoreChange === "มี" ? (draft.changeItems || []) : [],
      redness: draft.redness || null,
      adherence: draft.adherence || null,
      mixRatio: formatMixRatio("mixRatioParts", draft),
      note: [draft.shapeDesignNote, draft.adjustFromLast, draft.dontWant].filter((v) => v && v.trim()).join(" / ") || null
    };
  }

  draftBtn.addEventListener("click", async () => {
    if (!state.currentCustomer || !state.visitContext) { show("home"); return; }
    setDraftSaveLoading(draftBtn, true);
    const draft = state.visitDraft;
    try {
      const { beforePhotoUrl, afterPhotoUrl, signatureCustomerUrl } = await uploadAndBuildFolder();
      const payload = {
        ...buildPayload("draft"),
        beforePhotoUrl, afterPhotoUrl, signatureCustomerUrl,
        signatureTechUrl: "(ชนิสตา ศุภสุข) — ลายเซ็นคงที่",
        rawAnswers: {
          ...draft,
          formStepIndex: state.formStepIndex ?? 5,
          beforePhotoDataUrl: undefined,
          afterPhotoDataUrl: undefined
        }
      };
      await saveVisit(payload);
      await promptAfterDraftSaved();
    } catch (e) {
      console.warn("saveVisit (draft) failed:", e);
      await appAlert("บันทึกร่างไม่สำเร็จ ลองเช็คเน็ตแล้วกดอีกครั้ง", { title: "บันทึกไม่สำเร็จ" });
    } finally {
      setDraftSaveLoading(draftBtn, false);
    }
  });

  closeBtn.addEventListener("click", async () => {
    if (!state.currentCustomer || !state.visitContext) { show("home"); return; }
    clearFieldErrors();
    const draft = state.visitDraft;

    const mixRatio = formatMixRatio("mixRatioParts", draft);
    const missingBeforeClose = missingRequiredBeforeClose(draft);
    const mixEl = !mixRatio ? flagError('[data-mix-group="mixRatioParts"]') : null;
    const afterEl = !hasDraftPhoto(draft, "after") ? flagError('.photo-slot[data-photo-key="after"]') : null;
    const firstError = mixEl || afterEl;
    if (missingBeforeClose) {
      await appAlert(`ยังปิดคิวไม่ได้ — ยังขาด: ${missingBeforeClose}`, { title: "ข้อมูลยังไม่ครบ" });
      return;
    }
    if (firstError) { firstError.scrollIntoView({ behavior: "smooth", block: "center" }); return; }

    closeBtn.disabled = true;
    try {
      const { beforePhotoUrl, afterPhotoUrl, signatureCustomerUrl } = await uploadAndBuildFolder();
      const payload = {
        ...buildPayload("completed"),
        mixRatio,
        beforePhotoUrl, afterPhotoUrl, signatureCustomerUrl,
        signatureTechUrl: "(ชนิสตา ศุภสุข) — ลายเซ็นคงที่",
        rawAnswers: { ...draft, beforePhotoDataUrl: undefined, afterPhotoDataUrl: undefined }
      };

      // ส่ง serviceId เดิมจาก Step 3 เสมอ (state.visitContext.visitId) เพื่อให้ saveVisit() ฝั่งเซิร์ฟเวอร์
      // "อัปเดตแถวเดิม" แทนสร้างแถวใหม่ — ถ้า state.visitContext หลุดไปคนละตัวจาก race/reload กลางทาง
      // (เช่น รีเฟรชหน้าระหว่างกรอกฟอร์ม) payload.serviceId จะไม่ตรงกับแถวเดิมในชีต แล้วได้ Visit ซ้อนกัน
      // เช็คซ้ำตรงนี้กันเคสที่ visitContext หายไประหว่างทาง
      if (!payload.serviceId) throw new Error("ไม่พบ Visit ID — กรุณากลับไปเริ่มใหม่จากโปรไฟล์ลูกค้า");

      const res = await saveVisit(payload);
      state.lastSavedServiceId = res.serviceId;
      showToast("บันทึกคิวแล้ว", { tone: "ok" });
      show("confirmation");
    } catch (e) {
      console.warn("saveVisit (close) failed:", e);
      await appAlert("บันทึกไม่สำเร็จ ลองเช็คเน็ตอีกครั้ง ข้อมูลในหน้านี้ยังอยู่", { title: "บันทึกไม่สำเร็จ" });
      closeBtn.disabled = false;
    }
  });

  onEnter("techFields", render);
}
