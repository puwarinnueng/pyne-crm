// formOne.js — Form 1: สักคิ้วครั้งแรก
// Wizard 5 ขั้น: ข้อมูลลูกค้า → สุขภาพ → ความต้องการ → การออกแบบ → ยืนยัน → techFields

import { show, onEnter } from "../router.js?v=20260808ae";
import { state } from "../state.js?v=20260808ae";
import { OPTIONS } from "../data/options.js?v=20260808ae";
import { CONSENT_BLOCKS, INTENSITY_DISCLAIMER, PRE_SERVICE_AGREE_TEXT, FINAL_AGREEMENT_TEXT } from "../data/consentText.js?v=20260808ae";
import { radioField, chipGroup, textField, readinessBlockHtml, bindReadinessToggle, bindFieldEvents } from "../fieldHelpers.js?v=20260808ae";
import { createSignaturePad } from "../signaturePad.js?v=20260808ae";
import { escapeHtml, readFileAsDataUrl, draftPhotoUrl, hasDraftPhoto, selectionIncludesOther } from "../utils.js?v=20260808ae";
import { wireDraftSaveButton } from "../visitFlow.js?v=20260808ae";
import {
  mountFormChrome, setFooterWizardMode, wireCancelButton,
  customerConfirmStepHtml, bindCustomerConfirm, LAST_CONSULT_STEP
} from "../formWizard.js?v=20260808ae";
import { updateMuscleEvaluation } from "../mockApi.js?v=20260808ae";

function consentBlocksHtml() {
  return CONSENT_BLOCKS.map((b) => `
    <div class="consent-block">
      <div class="src">${escapeHtml(b.title)}</div>
      ${escapeHtml(b.body).replace(/\n/g, "<br>")}
    </div>
  `).join("");
}

function formOneSummaryValues(draft) {
  return {
    technique: draft.technique || "-",
    desiredOverview: draft.desiredOverview === "Other" ? (draft.desiredOverviewOther || "อื่น ๆ") : (draft.desiredOverview || "-"),
    colorChoice: draft.colorChoice || "-",
    shapeDesign: draft.shapeDesign === "Other" ? (draft.shapeDesignOther || "อื่น ๆ") : (draft.shapeDesign || "-"),
    notWanted: (draft.notWanted || []).map((v) => (v === "Other" ? (draft.notWantedOther || "อื่น ๆ") : v)).join(", ") || "-",
    intensity: draft.intensity || "-"
  };
}

export function initFormOne() {
  const container = document.getElementById("form1Body");
  const chromeEl = document.getElementById("form1Chrome");
  const nextBtn = document.getElementById("form1NextBtn");
  const prevBtn = document.getElementById("form1PrevBtn");
  const stepMetaEl = document.getElementById("form1StepMeta");
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

  function updateSummary() {
    const values = formOneSummaryValues(state.visitDraft);
    Object.keys(values).forEach((key) => {
      const el = container.querySelector(`[data-summary-key="${key}"]`);
      if (el) el.textContent = values[key];
    });
  }

  function stepCustomerHtml(draft) {
    return customerConfirmStepHtml(draft);
  }

  function stepHealthHtml(draft) {
    return readinessBlockHtml(draft);
  }

  function stepNeedsHtml(draft) {
    return `
      <div class="form-section-title">ส่วนที่ 1 — ความต้องการของลูกค้า</div>
      <div class="step-group">
        <div class="step-group-title">ปัญหาหลักที่กังวล <span class="required-star">*</span></div>
        ${chipGroup("concerns", OPTIONS.form1Concerns, draft, true)}
      </div>
      <div class="step-group">
        <div class="step-group-title">ภาพรวมที่ต้องการ <span class="required-star">*</span></div>
        ${chipGroup("desiredOverview", OPTIONS.desiredOverview, draft, false)}
      </div>
      <div class="step-group">
        <div class="step-group-title">สิ่งที่ไม่อยากได้เด็ดขาด</div>
        ${chipGroup("notWanted", OPTIONS.form1NotWanted, draft, true)}
      </div>
      <div class="step-group">
        <div class="step-group-title">สีที่ต้องการ</div>
        ${radioField("colorChoice", OPTIONS.form1Color, draft)}
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
          <input type="checkbox" id="f1PreAgree" ${draft.preServiceAgree ? "checked" : ""}>
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
        <div class="step-group-title">ทรงคิ้ว</div>
        ${chipGroup("shapeDesign", OPTIONS.form1Shape, draft, false)}
        ${textField("shapeDesignNote", "หมายเหตุ (ถ้ามี)", draft)}
      </div>
      <div class="step-group">
        <div class="step-group-title">การกันคิ้ว</div>
        ${radioField("browGuard", OPTIONS.browGuard, draft)}
      </div>`;
  }

  function stepConfirmHtml(draft) {
    const summary = formOneSummaryValues(draft);
    return `
      <div class="form-section-title">ส่วนที่ 3 — สรุปข้อมูลก่อนเริ่มทำ</div>
      <div class="box-quiet">
        <div class="detail-row"><div class="detail-label">เทคนิคที่เลือก</div><div class="detail-value" data-summary-key="technique">${escapeHtml(summary.technique)}</div></div>
        <div class="detail-row"><div class="detail-label">ภาพรวมที่ต้องการ</div><div class="detail-value" data-summary-key="desiredOverview">${escapeHtml(summary.desiredOverview)}</div></div>
        <div class="detail-row"><div class="detail-label">สีที่เลือก</div><div class="detail-value" data-summary-key="colorChoice">${escapeHtml(summary.colorChoice)}</div></div>
        <div class="detail-row"><div class="detail-label">ทรงที่ออกแบบ</div><div class="detail-value" data-summary-key="shapeDesign">${escapeHtml(summary.shapeDesign)}</div></div>
        <div class="detail-row"><div class="detail-label">สิ่งที่ไม่อยากได้เด็ดขาด</div><div class="detail-value" data-summary-key="notWanted">${escapeHtml(summary.notWanted)}</div></div>
        <div class="detail-row"><div class="detail-label">ระดับความเข้มหลังทำเสร็จวันนี้</div><div class="detail-value" data-summary-key="intensity">${escapeHtml(summary.intensity)}</div></div>
      </div>
      <div class="step-group-title">ข้อตกลงและความยินยอม <span class="required-star">*</span></div>
      <div class="step-group" data-radio-key="finalAgree">
        <label class="agree-row">
          <input type="radio" name="finalAgree" value="agreed" ${draft.finalAgree === "agreed" ? "checked" : ""}>
          <span>${escapeHtml(FINAL_AGREEMENT_TEXT)}</span>
        </label>
      </div>
      <div class="step-group-title">ลายเซ็นลูกค้า <span class="required-star">*</span></div>
      <div class="sig-wrap"><canvas id="f1SigCanvas"></canvas></div>
      <div class="sig-actions"><button id="f1SigClearBtn" type="button">ล้างลายเซ็น</button></div>`;
  }

  function stepHtml(step, draft) {
    if (step === 0) return stepCustomerHtml(draft);
    if (step === 1) return stepHealthHtml(draft);
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
      document.getElementById("f1PreAgree")?.addEventListener("change", (e) => {
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
      pad = createSignaturePad(document.getElementById("f1SigCanvas"));
      document.getElementById("f1SigClearBtn")?.addEventListener("click", () => pad.clear());
    }
  }

  if (container) {
    bindFieldEvents(container, state.visitDraft, (changedRadioName) => {
      bindReadinessToggle(container, state.visitDraft, changedRadioName);
      updateSummary();
    });

    container.addEventListener("input", (e) => {
      if (e.target.dataset.textKey || e.target.dataset.otherKey) updateSummary();
    });

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
        !(draft.concerns || []).length ? flagError('[data-chip-key="concerns"]') : null,
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
  wireCancelButton(document.getElementById("form1CancelBtn"));
  wireDraftSaveButton(document.getElementById("form1DraftBtn"));

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
      if (draft.muscle) {
        await updateMuscleEvaluation(state.currentCustomer.customerId, draft.muscle, draft.muscleNote || "");
      }
    } catch (e) {
      console.warn("updateMuscleEvaluation failed:", e);
    }

    state.formStepIndex = 5;
    nextBtn.disabled = false;
    show("techFields");
  });

  onEnter("form1", () => {
    if (state.formStepIndex == null || state.formStepIndex > LAST_CONSULT_STEP) {
      state.formStepIndex = state.formStepIndex === 5 ? LAST_CONSULT_STEP : 0;
    }
    render();
  });
}
