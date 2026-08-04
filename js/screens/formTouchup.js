// formTouchup.js — Form 3 "เติมสีคิ้ว" ส่วนที่ 1-4 (ประวัติเดิม → ติดตามผล → ออกแบบ → สรุป+เซ็น)
// ส่วนที่ 5 (บันทึกหลังทำ) อยู่ที่ techFields.js (ใช้ร่วมกับ Form 1/2)
// ใช้กับลูกค้าเก่าที่เคยสักกับ pyne.studio เท่านั้น (Visit ถูกสร้างไว้แล้วตั้งแต่ Step 3 ก่อนเข้าหน้านี้)

import { show, onEnter } from "../router.js";
import { state } from "../state.js";
import { getHistoryByCustomer } from "../mockApi.js";
import { OPTIONS } from "../data/options.js";
import { INTENSITY_DISCLAIMER, FINAL_AGREEMENT_TEXT } from "../data/consentText.js";
import { radioField, chipGroup, readinessBlockHtml, bindReadinessToggle, bindFieldEvents } from "../fieldHelpers.js";
import { createSignaturePad } from "../signaturePad.js";
import { formatDate, escapeHtml, readFileAsDataUrl } from "../utils.js";
import { visitHeaderHtml, wireNotServedButton, wireDraftSaveButton } from "../visitFlow.js";

// ระยะเวลาจากวันที่สักครั้งแรกถึงวันนี้ ปัดเป็นจำนวนเดือนเต็ม (คำนวณอัตโนมัติตามสเปก)
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

// รอบแรกที่สักจริงกับร้าน = Visit ที่เก่าที่สุดที่ serviceType เป็น "สักคิ้ว" (ไม่ใช่ "เติมสี")
// ล่าสุด = Visit ล่าสุดไม่ว่าประเภทไหน (ใช้แสดงเทคนิค/สี/กล้ามเนื้อคิ้วปัจจุบัน)
async function loadHistoryCtx(customerId) {
  const history = await getHistoryByCustomer(customerId);
  if (!history.length) return null;
  const browVisits = history.filter((h) => h.serviceType === "สักคิ้ว");
  const first = browVisits.length ? browVisits[browVisits.length - 1] : history[history.length - 1];
  const last = history[0];
  return { first, last };
}

export function initFormTouchup() {
  const container = document.getElementById("touchupBody");
  const nextBtn = document.getElementById("tuNextBtn");
  const backBtn = document.getElementById("touchupBackBtn");
  let pad = null;
  let historyCtx = null;

  function photoSlot(key, label) {
    const url = state.visitDraft[key + "PhotoDataUrl"];
    return `
      <div class="photo-slot" data-photo-key="${key}">
        ${url ? `<img src="${url}">` : `
          <label>
            <span style="font-size:22px">📷</span>
            <span>${escapeHtml(label)}</span>
            <input type="file" accept="image/*" data-photo-input="${key}">
          </label>`}
      </div>`;
  }

  function historyBlockHtml() {
    if (!historyCtx) {
      return `<div class="empty-hint">ไม่พบประวัติเดิม</div>`;
    }
    const { first, last } = historyCtx;
    return `
      <div class="box-quiet">
        ${row("วันที่สักครั้งแรก", formatDate(first.visitDate))}
        ${row("ระยะเวลาจากครั้งแรกถึงวันนี้", monthsSince(first.visitDate))}
        ${row("เทคนิคเดิม", last.technique)}
        ${row("สีเดิม", last.colorUsed)}
        ${row("กล้ามเนื้อคิ้วล่าสุด", (state.currentCustomer && state.currentCustomer.skinProfile && state.currentCustomer.skinProfile.muscle) || "ยังไม่ได้ประเมิน")}
        <div class="photo-row" style="margin-top:10px">
          ${photoBoxReadOnly(first.beforePhotoUrl)}
          ${photoBoxReadOnly(first.afterPhotoUrl)}
        </div>
        <button type="button" class="icon-btn" id="tuViewLastBtn" style="padding-left:0; margin-top:6px">ดูรายละเอียด ›</button>
      </div>`;
  }

  function render() {
    const draft = state.visitDraft;

    container.innerHTML = `
      ${visitHeaderHtml()}
      <div class="form-section-title" style="margin-top:4px">ส่วนที่ 1 — ประวัติเดิม</div>
      ${historyBlockHtml()}

      ${readinessBlockHtml(draft)}

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
        <p class="muted small" style="margin-top:8px">${escapeHtml(INTENSITY_DISCLAIMER)}</p>
      </div>
      <div class="step-group">
        <div class="step-group-title">รูป Before <span class="required-star">*</span></div>
        <div class="photo-row">${photoSlot("before", "Before")}</div>
      </div>

      <div class="form-section-title">ส่วนที่ 3 — การออกแบบ</div>
      <div class="step-group">
        <div class="step-group-title">เทคนิคที่เลือกใช้ครั้งนี้</div>
        <p class="muted small">เทคนิคเดิม: ${escapeHtml((historyCtx && historyCtx.last.technique) || "-")}</p>
        ${radioField("technique", OPTIONS.technique, draft)}
      </div>
      <div class="step-group">
        <div class="step-group-title">ทรงที่ออกแบบ</div>
        <p class="muted small">ทรงเดิม: ${escapeHtml((historyCtx && historyCtx.last.shapeDesign) || "-")}</p>
        ${chipGroup("shapeDesign", OPTIONS.touchupShape, draft, false)}
      </div>
      <div class="step-group">
        <div class="step-group-title">สีที่ต้องการ</div>
        <p class="muted small">สีเดิม: ${escapeHtml((historyCtx && historyCtx.last.colorUsed) || "-")}</p>
        ${radioField("colorChoice", OPTIONS.colorChoice8, draft)}
      </div>
      <div class="step-group">
        <div class="step-group-title">การกันคิ้ว</div>
        ${radioField("browGuard", OPTIONS.browGuard, draft)}
      </div>

      <div class="form-section-title">ส่วนที่ 4 — สรุปข้อมูลก่อนเริ่มทำ</div>
      <div class="box-quiet">
        ${row("การติดสีโดยรวม", draft.colorRetention)}
        ${draft.wantsMoreChange === "มี" && (draft.changeItems || []).length
          ? row("สิ่งที่ต้องการแก้ไขเพิ่มเติม", (draft.changeItems || []).map((v) => (v === "Other" ? (draft.changeItemsOther || "อื่นๆ") : v)).join(", "))
          : ""}
        ${row("เทคนิคที่เลือก", draft.technique || (historyCtx && historyCtx.last.technique))}
        ${row("ทรงที่ออกแบบ", draft.shapeDesign === "Other" ? (draft.shapeDesignOther || "อื่นๆ") : (draft.shapeDesign || (historyCtx && historyCtx.last.shapeDesign)))}
        ${row("สีที่เลือก", draft.colorChoice || (historyCtx && historyCtx.last.colorUsed))}
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
      <div class="sig-actions"><button id="tuSigClearBtn" type="button">ล้างลายเซ็น</button></div>
    `;

    pad = createSignaturePad(document.getElementById("tuSigCanvas"));
    document.getElementById("tuSigClearBtn").addEventListener("click", () => pad.clear());

    const viewLastBtn = document.getElementById("tuViewLastBtn");
    if (viewLastBtn) {
      viewLastBtn.addEventListener("click", () => show("visitDetail", { data: historyCtx.last }));
    }

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
    // ต้อง toggle DOM ตรง ๆ ห้าม re-render ทั้ง container เพราะจะล้างลายเซ็น/รูปที่เพิ่งใส่
    if (changedRadioName === "wantsMoreChange") {
      const block = document.getElementById("changeItemsBlock");
      if (block) block.hidden = state.visitDraft.wantsMoreChange !== "มี";
    }
  });

  ["click", "input", "change", "mousedown", "touchstart"].forEach((evt) => {
    container.addEventListener(evt, (e) => {
      const errEl = e.target.closest(".field-error");
      if (errEl) errEl.classList.remove("field-error");
    });
  });

  function clearFieldErrors() {
    container.querySelectorAll(".field-error").forEach((el) => el.classList.remove("field-error"));
  }
  function flagError(selector) {
    const el = container.querySelector(selector);
    if (el) el.classList.add("field-error");
    return el;
  }
  function scrollToFirstError(...els) {
    const first = els.find(Boolean);
    if (first) first.scrollIntoView({ behavior: "smooth", block: "center" });
    return !first;
  }

  backBtn.addEventListener("click", () => show(state.currentCustomer ? "customerProfile" : "home"));
  wireNotServedButton(document.getElementById("touchupNotServedBtn"));
  wireDraftSaveButton(document.getElementById("touchupDraftBtn"));

  nextBtn.addEventListener("click", () => {
    if (!state.currentCustomer || !state.visitContext) { show("home"); return; }

    clearFieldErrors();
    const draft = state.visitDraft;
    const scarEl = !draft.hasScar ? flagError('[data-radio-key="hasScar"]') : null;
    const irritationEl = !draft.irritation7d ? flagError('[data-radio-key="irritation7d"]') : null;
    const allergyEl = !draft.allergyInfo ? flagError('[data-radio-key="allergyInfo"]') : null;
    const satisfactionEl = !draft.satisfaction ? flagError('[data-radio-key="satisfaction"]') : null;
    const retentionEl = !draft.colorRetention ? flagError('[data-radio-key="colorRetention"]') : null;
    const wantsMoreEl = !draft.wantsMoreChange ? flagError('[data-radio-key="wantsMoreChange"]') : null;
    const intensityEl = !draft.intensity ? flagError('[data-radio-key="intensity"]') : null;
    const beforeEl = !draft.beforePhotoDataUrl ? flagError('[data-photo-key="before"]') : null;
    const agreeEl = !draft.finalAgree ? flagError('[data-radio-key="finalAgree"]') : null;
    const alreadySigned = Boolean(draft.signatureCustomerDataUrl);
    const sigEl = (!pad || (pad.isEmpty() && !alreadySigned)) ? flagError(".sig-wrap") : null;

    const noErrors = scrollToFirstError(scarEl, irritationEl, allergyEl, satisfactionEl, retentionEl, wantsMoreEl, intensityEl, beforeEl, agreeEl, sigEl);
    if (!noErrors) return;

    if (!pad.isEmpty()) {
      draft.signatureCustomerDataUrl = pad.toDataURL();
    }
    draft.agreedAt = Date.now();
    // เก็บค่าเดิมจากประวัติไว้ใน draft ให้ techFields.js (ส่วนที่ 5) ใช้ fallback ตอนสร้าง payload
    // โดยไม่ต้อง fetch ประวัติซ้ำอีกรอบ — เผื่อกรณีช่างไม่ได้เลือกค่าใหม่ในส่วนที่ 3 (ไม่บังคับตอบ)
    if (historyCtx) {
      draft.prevTechnique = historyCtx.last.technique || null;
      draft.prevShapeDesign = historyCtx.last.shapeDesign || null;
      draft.prevColorUsed = historyCtx.last.colorUsed || null;
    }
    show("techFields");
  });

  onEnter("formTouchup", async () => {
    const c = state.currentCustomer;
    if (!c) { show("home"); return; }
    historyCtx = null;
    container.innerHTML = `<div class="empty-hint">Loading history...</div>`;
    historyCtx = await loadHistoryCtx(c.customerId);
    render();
  });
}
