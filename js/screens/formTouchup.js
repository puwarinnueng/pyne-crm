// formTouchup.js — Form 3 "เติมสีคิ้ว"
// Wizard 5 ขั้น: ข้อมูลลูกค้า(+ประวัติ) → สุขภาพ → ติดตามผล+Before → การออกแบบ → ยืนยัน → techFields

import { show, onEnter } from "../router.js?v=20260808ae";
import { state } from "../state.js?v=20260808ae";
import { getHistoryByCustomer } from "../mockApi.js?v=20260808ae";
import { OPTIONS } from "../data/options.js?v=20260808ae";
import { INTENSITY_DISCLAIMER, FINAL_AGREEMENT_TEXT } from "../data/consentText.js?v=20260808ae";
import { radioField, chipGroup, readinessBlockHtml, bindReadinessToggle, bindFieldEvents } from "../fieldHelpers.js?v=20260808ae";
import { createSignaturePad } from "../signaturePad.js?v=20260808ae";
import {
  formatDate, escapeHtml, readFileAsDataUrl, isCompletedBrowVisit, draftPhotoUrl, hasDraftPhoto,
  isOtherOption, selectionIncludesOther, TOUCHUP_ORIGINAL,
  resolveTouchupTechnique, resolveTouchupShape, resolveTouchupColor
} from "../utils.js?v=20260808ae";
import { wireDraftSaveButton } from "../visitFlow.js?v=20260808ae";
import {
  mountFormChrome, setFooterWizardMode, wireCancelButton,
  customerConfirmStepHtml, bindCustomerConfirm, LAST_CONSULT_STEP
} from "../formWizard.js?v=20260808ae";

function monthsSince(ts) {
  if (!ts) return "-";
  const months = Math.max(0, Math.round((Date.now() - ts) / (1000 * 60 * 60 * 24 * 30)));
  return `${months} เดือน`;
}

function row(label, value) {
  return `<div class="detail-row"><div class="detail-label">${escapeHtml(label)}</div><div class="detail-value">${escapeHtml(value || "-")}</div></div>`;
}

function photoBoxReadOnly(url) {
  return `<div class="photo-slot">${url ? `<img src="${url}">` : `<span class="muted small">ไม่มีรูป</span>`}</div>`;
}

function historyCtxFromRows(history) {
  const browVisits = history.filter(isCompletedBrowVisit);
  if (!browVisits.length) return null;
  return { first: browVisits[browVisits.length - 1], last: browVisits[0] };
}

async function loadHistoryCtx(customerId) {
  const cached = Array.isArray(state.currentCustomerHistory) ? state.currentCustomerHistory : null;
  if (cached && cached.some((v) => v.customerId === customerId)) {
    return historyCtxFromRows(cached);
  }
  const history = await getHistoryByCustomer(customerId);
  state.currentCustomerHistory = history;
  return historyCtxFromRows(history);
}

function applyTouchupDefaults(draft, ctx) {
  if (!ctx) return;
  if (!draft.prevTechnique) draft.prevTechnique = ctx.last.technique || null;
  if (!draft.prevShapeDesign) draft.prevShapeDesign = ctx.last.shapeDesign || null;
  if (!draft.prevColorUsed) draft.prevColorUsed = ctx.last.colorUsed || null;

  if (!draft.technique) {
    draft.technique = TOUCHUP_ORIGINAL.technique;
  } else if (draft.technique === draft.prevTechnique) {
    draft.technique = TOUCHUP_ORIGINAL.technique;
  }

  if (!draft.shapeDesign) {
    draft.shapeDesign = TOUCHUP_ORIGINAL.shape;
  } else if (draft.shapeDesign === draft.prevShapeDesign) {
    draft.shapeDesign = TOUCHUP_ORIGINAL.shape;
  }

  if (!draft.colorChoice) {
    draft.colorChoice = TOUCHUP_ORIGINAL.color;
  } else if (draft.colorChoice === draft.prevColorUsed) {
    draft.colorChoice = TOUCHUP_ORIGINAL.color;
  }
}

export function initFormTouchup() {
  const container = document.getElementById("touchupBody");
  const chromeEl = document.getElementById("touchupChrome");
  const nextBtn = document.getElementById("tuNextBtn");
  const prevBtn = document.getElementById("touchupPrevBtn");
  const stepMetaEl = document.getElementById("touchupStepMeta");
  let pad = null;
  let historyCtx = null;

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

  function historyBlockHtml() {
    if (!historyCtx) {
      return `
        <div class="form-section-title">ส่วนที่ 1 — ระบบดึงประวัติเดิม</div>
        <div class="empty-hint">ไม่พบประวัติเดิม</div>`;
    }
    const { first, last } = historyCtx;
    return `
      <div class="form-section-title">ส่วนที่ 1 — ระบบดึงประวัติเดิม</div>
      <div class="box-quiet">
        ${row("วันที่สักครั้งแรก", formatDate(first.visitDate))}
        ${row("ระยะเวลาจากครั้งแรกถึงวันนี้", monthsSince(first.visitDate))}
        ${row("เทคนิคเดิม", last.technique)}
        ${row("สีเดิม", last.colorUsed)}
        ${row("กล้ามเนื้อคิ้วล่าสุด", (state.currentCustomer && state.currentCustomer.skinProfile && state.currentCustomer.skinProfile.muscle) || "ยังไม่ได้ประเมิน")}
        <div class="photo-row mt-12">
          ${photoBoxReadOnly(first.beforePhotoUrl)}
          ${photoBoxReadOnly(first.afterPhotoUrl)}
        </div>
        <button type="button" class="btn btn-outline mt-8" data-open-history>ดูรายละเอียด</button>
      </div>`;
  }

  function techniqueOptions() {
    return [TOUCHUP_ORIGINAL.technique, ...OPTIONS.technique];
  }

  function techniqueLabel(opt) {
    if (opt === TOUCHUP_ORIGINAL.technique) {
      return `เทคนิคเดิม: ${(historyCtx && historyCtx.last.technique) || state.visitDraft.prevTechnique || "-"}`;
    }
    return opt;
  }

  function shapeOptions() {
    return [TOUCHUP_ORIGINAL.shape, ...OPTIONS.touchupShape];
  }

  function shapeLabel(opt) {
    if (opt === TOUCHUP_ORIGINAL.shape) {
      return `ทรงเดิม: ${(historyCtx && historyCtx.last.shapeDesign) || state.visitDraft.prevShapeDesign || "-"}`;
    }
    return opt === "Other" ? "อื่น ๆ" : opt;
  }

  function colorOptions() {
    return [TOUCHUP_ORIGINAL.color, ...OPTIONS.colorChoice8];
  }

  function colorLabel(opt) {
    if (opt === TOUCHUP_ORIGINAL.color) {
      return `สีเดิม: ${(historyCtx && historyCtx.last.colorUsed) || state.visitDraft.prevColorUsed || "-"}`;
    }
    return opt;
  }

  function stepNeedsHtml(draft) {
    return `
      <div class="form-section-title">ส่วนที่ 2 — ติดตามผลหลังลอก</div>
      <div class="step-group">
        <div class="step-group-title">ความพึงพอใจกับผลลัพธ์หลังลอก <span class="required-star">*</span></div>
        ${radioField("satisfaction", OPTIONS.touchupSatisfaction, draft)}
      </div>
      <div class="step-group">
        <div class="step-group-title">การติดสีโดยรวม <span class="required-star">*</span></div>
        ${radioField("colorRetention", OPTIONS.touchupColorRetention, draft)}
      </div>
      <div class="step-group">
        <div class="step-group-title">มีสิ่งที่ต้องการแก้ไขเพิ่มเติมหรือไม่ <span class="required-star">*</span></div>
        ${radioField("wantsMoreChange", OPTIONS.touchupWantsMoreChange, draft)}
      </div>
      <div class="step-group" id="changeItemsBlock" ${draft.wantsMoreChange === "มี" ? "" : "hidden"}>
        <div class="step-group-title">สิ่งที่ต้องการแก้ไขเพิ่มเติม</div>
        ${chipGroup("changeItems", OPTIONS.touchupChangeItems, draft, true)}
      </div>
      <div class="step-group">
        <div class="step-group-title">ระดับความเข้มหลังทำเสร็จวันนี้ <span class="required-star">*</span></div>
        ${radioField("intensity", OPTIONS.intensity, draft)}
        <p class="muted small mt-8">${escapeHtml(INTENSITY_DISCLAIMER)}</p>
      </div>
      <div class="step-group">
        <div class="step-group-title">รูป Before <span class="required-star">*</span></div>
        <div class="photo-row">${photoSlot("before", "ก่อนทำ")}</div>
      </div>`;
  }

  function stepDesignHtml(draft) {
    return `
      <div class="form-section-title">ส่วนที่ 3 — การออกแบบ</div>
      <div class="step-group">
        <div class="step-group-title">เทคนิคที่เลือกใช้ครั้งนี้</div>
        ${radioField("technique", techniqueOptions(), draft, techniqueLabel)}
      </div>
      <div class="step-group">
        <div class="step-group-title">ทรงที่ออกแบบ</div>
        ${radioField("shapeDesign", shapeOptions(), draft, shapeLabel)}
        ${draft.shapeDesign === "Other" || isOtherOption(draft.shapeDesign)
          ? `<input type="text" class="input other-input mt-8" data-other-key="shapeDesignOther" placeholder="ระบุ..." value="${escapeHtml(draft.shapeDesignOther || "")}">`
          : ""}
      </div>
      <div class="step-group">
        <div class="step-group-title">สีที่ต้องการ</div>
        ${radioField("colorChoice", colorOptions(), draft, colorLabel)}
      </div>
      <div class="step-group">
        <div class="step-group-title">การกันคิ้ว</div>
        ${radioField("browGuard", OPTIONS.browGuard, draft)}
      </div>`;
  }

  function stepConfirmHtml(draft) {
    const changeLabel = (draft.changeItems || [])
      .map((v) => (isOtherOption(v) ? (draft.changeItemsOther || "อื่น ๆ") : v))
      .join(", ");
    return `
      <div class="form-section-title">ส่วนที่ 4 — สรุปข้อมูลก่อนเริ่มทำ</div>
      <div class="box-quiet">
        ${row("การติดสีโดยรวม", draft.colorRetention)}
        ${draft.wantsMoreChange === "มี" && (draft.changeItems || []).length
          ? row("สิ่งที่ต้องการแก้ไขเพิ่มเติม", changeLabel)
          : ""}
        ${row("เทคนิคที่เลือก", resolveTouchupTechnique(draft))}
        ${row("ทรงที่ออกแบบ", resolveTouchupShape(draft))}
        ${row("สีที่เลือก", resolveTouchupColor(draft))}
        ${row("ระดับความเข้มหลังทำเสร็จวันนี้", draft.intensity)}
      </div>
      <div class="step-group-title">ข้อตกลงและความยินยอม <span class="required-star">*</span></div>
      <div class="step-group" data-radio-key="finalAgree">
        <label class="agree-row">
          <input type="radio" name="finalAgree" value="agreed" ${draft.finalAgree === "agreed" ? "checked" : ""}>
          <span>${escapeHtml(FINAL_AGREEMENT_TEXT)}</span>
        </label>
      </div>
      <div class="step-group-title">ลายเซ็นลูกค้า <span class="required-star">*</span></div>
      <div class="sig-wrap"><canvas id="tuSigCanvas"></canvas></div>
      <div class="sig-actions"><button id="tuSigClearBtn" type="button">ล้างลายเซ็น</button></div>`;
  }

  function stepHtml(step, draft) {
    if (step === 0) return customerConfirmStepHtml(draft, { extraHtml: historyBlockHtml() });
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
      pad = createSignaturePad(document.getElementById("tuSigCanvas"));
      document.getElementById("tuSigClearBtn")?.addEventListener("click", () => pad.clear());
    }
  }

  bindFieldEvents(container, state.visitDraft, (changedRadioName) => {
    bindReadinessToggle(container, state.visitDraft, changedRadioName);
    if (changedRadioName === "wantsMoreChange") {
      const block = document.getElementById("changeItemsBlock");
      if (block) block.hidden = state.visitDraft.wantsMoreChange !== "มี";
    }
    if (changedRadioName === "shapeDesign") {
      render();
    }
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
        !draft.satisfaction ? flagError('[data-radio-key="satisfaction"]') : null,
        !draft.colorRetention ? flagError('[data-radio-key="colorRetention"]') : null,
        !draft.wantsMoreChange ? flagError('[data-radio-key="wantsMoreChange"]') : null,
        !draft.intensity ? flagError('[data-radio-key="intensity"]') : null,
        draft.wantsMoreChange === "มี" && !(draft.changeItems || []).length ? flagError('[data-chip-key="changeItems"]') : null,
        !hasDraftPhoto(draft, "before") ? flagError('[data-photo-key="before"]') : null
      );
    }
    if (step === 3) {
      return scrollToFirstError(
        isOtherOption(draft.shapeDesign) && !draft.shapeDesignOther?.trim() ? flagError('[data-other-key="shapeDesignOther"]') : null
      );
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
  wireCancelButton(document.getElementById("touchupCancelBtn"));
  wireDraftSaveButton(document.getElementById("touchupDraftBtn"));

  nextBtn?.addEventListener("click", () => {
    if (!state.currentCustomer || !state.visitContext) { show("home"); return; }
    const step = state.formStepIndex || 0;
    if (!validateStep(step)) return;
    if (step < LAST_CONSULT_STEP) {
      state.formStepIndex = step + 1;
      render();
      return;
    }
    const draft = state.visitDraft;
    if (pad && !pad.isEmpty()) draft.signatureCustomerDataUrl = pad.toDataURL();
    draft.agreedAt = Date.now();
    if (historyCtx) {
      draft.prevTechnique = historyCtx.last.technique || null;
      draft.prevShapeDesign = historyCtx.last.shapeDesign || null;
      draft.prevColorUsed = historyCtx.last.colorUsed || null;
    }
    state.formStepIndex = 5;
    show("techFields");
  });

  onEnter("formTouchup", async () => {
    const c = state.currentCustomer;
    if (!c) { show("home"); return; }
    if (state.formStepIndex == null || state.formStepIndex > LAST_CONSULT_STEP) {
      state.formStepIndex = state.formStepIndex === 5 ? LAST_CONSULT_STEP : 0;
    }
    historyCtx = null;
    const cached = Array.isArray(state.currentCustomerHistory) && state.currentCustomerHistory.some((v) => v.customerId === c.customerId)
      ? historyCtxFromRows(state.currentCustomerHistory)
      : null;
    if (cached) historyCtx = cached;
    else container.innerHTML = `<div class="empty-hint">กำลังโหลดประวัติ...</div>`;
    try {
      if (!historyCtx) historyCtx = await loadHistoryCtx(c.customerId);
    } catch (e) {
      historyCtx = null;
    }
    applyTouchupDefaults(state.visitDraft, historyCtx);
    render();
  });
}
