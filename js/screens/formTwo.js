// formTwo.js — Form 2: สักทับรอยเก่า
// Wizard 5 ขั้น: ข้อมูลลูกค้า → สุขภาพ → ความต้องการ → การออกแบบ → ยืนยัน → techFields

import { show, onEnter } from "../router.js?v=20260808ae";
import { state } from "../state.js?v=20260808ae";
import { OPTIONS } from "../data/options.js?v=20260808ae";
import { CONSENT_BLOCKS, FORM2_EXTRA_CONSENT_BLOCK, INTENSITY_DISCLAIMER, PRE_SERVICE_AGREE_TEXT, FINAL_AGREEMENT_TEXT } from "../data/consentText.js?v=20260808ae";
import { radioField, chipGroup, textField, readinessBlockHtml, bindReadinessToggle, bindFieldEvents } from "../fieldHelpers.js?v=20260808ae";
import { createSignaturePad } from "../signaturePad.js?v=20260808ae";
import { escapeHtml, readFileAsDataUrl, draftPhotoUrl, hasDraftPhoto, selectionIncludesOther } from "../utils.js?v=20260808ae";
import { wireDraftSaveButton } from "../visitFlow.js?v=20260808ae";
import {
  mountFormChrome, setFooterWizardMode, wireCancelButton,
  customerConfirmStepHtml, bindCustomerConfirm, LAST_CONSULT_STEP
} from "../formWizard.js?v=20260808af";
import { updateMuscleEvaluation } from "../mockApi.js?v=20260808ae";

function consentBlocksHtml() {
  const blocks = [CONSENT_BLOCKS[0], FORM2_EXTRA_CONSENT_BLOCK, ...CONSENT_BLOCKS.slice(1)];
  return blocks.map((b) => `
    <div class="consent-block">
      <div class="src">${escapeHtml(b.title)}</div>
      ${escapeHtml(b.body).replace(/\n/g, "<br>")}
    </div>
  `).join("");
}

export function initFormTwo() {
  const container = document.getElementById("form2Body");
  const chromeEl = document.getElementById("form2Chrome");
  const nextBtn = document.getElementById("form2NextBtn");
  const prevBtn = document.getElementById("form2PrevBtn");
  const stepMetaEl = document.getElementById("form2StepMeta");
  let pad = null;

  function photoSlot(key, label) {
    const url = draftPhotoUrl(state.visitDraft, key);
    return `
      <div class="photo-slot" data-photo-key="${key}">
        ${url ? `<img src="${url}">` : `
          <label>
            <span class="photo-slot-icon"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg></span>
            <span>${escapeHtml(label)}</span>
            <input type="file" accept="image/*" data-photo-input="${key}">
          </label>`}
      </div>`;
  }

  function skinProfileReadOnlyHtml() {
    const sp = (state.currentCustomer && state.currentCustomer.skinProfile) || {};
    const row = (label, value) => `<div class="detail-row"><div class="detail-label">${escapeHtml(label)}</div><div class="detail-value">${escapeHtml(value || "-")}</div></div>`;
    return `
      <div class="box-quiet">
        ${row("ลักษณะผิวโดยรวม", sp.skinType)}
        ${row("ลักษณะเส้นขน", sp.hairLook)}
        ${row("ความหนาแน่นเส้นขน", sp.hairDensity)}
        ${row("ลักษณะขนคิ้ว", (sp.browShape || []).join(", "))}
        ${row("กล้ามเนื้อคิ้ว", sp.muscle || "ยังไม่ได้ประเมิน")}
      </div>`;
  }

  function stepNeedsHtml(draft) {
    return `
      <div class="form-section-title">ส่วนที่ 1 — ประเมินรอยเดิมและความต้องการ</div>
      <div class="step-group">
        <div class="step-group-title">ลักษณะรอยเก่าที่เห็นในปัจจุบัน <span class="required-star">*</span></div>
        ${chipGroup("oldMarkLook", OPTIONS.oldMarkLook, draft, true)}
      </div>
      <div class="step-group">
        <div class="step-group-title">โทนสีรอยเดิม</div>
        ${chipGroup("oldMarkTone", OPTIONS.oldMarkTone, draft, false)}
      </div>
      <div class="step-group">
        <div class="step-group-title">จุดที่ต้องการแก้ไขจากรอยเดิม <span class="required-star">*</span></div>
        ${chipGroup("fixPoints", OPTIONS.fixPoints, draft, true)}
      </div>
      <div class="step-group">
        <div class="step-group-title">ภาพรวมที่ต้องการ <span class="required-star">*</span></div>
        ${chipGroup("desiredOverview", OPTIONS.desiredOverview, draft, false)}
      </div>
      <div class="step-group">
        <div class="step-group-title">สิ่งที่ไม่อยากได้เด็ดขาด</div>
        ${chipGroup("notWanted", OPTIONS.form2NotWanted, draft, true)}
      </div>
      <div class="step-group">
        <div class="step-group-title">สีที่ต้องการ</div>
        ${radioField("colorChoice", OPTIONS.colorChoice8, draft)}
      </div>
      <div class="step-group">
        <div class="step-group-title">ระดับความเข้มหลังทำเสร็จวันนี้ <span class="required-star">*</span></div>
        ${radioField("intensity", OPTIONS.intensity, draft)}
        <p class="muted small mt-8">${escapeHtml(INTENSITY_DISCLAIMER)}</p>
      </div>
      <div class="step-group">
        <div class="step-group-title">ยอมรับเงื่อนไขก่อนเริ่มบริการ <span class="required-star">*</span></div>
        <details class="consent-block">
          <summary>เปิดอ่านเงื่อนไขก่อนเริ่มบริการ</summary>
          <div class="consent-body">${consentBlocksHtml()}</div>
        </details>
        <label class="agree-row" data-check-key="preServiceAgree">
          <input type="checkbox" id="f2PreAgree" ${draft.preServiceAgree ? "checked" : ""}>
          <span>${escapeHtml(PRE_SERVICE_AGREE_TEXT)}</span>
        </label>
      </div>`;
  }

  function stepDesignHtml(draft) {
    return `
      <div class="form-section-title">ส่วนที่ 2 — การออกแบบ</div>
      <div class="step-group">
        <div class="step-group-title">ประวัติผิวและคิ้วจากโปรไฟล์</div>
        ${skinProfileReadOnlyHtml()}
      </div>
      <div class="step-group">
        <div class="step-group-title">รูปก่อนทำ <span class="required-star">*</span></div>
        <div class="photo-row">${photoSlot("before", "ก่อนทำ")}</div>
      </div>
      <div class="step-group">
        <div class="step-group-title">เทคนิคที่เลือก</div>
        ${radioField("technique", OPTIONS.technique, draft)}
      </div>
      <div class="step-group">
        <div class="step-group-title">กล้ามเนื้อคิ้ว (กรอกหลังเช็ดคิ้วและวัดตอนออกแบบทรงจริง)</div>
        ${radioField("muscle", OPTIONS.muscleOptions, draft)}
        ${textField("muscleNote", "หมายเหตุ (ถ้ามี)", draft)}
      </div>
      <div class="step-group">
        <div class="step-group-title">ทรงที่ออกแบบ</div>
        ${chipGroup("shapeDesign", OPTIONS.form2Shape, draft, false)}
        ${textField("shapeDesignNote", "หมายเหตุ (ถ้ามี)", draft)}
      </div>
      <div class="step-group">
        <div class="step-group-title">การกันคิ้ว</div>
        ${radioField("browGuard", OPTIONS.browGuard, draft)}
      </div>`;
  }

  function stepConfirmHtml(draft) {
    return `
      <div class="form-section-title">ส่วนที่ 3 — สรุปข้อมูลก่อนเริ่มทำ</div>
      <div class="box-quiet">
        <div class="detail-row"><div class="detail-label">เทคนิคที่เลือก</div><div class="detail-value">${escapeHtml(draft.technique || "-")}</div></div>
        <div class="detail-row"><div class="detail-label">ลักษณะรอยเก่า</div><div class="detail-value">${escapeHtml((draft.oldMarkLook || []).map((v) => (v === "Other" ? (draft.oldMarkLookOther || "อื่น ๆ") : v)).join(", ") || "-")}</div></div>
        <div class="detail-row"><div class="detail-label">สีรอยเก่า</div><div class="detail-value">${escapeHtml(draft.oldMarkTone === "Other" ? (draft.oldMarkToneOther || "อื่น ๆ") : (draft.oldMarkTone || "-"))}</div></div>
        <div class="detail-row"><div class="detail-label">จุดที่ต้องการแก้ไข</div><div class="detail-value">${escapeHtml((draft.fixPoints || []).map((v) => (v === "Other" ? (draft.fixPointsOther || "อื่น ๆ") : v)).join(", ") || "-")}</div></div>
        <div class="detail-row"><div class="detail-label">ภาพรวมที่ต้องการ</div><div class="detail-value">${escapeHtml(draft.desiredOverview === "Other" ? (draft.desiredOverviewOther || "อื่น ๆ") : (draft.desiredOverview || "-"))}</div></div>
        <div class="detail-row"><div class="detail-label">สิ่งที่ไม่อยากได้เด็ดขาด</div><div class="detail-value">${escapeHtml((draft.notWanted || []).map((v) => (v === "Other" ? (draft.notWantedOther || "อื่น ๆ") : v)).join(", ") || "-")}</div></div>
        <div class="detail-row"><div class="detail-label">ทรงที่ออกแบบ</div><div class="detail-value">${escapeHtml(draft.shapeDesign === "Other" ? (draft.shapeDesignOther || "อื่น ๆ") : (draft.shapeDesign || "-"))}</div></div>
        <div class="detail-row"><div class="detail-label">สีที่เลือก</div><div class="detail-value">${escapeHtml(draft.colorChoice || "-")}</div></div>
        <div class="detail-row"><div class="detail-label">ระดับความเข้มหลังทำเสร็จวันนี้</div><div class="detail-value">${escapeHtml(draft.intensity || "-")}</div></div>
      </div>
      <div class="step-group-title">ข้อตกลงและความยินยอม <span class="required-star">*</span></div>
      <div class="step-group" data-radio-key="finalAgree">
        <label class="agree-row">
          <input type="radio" name="finalAgree" value="agreed" ${draft.finalAgree === "agreed" ? "checked" : ""}>
          <span>${escapeHtml(FINAL_AGREEMENT_TEXT)}</span>
        </label>
      </div>
      <div class="step-group-title">ลายเซ็นลูกค้า <span class="required-star">*</span></div>
      <div class="sig-wrap"><canvas id="f2SigCanvas"></canvas></div>
      <div class="sig-actions"><button id="f2SigClearBtn" type="button">ล้างลายเซ็น</button></div>`;
  }

  function stepHtml(step, draft) {
    if (step === 0) return customerConfirmStepHtml(draft);
    if (step === 1) return readinessBlockHtml(draft);
    if (step === 2) return stepNeedsHtml(draft);
    if (step === 3) return stepDesignHtml(draft);
    return stepConfirmHtml(draft);
  }

  function render() {
    const draft = state.visitDraft;
    const step = Math.max(0, Math.min(state.formStepIndex || 0, LAST_CONSULT_STEP));
    state.formStepIndex = step;
    pad = null;
    mountFormChrome(chromeEl, step);
    container.innerHTML = stepHtml(step, draft);
    setFooterWizardMode(prevBtn, nextBtn, stepMetaEl, { stepIndex: step });
    container.scrollTop = 0;

    if (step === 0) bindCustomerConfirm(container, draft);
    if (step === 2) {
      document.getElementById("f2PreAgree")?.addEventListener("change", (e) => {
        draft.preServiceAgree = e.target.checked;
        e.target.closest(".field-error")?.classList.remove("field-error");
      });
    }
    if (step === 3) {
      container.querySelectorAll("[data-photo-input]").forEach((inputEl) => {
        inputEl.addEventListener("change", async (e) => {
          const file = e.target.files[0];
          if (!file) return;
          state.visitDraft[inputEl.dataset.photoInput + "PhotoDataUrl"] = await readFileAsDataUrl(file);
          render();
        });
      });
    }
    if (step === 4) {
      pad = createSignaturePad(document.getElementById("f2SigCanvas"));
      document.getElementById("f2SigClearBtn")?.addEventListener("click", () => pad.clear());
    }
  }

  bindFieldEvents(container, state.visitDraft, (changedRadioName) => {
    bindReadinessToggle(container, state.visitDraft, changedRadioName);
  });

  if (container) {
    ["click", "input", "change", "mousedown", "touchstart"].forEach((evt) => {
      container.addEventListener(evt, (e) => {
        e.target.closest(".field-error")?.classList.remove("field-error");
      });
    });
  }

  function clearFieldErrors() { container.querySelectorAll(".field-error").forEach((el) => el.classList.remove("field-error")); }
  function flagError(selector) { const el = container.querySelector(selector); if (el) el.classList.add("field-error"); return el; }
  function scrollToFirstError(...els) { const first = els.find(Boolean); if (first) first.scrollIntoView({ behavior: "smooth", block: "center" }); return !first; }

  function validateStep(step) {
    clearFieldErrors();
    const draft = state.visitDraft;
    if (step === 0) {
      return scrollToFirstError(!draft.customerInfoConfirmed ? flagError('[data-check-key="customerInfoConfirmed"]') : null);
    }
    if (step === 1) {
      return scrollToFirstError(
        !draft.hasScar ? flagError('[data-radio-key="hasScar"]') : null,
        draft.hasScar === "มี" && !(draft.scarCause || []).length ? flagError('[data-chip-key="scarCause"]') : null,
        draft.hasScar === "มี" && selectionIncludesOther(draft.scarCause) && !draft.scarCauseOther?.trim() ? flagError('[data-other-key="scarCauseOther"]') : null,
        !draft.irritation7d ? flagError('[data-radio-key="irritation7d"]') : null,
        draft.irritation7d === "มี" && !draft.irritationDetail?.trim() ? flagError('[data-text-key="irritationDetail"]') : null,
        !draft.allergyInfo ? flagError('[data-radio-key="allergyInfo"]') : null,
        draft.allergyInfo === "มี" && !draft.allergyDetail?.trim() ? flagError('[data-text-key="allergyDetail"]') : null
      );
    }
    if (step === 2) {
      return scrollToFirstError(
        !(draft.oldMarkLook || []).length ? flagError('[data-chip-key="oldMarkLook"]') : null,
        !(draft.fixPoints || []).length ? flagError('[data-chip-key="fixPoints"]') : null,
        !draft.desiredOverview ? flagError('[data-chip-key="desiredOverview"]') : null,
        !draft.intensity ? flagError('[data-radio-key="intensity"]') : null,
        !draft.preServiceAgree ? flagError('[data-check-key="preServiceAgree"]') : null
      );
    }
    if (step === 3) {
      return scrollToFirstError(!hasDraftPhoto(draft, "before") ? flagError('[data-photo-key="before"]') : null);
    }
    if (step === 4) {
      const alreadySigned = Boolean(draft.signatureCustomerDataUrl);
      return scrollToFirstError(
        !draft.finalAgree ? flagError('[data-radio-key="finalAgree"]') : null,
        (!pad || (pad.isEmpty() && !alreadySigned)) ? flagError(".sig-wrap") : null
      );
    }
    return true;
  }

  prevBtn?.addEventListener("click", () => {
    if ((state.formStepIndex || 0) <= 0) return;
    state.formStepIndex -= 1;
    render();
  });
  wireCancelButton(document.getElementById("form2CancelBtn"));
  wireDraftSaveButton(document.getElementById("form2DraftBtn"));

  nextBtn?.addEventListener("click", async () => {
    if (!state.currentCustomer || !state.visitContext) { show("home"); return; }
    const step = state.formStepIndex || 0;
    if (!validateStep(step)) return;
    if (step < LAST_CONSULT_STEP) {
      state.formStepIndex = step + 1;
      render();
      return;
    }
    const draft = state.visitDraft;
    nextBtn.disabled = true;
    if (pad && !pad.isEmpty()) draft.signatureCustomerDataUrl = pad.toDataURL();
    draft.agreedAt = Date.now();
    try {
      if (draft.muscle) await updateMuscleEvaluation(state.currentCustomer.customerId, draft.muscle, draft.muscleNote || "");
    } catch (e) {
      console.warn("updateMuscleEvaluation failed:", e);
    }
    state.formStepIndex = 5;
    nextBtn.disabled = false;
    show("techFields");
  });

  onEnter("form2", () => {
    if (state.formStepIndex == null || state.formStepIndex > LAST_CONSULT_STEP) {
      state.formStepIndex = state.formStepIndex === 5 ? LAST_CONSULT_STEP : 0;
    }
    render();
  });
}
