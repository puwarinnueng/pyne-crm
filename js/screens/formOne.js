// formOne.js — Form 1: สักคิ้วครั้งแรก (ใช้กับลูกค้าที่ไม่มีรอยสักคิ้วเดิมที่มีผลต่อการออกแบบ)
// ส่วนที่ 1 ความต้องการ → ส่วนที่ 2 การออกแบบ → ส่วนที่ 3 สรุป+consent+เซ็น → ต่อที่หน้าบันทึกหลังทำ (screen-techFields)

import { show, onEnter } from "../router.js";
import { state } from "../state.js";
import { OPTIONS } from "../data/options.js";
import { CONSENT_BLOCKS, INTENSITY_DISCLAIMER, PRE_SERVICE_AGREE_TEXT, FINAL_AGREEMENT_TEXT } from "../data/consentText.js";
import { radioField, chipGroup, readinessBlockHtml, bindReadinessToggle, bindFieldEvents } from "../fieldHelpers.js";
import { createSignaturePad } from "../signaturePad.js";
import { escapeHtml, readFileAsDataUrl } from "../utils.js";
import { visitHeaderHtml, wireNotServedButton, wireDraftSaveButton } from "../visitFlow.js";
import { updateMuscleEvaluation } from "../mockApi.js";

function consentBlocksHtml() {
  return CONSENT_BLOCKS.map((b) => `
    <div class="consent-block">
      <div class="src">${escapeHtml(b.title)}</div>
      ${escapeHtml(b.body).replace(/\n/g, "<br>")}
    </div>
  `).join("");
}

export function initFormOne() {
  const container = document.getElementById("form1Body");
  const nextBtn = document.getElementById("form1NextBtn");
  const backBtn = document.getElementById("form1BackBtn");
  let pad = null;

  function photoSlot(key, label) {
    const url = state.visitDraft[key + "PhotoDataUrl"];
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

  function render() {
    const draft = state.visitDraft;
    container.innerHTML = `
      ${visitHeaderHtml()}
      ${readinessBlockHtml(draft)}

      <div class="form-section-title" style="margin-top:4px">ส่วนที่ 1 — ความต้องการของลูกค้า</div>
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
        <p class="muted small" style="margin-top:8px">${escapeHtml(INTENSITY_DISCLAIMER)}</p>
      </div>
      <div class="step-group">
        <div class="step-group-title">ยอมรับเงื่อนไขก่อนเริ่มบริการ <span class="required-star">*</span></div>
        <details class="consent-block" style="cursor:pointer">
          <summary style="font-weight:600; color:var(--deep-bronze)">เปิดอ่านเงื่อนไขก่อนเริ่มบริการ</summary>
          <div style="margin-top:10px">${consentBlocksHtml()}</div>
        </details>
        <label class="agree-row" data-check-key="preServiceAgree">
          <input type="checkbox" id="f1PreAgree" ${draft.preServiceAgree ? "checked" : ""}>
          <span>${escapeHtml(PRE_SERVICE_AGREE_TEXT)}</span>
        </label>
      </div>

      <div class="form-section-title">ส่วนที่ 2 — การออกแบบ</div>
      <div class="step-group">
        <div class="step-group-title">ประวัติผิวและคิ้วจาก Customer Profile</div>
        ${skinProfileReadOnlyHtml()}
      </div>
      <div class="step-group">
        <div class="step-group-title">รูป Before <span class="required-star">*</span></div>
        <div class="photo-row">${photoSlot("before", "Before")}</div>
      </div>
      <div class="step-group">
        <div class="step-group-title">เทคนิคที่เลือก</div>
        ${radioField("technique", OPTIONS.technique, draft)}
      </div>
      <div class="step-group">
        <div class="step-group-title">กล้ามเนื้อคิ้ว (กรอกหลังเช็ดคิ้วและวัดตอนออกแบบทรงจริง)</div>
        ${radioField("muscle", OPTIONS.muscleOptions, draft)}
      </div>
      <div class="step-group">
        <div class="step-group-title">ทรงคิ้ว</div>
        ${chipGroup("shapeDesign", OPTIONS.form1Shape, draft, false)}
      </div>
      <div class="step-group">
        <div class="step-group-title">การกันคิ้ว</div>
        ${radioField("browGuard", OPTIONS.browGuard, draft)}
      </div>

      <div class="form-section-title">ส่วนที่ 3 — สรุปข้อมูลก่อนเริ่มทำ</div>
      <div class="box-quiet">
        <div class="detail-row"><div class="detail-label">เทคนิคที่เลือก</div><div class="detail-value">${escapeHtml(draft.technique || "-")}</div></div>
        <div class="detail-row"><div class="detail-label">ภาพรวมที่ต้องการ</div><div class="detail-value">${escapeHtml(draft.desiredOverview === "Other" ? (draft.desiredOverviewOther || "อื่นๆ") : (draft.desiredOverview || "-"))}</div></div>
        <div class="detail-row"><div class="detail-label">สีที่เลือก</div><div class="detail-value">${escapeHtml(draft.colorChoice || "-")}</div></div>
        <div class="detail-row"><div class="detail-label">ทรงที่ออกแบบ</div><div class="detail-value">${escapeHtml(draft.shapeDesign === "Other" ? (draft.shapeDesignOther || "อื่นๆ") : (draft.shapeDesign || "-"))}</div></div>
        <div class="detail-row"><div class="detail-label">สิ่งที่ไม่อยากได้เด็ดขาด</div><div class="detail-value">${escapeHtml((draft.notWanted || []).map((v) => (v === "Other" ? (draft.notWantedOther || "อื่นๆ") : v)).join(", ") || "-")}</div></div>
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
      <div class="sig-wrap"><canvas id="f1SigCanvas"></canvas></div>
      <div class="sig-actions"><button id="f1SigClearBtn" type="button">ล้างลายเซ็น</button></div>
    `;

    pad = createSignaturePad(document.getElementById("f1SigCanvas"));
    document.getElementById("f1SigClearBtn").addEventListener("click", () => pad.clear());

    document.getElementById("f1PreAgree").addEventListener("change", (e) => {
      draft.preServiceAgree = e.target.checked;
      e.target.closest(".field-error")?.classList.remove("field-error");
    });

    container.querySelectorAll("[data-photo-input]").forEach((inputEl) => {
      inputEl.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const dataUrl = await readFileAsDataUrl(file);
        state.visitDraft[inputEl.dataset.photoInput + "PhotoDataUrl"] = dataUrl;
        render();
      });
    });
  }

  bindFieldEvents(container, state.visitDraft, (changedRadioName) => {
    bindReadinessToggle(container, state.visitDraft, changedRadioName);
  });

  ["click", "input", "change", "mousedown", "touchstart"].forEach((evt) => {
    container.addEventListener(evt, (e) => {
      const errEl = e.target.closest(".field-error");
      if (errEl) errEl.classList.remove("field-error");
    });
  });

  function clearFieldErrors() { container.querySelectorAll(".field-error").forEach((el) => el.classList.remove("field-error")); }
  function flagError(selector) { const el = container.querySelector(selector); if (el) el.classList.add("field-error"); return el; }
  function scrollToFirstError(...els) { const first = els.find(Boolean); if (first) first.scrollIntoView({ behavior: "smooth", block: "center" }); return !first; }

  backBtn.addEventListener("click", () => show(state.currentCustomer ? "customerProfile" : "home"));
  wireNotServedButton(document.getElementById("form1NotServedBtn"));
  wireDraftSaveButton(document.getElementById("form1DraftBtn"));

  nextBtn.addEventListener("click", async () => {
    if (!state.currentCustomer || !state.visitContext) { show("home"); return; }
    clearFieldErrors();
    const draft = state.visitDraft;

    const scarEl = !draft.hasScar ? flagError('[data-radio-key="hasScar"]') : null;
    const irritationEl = !draft.irritation7d ? flagError('[data-radio-key="irritation7d"]') : null;
    const allergyEl = !draft.allergyInfo ? flagError('[data-radio-key="allergyInfo"]') : null;
    const concernsEl = !(draft.concerns || []).length ? flagError('[data-chip-key="concerns"]') : null;
    const overviewEl = !draft.desiredOverview ? flagError('[data-chip-key="desiredOverview"]') : null;
    const intensityEl = !draft.intensity ? flagError('[data-radio-key="intensity"]') : null;
    const preAgreeEl = !draft.preServiceAgree ? flagError('[data-check-key="preServiceAgree"]') : null;
    const beforeEl = !draft.beforePhotoDataUrl ? flagError('[data-photo-key="before"]') : null;
    const finalAgreeEl = !draft.finalAgree ? flagError('[data-radio-key="finalAgree"]') : null;
    const alreadySigned = Boolean(draft.signatureCustomerDataUrl);
    const sigEl = (!pad || (pad.isEmpty() && !alreadySigned)) ? flagError(".sig-wrap") : null;

    const noErrors = scrollToFirstError(scarEl, irritationEl, allergyEl, concernsEl, overviewEl, intensityEl, preAgreeEl, beforeEl, finalAgreeEl, sigEl);
    if (!noErrors) return;

    if (!pad.isEmpty()) draft.signatureCustomerDataUrl = pad.toDataURL();
    draft.agreedAt = Date.now();

    if (draft.muscle) {
      await updateMuscleEvaluation(state.currentCustomer.customerId, draft.muscle, "");
    }

    show("techFields");
  });

  onEnter("form1", render);
}
