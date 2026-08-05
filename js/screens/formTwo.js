// formTwo.js — Form 2: สักทับรอยเก่า (ลูกค้ามีสี/ทรงเดิมที่มีผลต่อการออกแบบ แต่ไม่ใช่การกลับมาเติมสีของ pyne.studio)

import { show, onEnter } from "../router.js";
import { state } from "../state.js";
import { OPTIONS } from "../data/options.js";
import { CONSENT_BLOCKS, FORM2_EXTRA_CONSENT_BLOCK, INTENSITY_DISCLAIMER, PRE_SERVICE_AGREE_TEXT, FINAL_AGREEMENT_TEXT } from "../data/consentText.js";
import { radioField, chipGroup, textField, readinessBlockHtml, bindReadinessToggle, bindFieldEvents } from "../fieldHelpers.js";
import { createSignaturePad } from "../signaturePad.js";
import { escapeHtml, readFileAsDataUrl } from "../utils.js";
import { visitHeaderHtml, wireNotServedButton, wireDraftSaveButton } from "../visitFlow.js";
import { updateMuscleEvaluation } from "../mockApi.js";

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
  const nextBtn = document.getElementById("form2NextBtn");
  const backBtn = document.getElementById("form2BackBtn");
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

      <div class="form-section-title" style="margin-top:4px">ส่วนที่ 1 — ประเมินรอยเดิมและความต้องการ</div>
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
        <p class="muted small" style="margin-top:8px">${escapeHtml(INTENSITY_DISCLAIMER)}</p>
      </div>
      <div class="step-group">
        <div class="step-group-title">ยอมรับเงื่อนไขก่อนเริ่มบริการ <span class="required-star">*</span></div>
        <details class="consent-block" style="cursor:pointer">
          <summary style="font-weight:600; color:var(--deep-bronze)">เปิดอ่านเงื่อนไขก่อนเริ่มบริการ</summary>
          <div style="margin-top:10px">${consentBlocksHtml()}</div>
        </details>
        <label class="agree-row" data-check-key="preServiceAgree">
          <input type="checkbox" id="f2PreAgree" ${draft.preServiceAgree ? "checked" : ""}>
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
      </div>

      <div class="form-section-title">ส่วนที่ 3 — สรุปข้อมูลก่อนเริ่มทำ</div>
      <div class="box-quiet">
        <div class="detail-row"><div class="detail-label">เทคนิคที่เลือก</div><div class="detail-value">${escapeHtml(draft.technique || "-")}</div></div>
        <div class="detail-row"><div class="detail-label">ลักษณะรอยเก่า</div><div class="detail-value">${escapeHtml((draft.oldMarkLook || []).map((v) => (v === "Other" ? (draft.oldMarkLookOther || "อื่นๆ") : v)).join(", ") || "-")}</div></div>
        <div class="detail-row"><div class="detail-label">สีรอยเก่า</div><div class="detail-value">${escapeHtml(draft.oldMarkTone === "Other" ? (draft.oldMarkToneOther || "อื่นๆ") : (draft.oldMarkTone || "-"))}</div></div>
        <div class="detail-row"><div class="detail-label">จุดที่ต้องการแก้ไข</div><div class="detail-value">${escapeHtml((draft.fixPoints || []).map((v) => (v === "Other" ? (draft.fixPointsOther || "อื่นๆ") : v)).join(", ") || "-")}</div></div>
        <div class="detail-row"><div class="detail-label">ภาพรวมที่ต้องการ</div><div class="detail-value">${escapeHtml(draft.desiredOverview === "Other" ? (draft.desiredOverviewOther || "อื่นๆ") : (draft.desiredOverview || "-"))}</div></div>
        <div class="detail-row"><div class="detail-label">สิ่งที่ไม่อยากได้เด็ดขาด</div><div class="detail-value">${escapeHtml((draft.notWanted || []).map((v) => (v === "Other" ? (draft.notWantedOther || "อื่นๆ") : v)).join(", ") || "-")}</div></div>
        <div class="detail-row"><div class="detail-label">ทรงที่ออกแบบ</div><div class="detail-value">${escapeHtml(draft.shapeDesign === "Other" ? (draft.shapeDesignOther || "อื่นๆ") : (draft.shapeDesign || "-"))}</div></div>
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
      <div class="sig-actions"><button id="f2SigClearBtn" type="button">ล้างลายเซ็น</button></div>
    `;

    pad = createSignaturePad(document.getElementById("f2SigCanvas"));
    document.getElementById("f2SigClearBtn").addEventListener("click", () => pad.clear());

    document.getElementById("f2PreAgree").addEventListener("change", (e) => {
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
  wireNotServedButton(document.getElementById("form2NotServedBtn"));
  wireDraftSaveButton(document.getElementById("form2DraftBtn"));

  nextBtn.addEventListener("click", async () => {
    if (!state.currentCustomer || !state.visitContext) { show("home"); return; }
    clearFieldErrors();
    const draft = state.visitDraft;

    const scarEl = !draft.hasScar ? flagError('[data-radio-key="hasScar"]') : null;
    const irritationEl = !draft.irritation7d ? flagError('[data-radio-key="irritation7d"]') : null;
    const allergyEl = !draft.allergyInfo ? flagError('[data-radio-key="allergyInfo"]') : null;
    const oldMarkEl = !(draft.oldMarkLook || []).length ? flagError('[data-chip-key="oldMarkLook"]') : null;
    const fixPointsEl = !(draft.fixPoints || []).length ? flagError('[data-chip-key="fixPoints"]') : null;
    const overviewEl = !draft.desiredOverview ? flagError('[data-chip-key="desiredOverview"]') : null;
    const intensityEl = !draft.intensity ? flagError('[data-radio-key="intensity"]') : null;
    const preAgreeEl = !draft.preServiceAgree ? flagError('[data-check-key="preServiceAgree"]') : null;
    const beforeEl = !draft.beforePhotoDataUrl ? flagError('[data-photo-key="before"]') : null;
    const finalAgreeEl = !draft.finalAgree ? flagError('[data-radio-key="finalAgree"]') : null;
    const alreadySigned = Boolean(draft.signatureCustomerDataUrl);
    const sigEl = (!pad || (pad.isEmpty() && !alreadySigned)) ? flagError(".sig-wrap") : null;

    const noErrors = scrollToFirstError(scarEl, irritationEl, allergyEl, oldMarkEl, fixPointsEl, overviewEl, intensityEl, preAgreeEl, beforeEl, finalAgreeEl, sigEl);
    if (!noErrors) return;

    nextBtn.disabled = true;
    if (!pad.isEmpty()) draft.signatureCustomerDataUrl = pad.toDataURL();
    draft.agreedAt = Date.now();

    try {
      if (draft.muscle) {
        await updateMuscleEvaluation(state.currentCustomer.customerId, draft.muscle, draft.muscleNote || "");
      }
    } catch (e) {
      // เช็ก/บันทึกกล้ามเนื้อคิ้วพลาดไม่ควรบล็อกไม่ให้ไปหน้าถัดไป (แก้ค่านี้ทีหลังใน Customer Profile ได้)
      console.warn("updateMuscleEvaluation failed:", e);
    }

    show("techFields");
  });

  onEnter("form2", render);
}
