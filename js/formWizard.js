// formWizard.js — 5-step consultation wizard (ตาม mockup) + visit strip + history sheet
// ไม่เขียน DB — อ่านประวัติ/สกินโปรไฟล์อย่างเดียว แล้วกลับมาจุดเดิมของฟอร์ม

import { state } from "./state.js?v=20260808ae";
import { getHistoryByCustomer, closeVisitNotServed } from "./mockApi.js?v=20260808ae";
import { show } from "./router.js?v=20260808ae";
import { appConfirm, appPrompt, appAlert } from "./dialogs.js?v=20260808ae";
import { escapeHtml, formatDate, visitStatusLabel, visitStatusBadgeClass, formTypeLabel, isOtherOption, TOUCHUP_ORIGINAL } from "./utils.js?v=20260808ae";
import { withIcon, ICONS } from "./icons.js?v=20260808ae";

export const LAST_CONSULT_STEP = 4;
export const CONSULT_STEP_COUNT = 5;

export const CONSULT_STEPS = [
  { key: "customer", title: "ลูกค้า" },
  { key: "health", title: "สุขภาพ" },
  { key: "needs", title: "ความต้องการ" },
  { key: "design", title: "ออกแบบ" },
  { key: "confirm", title: "ยืนยัน" }
];

const CHECK_SVG = ICONS.check;

function stepStatus(index, currentIndex) {
  if (index < currentIndex) return "finish";
  if (index === currentIndex) return "process";
  return "wait";
}

export function stepsHtml(currentIndex, steps = CONSULT_STEPS) {
  const total = steps.length;
  const safeIndex = Math.max(0, Math.min(currentIndex, total - 1));
  const current = steps[safeIndex];
  return `
    <div class="pyne-steps" role="list" aria-label="ความคืบหน้าฟอร์ม">
      <div class="pyne-steps-mobile">
        <span class="pyne-steps-mobile-label">ขั้นที่ ${safeIndex + 1} จาก ${total}</span>
        <strong class="pyne-steps-mobile-title">${escapeHtml(current.title)}</strong>
        <div class="pyne-steps-progress" aria-hidden="true">
          <span style="width:${((safeIndex + 1) / total) * 100}%"></span>
        </div>
      </div>
      <ol class="pyne-steps-list">
        ${steps.map((step, i) => {
          const status = stepStatus(i, safeIndex);
          const icon = status === "finish"
            ? CHECK_SVG
            : `<span class="pyne-step-num">${i + 1}</span>`;
          return `
            <li class="pyne-step is-${status}" role="listitem" aria-current="${status === "process" ? "step" : "false"}">
              <span class="pyne-step-icon" aria-hidden="true">${icon}</span>
              <span class="pyne-step-title">${escapeHtml(step.title)}</span>
            </li>`;
        }).join("")}
      </ol>
    </div>`;
}

export function stickyVisitBarHtml({ showHistory = true } = {}) {
  const c = state.currentCustomer;
  const v = state.visitContext;
  if (!c) {
    return `<div class="visit-strip visit-strip--empty"><div class="visit-strip-meta">ยังไม่ได้เลือกลูกค้า</div></div>`;
  }
  const displayName = c.fullName || c.name || c.nickname || "ลูกค้า";
  const nick = c.nickname && c.nickname !== displayName ? ` (${escapeHtml(c.nickname)})` : "";
  const meta = v
    ? `${escapeHtml(c.customerId)}<span class="dot">·</span>คิว ${escapeHtml(v.visitId)}<span class="dot">·</span>Zerva ${escapeHtml(v.zervaBookingId || "-")}<span class="dot">·</span>${formatDate(v.visitDate)} ${escapeHtml(v.timeSlot || "")}`
    : `${escapeHtml(c.customerId)}`;
  return `
    <div class="visit-strip">
      <div class="visit-strip-main">
        <div class="visit-strip-name">${escapeHtml(displayName)}${nick}</div>
        <div class="visit-strip-meta">${meta}</div>
      </div>
      ${showHistory ? `
        <button type="button" class="btn btn-outline visit-strip-btn" data-open-history>
          ${withIcon("history", "ข้อมูลเก่า")}
        </button>` : ""}
    </div>`;
}

function ageFromDob(dobStr) {
  if (!dobStr) return null;
  const dob = new Date(dobStr);
  if (isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return age;
}

/** Step 1 — ยืนยันข้อมูลลูกค้า + นัด */
export function customerConfirmStepHtml(draft, { extraHtml = "" } = {}) {
  const c = state.currentCustomer || {};
  const v = state.visitContext || {};
  const age = ageFromDob(c.dob);
  const row = (label, value) =>
    `<div class="detail-row"><div class="detail-label">${escapeHtml(label)}</div><div class="detail-value">${escapeHtml(value || "-")}</div></div>`;
  return `
    <div class="form-section-title">ยืนยันข้อมูลลูกค้า</div>
    <div class="box-quiet">
      ${row("ชื่อจริง", c.fullName || c.name)}
      ${row("ชื่อเล่น", c.nickname)}
      ${row("วันเกิด", c.dob ? `${c.dob}${age != null ? ` (อายุ ${age})` : ""}` : "-")}
      ${row("เบอร์โทร", c.phoneDisplay || c.phone)}
      ${row("รหัสลูกค้า", c.customerId)}
      ${row("รหัสคิว", v.visitId)}
      ${row("รหัสจอง Zerva", v.zervaBookingId)}
      ${row("นัดหมาย", v.visitDate ? `${formatDate(v.visitDate)} ${v.timeSlot || ""}`.trim() : "-")}
    </div>
    ${extraHtml}
    <div class="step-group">
      <div class="step-group-title">ข้อมูลลูกค้าและนัดถูกต้องไหม? <span class="required-star">*</span></div>
      <label class="agree-row" data-check-key="customerInfoConfirmed">
        <input type="checkbox" id="customerInfoConfirm" ${draft.customerInfoConfirmed ? "checked" : ""}>
        <span>ยืนยันว่าข้อมูลด้านบนถูกต้อง</span>
      </label>
    </div>`;
}

export function bindCustomerConfirm(container, draft) {
  const el = container.querySelector("#customerInfoConfirm");
  if (!el) return;
  el.addEventListener("change", (e) => {
    draft.customerInfoConfirmed = e.target.checked;
    e.target.closest(".field-error")?.classList.remove("field-error");
  });
}

/** Chrome ด้านบน: Steps + visit strip */
export function formChromeInnerHtml(currentIndex, options = {}) {
  const { showSteps = true, showHistory = true } = options;
  return `
    ${showSteps ? stepsHtml(currentIndex) : ""}
    ${stickyVisitBarHtml({ showHistory })}`;
}

export function mountFormChrome(chromeEl, currentIndex, options = {}) {
  let el = chromeEl;
  if (!el || !el.isConnected) {
    const screen = document.querySelector(".screen.active");
    el = screen?.querySelector(":scope > .form-chrome") || null;
    if (!el && screen) {
      const pad = screen.querySelector(":scope > .page-pad");
      if (!pad) return;
      el = document.createElement("div");
      el.className = "form-chrome";
      screen.insertBefore(el, pad);
    }
  }
  if (!el) return;
  el.hidden = false;
  el.innerHTML = formChromeInnerHtml(currentIndex, options);
}

/** หน้า techFields — เหลือแค่ visit strip ไม่โชว์แถบ 5 ขั้น */
export function mountVisitStripOnly(chromeEl) {
  mountFormChrome(chromeEl, 0, { showSteps: false, showHistory: true });
}

function fmtVal(v) {
  if (Array.isArray(v)) return v.length ? v.join(", ") : "-";
  if (v === undefined || v === null || v === "") return "-";
  return String(v);
}

/** รวมคอลัมน์ Sheet + rawAnswers ให้โชว์ครบเวลาดูประวัติ */
export function enrichVisitForDisplay(visit) {
  if (!visit) return visit;
  const raw = (visit.rawAnswers && typeof visit.rawAnswers === "object") ? visit.rawAnswers : {};
  const pick = (...vals) => {
    for (const v of vals) {
      if (v === undefined || v === null || v === "") continue;
      if (Array.isArray(v) && !v.length) continue;
      return v;
    }
    return "";
  };
  const resolveShape = (v) => {
    if (v === TOUCHUP_ORIGINAL.shape) return raw.prevShapeDesign || "";
    if (isOtherOption(v)) return raw.shapeDesignOther || "อื่น ๆ";
    return v;
  };
  const resolveTech = (v) => (v === TOUCHUP_ORIGINAL.technique ? (raw.prevTechnique || "") : v);
  const resolveColor = (v) => (v === TOUCHUP_ORIGINAL.color ? (raw.prevColorUsed || "") : v);
  const shape = pick(
    visit.shapeDesign,
    resolveShape(raw.shapeDesign),
    raw.prevShapeDesign
  );
  return {
    ...visit,
    technique: pick(visit.technique, resolveTech(raw.technique), raw.prevTechnique),
    colorUsed: pick(visit.colorUsed, resolveColor(raw.colorChoice), raw.prevColorUsed),
    intensity: pick(visit.intensity, raw.intensity),
    muscle: pick(visit.muscle, raw.muscle),
    shapeDesign: shape,
    browGuard: pick(visit.browGuard, raw.browGuard),
    mixRatio: pick(visit.mixRatio, raw.mixRatio),
    redness: pick(visit.redness, raw.redness),
    adherence: pick(visit.adherence, raw.adherence),
    satisfaction: pick(visit.satisfaction, raw.satisfaction),
    colorRetention: pick(visit.colorRetention, raw.colorRetention),
    wantsMoreChange: pick(visit.wantsMoreChange, raw.wantsMoreChange),
    changeItems: (Array.isArray(visit.changeItems) && visit.changeItems.length)
      ? visit.changeItems
      : (Array.isArray(raw.changeItems) ? raw.changeItems : visit.changeItems),
    note: pick(visit.note, raw.note),
    analysis: pick(visit.analysis, raw.analysis)
  };
}

function skinRowsHtml(sp = {}) {
  const row = (label, value) =>
    `<div class="detail-row"><div class="detail-label">${escapeHtml(label)}</div><div class="detail-value">${escapeHtml(fmtVal(value))}</div></div>`;
  return `
    ${row("ประเภทผิว", sp.skinType)}
    ${row("ลักษณะขน", sp.hairLook)}
    ${row("ความหนาแน่น", sp.hairDensity)}
    ${row("ทรงคิ้ว", sp.browShape)}
    ${row("กล้ามเนื้อคิ้ว", sp.muscle || "ยังไม่ได้ประเมิน")}
    ${sp.muscleNote ? row("โน้ตกล้ามเนื้อ", sp.muscleNote) : ""}
    ${sp.muscleEvaluatedAt ? row("ประเมินเมื่อ", formatDate(sp.muscleEvaluatedAt)) : ""}`;
}

function visitCardHtml(v, { isCurrent = false } = {}) {
  v = enrichVisitForDisplay(v);
  const title = formTypeLabel(v.formType) || v.serviceType || "คิว";
  const meta = [
    v.serviceId ? `คิว ${v.serviceId}` : null,
    v.zervaBookingId ? `Zerva ${v.zervaBookingId}` : null,
    v.timeSlot || null
  ].filter(Boolean).join(" · ");
  const summaryRows = [
    ["เทคนิค", v.technique],
    ["สีที่ใช้", v.colorUsed],
    ["ความเข้ม", v.intensity],
    ["ทรง", v.shapeDesign],
    ["บราวการ์ด", v.browGuard],
    ["อัตราส่วนสี", v.mixRatio],
    ["ผิวแดง", v.redness],
    ["สีติด", v.adherence]
  ].filter(([, val]) => val !== undefined && val !== null && val !== "");

  return `
    <div class="history-sheet-item${isCurrent ? " is-current" : ""}">
      <div class="history-sheet-item-top">
        <span class="draft-badge ${visitStatusBadgeClass(v.status)}">${escapeHtml(visitStatusLabel(v.status) || v.status || "คิว")}${isCurrent ? " · คิวนี้" : ""}</span>
        <span class="muted small">${escapeHtml(formatDate(v.visitDate))}</span>
      </div>
      <div class="history-sheet-item-title">${escapeHtml(title)}</div>
      ${meta ? `<div class="muted small">${escapeHtml(meta)}</div>` : ""}
      ${summaryRows.length
        ? `<div class="history-sheet-item-fields">${summaryRows.map(([label, val]) =>
            `<div class="history-sheet-field"><span>${escapeHtml(label)}</span><strong>${escapeHtml(fmtVal(val))}</strong></div>`
          ).join("")}</div>`
        : `<div class="muted small mt-8">${isCurrent ? "คิวนี้ยังไม่มีรายละเอียดงาน" : "ยังไม่มีเทคนิค/สีที่บันทึกไว้"}</div>`}
    </div>`;
}

function historyListHtml(history) {
  if (!history || !history.length) {
    return `<div class="empty-hint">ยังไม่มีประวัติ</div>`;
  }
  const currentId = state.visitContext && state.visitContext.visitId;
  const current = currentId ? history.find((v) => v.serviceId === currentId) : null;
  const past = history.filter((v) => v.serviceId !== currentId);

  const parts = [];
  if (current) {
    parts.push(`<p class="muted small" style="margin:0 0 var(--sp-8)">คิวนี้</p>`);
    parts.push(visitCardHtml(current, { isCurrent: true }));
  }
  if (past.length) {
    parts.push(`<p class="muted small" style="margin:var(--sp-16) 0 var(--sp-8)">ครั้งก่อน</p>`);
    parts.push(past.slice(0, 8).map((v) => visitCardHtml(v)).join(""));
  } else if (!current) {
    return `<div class="empty-hint">ยังไม่มีประวัติ</div>`;
  } else {
    parts.push(`<p class="muted small mt-12">ยังไม่มีครั้งก่อน</p>`);
  }
  return parts.join("");
}

export function initHistorySheet() {
  const overlay = document.getElementById("historySheetOverlay");
  const body = document.getElementById("historySheetBody");
  const closeBtn = document.getElementById("historySheetClose");
  if (!overlay || !body) return;

  function close() {
    overlay.hidden = true;
  }

  async function open() {
    const c = state.currentCustomer;
    if (!c) return;
    body.innerHTML = `<div class="empty-hint">กำลังโหลด...</div>`;
    overlay.hidden = false;

    // ดึงประวัติใหม่ทุกครั้งที่เปิด — ไม่ใช้ cache เก่าที่อาจยังไม่มี visit ปัจจุบัน
    let history = [];
    try {
      history = await getHistoryByCustomer(c.customerId);
      state.currentCustomerHistory = history;
    } catch (e) {
      console.warn("history sheet load failed:", e);
      history = Array.isArray(state.currentCustomerHistory) ? state.currentCustomerHistory : [];
    }

    const sp = c.skinProfile || {};
    const missingSkin = ["skinType", "hairLook", "hairDensity"].filter((k) => !sp[k]);
    const missingNote = missingSkin.length
      ? `<p class="muted small">โปรไฟล์ยังไม่ครบ: ${escapeHtml(missingSkin.map((k) => ({ skinType: "ประเภทผิว", hairLook: "ลักษณะขน", hairDensity: "ความหนาแน่น" }[k])).join(", "))}</p>`
      : "";

    body.innerHTML = `
      <h3 class="section-title" style="margin-top:0">ผิว &amp; คิ้ว</h3>
      <div class="box-quiet">${skinRowsHtml(sp)}</div>
      ${missingNote}
      <h3 class="section-title">ประวัติบริการ</h3>
      <div class="history-sheet-list">${historyListHtml(history)}</div>
      <p class="muted small mt-12">ดูอย่างเดียว — ปิดแล้วกลับไปกรอกฟอร์มต่อได้</p>
    `;
  }

  closeBtn?.addEventListener("click", close);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !overlay.hidden) close();
  });

  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-open-history]");
    if (!btn) return;
    e.preventDefault();
    open();
  });
}

export function setFooterWizardMode(prevBtn, nextBtn, stepMetaEl, { stepIndex, lastConsultStep = LAST_CONSULT_STEP }) {
  const total = lastConsultStep + 1;
  if (stepMetaEl) {
    stepMetaEl.textContent = `ขั้นที่ ${stepIndex + 1} จาก ${total}`;
  }
  if (prevBtn) {
    prevBtn.hidden = stepIndex <= 0;
    prevBtn.innerHTML = withIcon("chevronLeft", "กลับ");
  }
  if (nextBtn) {
    nextBtn.innerHTML = stepIndex >= lastConsultStep
      ? withIcon("chevronRight", "หลังทำ")
      : withIcon("chevronRight", "ถัดไป");
  }
}

/** Cancel: เลือกปิดคิวไม่ได้รับบริการ หรือแค่พักออก */
export function wireCancelButton(buttonEl) {
  if (!buttonEl) return;
  buttonEl.addEventListener("click", async () => {
    const markNotServed = await appConfirm(
      "อยากปิดคิวนี้ว่าไม่ได้รับบริการ หรือแค่พักออกไปก่อน?",
      { title: "ออกจากฟอร์ม", okText: "ไม่ได้รับบริการ", cancelText: "พักออกก่อน" }
    );
    if (markNotServed) {
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
        state.reset();
        show("home", { data: { mode: "oldCustomerSearch", preserveSearch: true } });
      } catch (e) {
        console.warn("closeVisitNotServed failed:", e);
        await appAlert("ปิดคิวไม่สำเร็จ ลองอีกครั้ง", { title: "ทำไม่สำเร็จ" });
        buttonEl.disabled = false;
      }
      return;
    }
    const leave = await appConfirm(
      "ยังไม่ได้บันทึกล่าสุด ออกเลยไหม?\n(ถ้าอยากเก็บไว้ กดยกเลิกแล้วกด “บันทึกร่าง” ก่อน)",
      { title: "ออกโดยไม่บันทึก?", okText: "ออกเลย", cancelText: "อยู่ต่อ" }
    );
    if (!leave) return;
    show(state.currentCustomer ? "customerProfile" : "home");
  });
}
