import { getHistoryByCustomer, saveSkinProfile } from "../mockApi.js";
import { show, onEnter } from "../router.js";
import { state } from "../state.js";
import { OPTIONS } from "../data/options.js";
import { radioField, chipGroup, bindFieldEvents } from "../fieldHelpers.js";
import { formatDate, escapeHtml, formTypeLabel, isResumableVisitStatus, normalizeVisitStatus, visitStatusLabel } from "../utils.js";

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

// ระยะเวลาจากวันที่มารับบริการล่าสุดถึงวันนี้ ปัดเป็นจำนวนเดือนเต็ม (ตามสเปก "ครั้งที่มารับบริการล่าสุด (คำนวณเดือน)")
function monthsSince(ts) {
  if (!ts) return "-";
  const months = Math.max(0, Math.round((Date.now() - ts) / (1000 * 60 * 60 * 24 * 30)));
  return months === 0 ? "เดือนนี้" : `${months} เดือนที่แล้ว`;
}

function withTimeout(promise, ms, message) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function coalesceDraftValue(draft, key, value) {
  if (draft[key] === undefined || draft[key] === null || draft[key] === "") {
    if (Array.isArray(value)) {
      if (value.length) draft[key] = value;
    } else if (value !== undefined && value !== null && value !== "") {
      draft[key] = value;
    }
  }
}

function screenForFormType(formType) {
  if (formType === "form2") return "form2";
  if (formType === "form3") return "formTouchup";
  return "form1";
}

function shouldResumeAtTechFields(visit, draft) {
  return Boolean(
    draft.mixRatioParts ||
    draft.afterPhotoDataUrl ||
    visit.afterPhotoUrl ||
    visit.mixRatio ||
    visit.redness ||
    visit.adherence
  );
}

function isResumableVisit(visit) {
  return isResumableVisitStatus(visit?.status);
}

function visitFormBadge(visit) {
  const label = formTypeLabel(visit?.formType);
  return label ? `<span class="draft-badge draft-badge--inline">${escapeHtml(label)}</span>` : "";
}

function visitStatusBadge(visit) {
  const status = normalizeVisitStatus(visit?.status);
  if (!status) return "";
  const className = status === "completed"
    ? "is-completed"
    : status === "not_served"
      ? "is-not-served"
      : "";
  return `<span class="draft-badge draft-badge--inline ${className}">${escapeHtml(visitStatusLabel(status))}</span>`;
}

function resumeDraftVisit(visit) {
  if (!visit) return;
  const raw = (visit.rawAnswers && typeof visit.rawAnswers === "object") ? visit.rawAnswers : {};
  const formType = visit.formType || (visit.serviceType === "เติมสี" ? "form3" : "form1");

  state.visitContext = {
    visitId: visit.serviceId,
    zervaBookingId: visit.zervaBookingId || "",
    visitDate: visit.visitDate || Date.now(),
    timeSlot: visit.timeSlot || ""
  };
  state.serviceType = visit.serviceType || (formType === "form3" ? "เติมสี" : "สักคิ้ว");
  state.formType = formType;
  state.resetVisitDraft();
  Object.assign(state.visitDraft, raw);

  state.visitDraft.existingBeforePhotoUrl = visit.beforePhotoUrl || state.visitDraft.existingBeforePhotoUrl || "";
  state.visitDraft.existingAfterPhotoUrl = visit.afterPhotoUrl || state.visitDraft.existingAfterPhotoUrl || "";
  state.visitDraft.existingSignatureCustomerUrl = visit.signatureCustomerUrl || state.visitDraft.existingSignatureCustomerUrl || "";

  coalesceDraftValue(state.visitDraft, "technique", visit.technique);
  coalesceDraftValue(state.visitDraft, "colorChoice", visit.colorUsed);
  coalesceDraftValue(state.visitDraft, "intensity", visit.intensity);
  coalesceDraftValue(state.visitDraft, "muscle", visit.muscle);
  coalesceDraftValue(state.visitDraft, "shapeDesign", visit.shapeDesign);
  coalesceDraftValue(state.visitDraft, "browGuard", visit.browGuard);
  coalesceDraftValue(state.visitDraft, "satisfaction", visit.satisfaction);
  coalesceDraftValue(state.visitDraft, "colorRetention", visit.colorRetention);
  coalesceDraftValue(state.visitDraft, "wantsMoreChange", visit.wantsMoreChange);
  coalesceDraftValue(state.visitDraft, "changeItems", visit.changeItems);
  coalesceDraftValue(state.visitDraft, "redness", visit.redness);
  coalesceDraftValue(state.visitDraft, "adherence", visit.adherence);

  show(shouldResumeAtTechFields(visit, state.visitDraft) ? "techFields" : screenForFormType(formType));
}

export function initCustomerProfile() {
  const profileCard = document.getElementById("profileCard");
  const skinCard = document.getElementById("skinProfileCard");
  const historySummary = document.getElementById("historySummary");
  const historyList = document.getElementById("historyList");
  const addVisitBtn = document.getElementById("addVisitBtn");

  // object เดียวคงที่ตลอดอายุโมดูล (mutate ด้วย key เอา ห้าม reassign เป็น {} ใหม่) เพราะ bindFieldEvents
  // ผูก event delegation ไว้กับ reference นี้ตอน init ครั้งเดียว — ดูคำเตือนแบบเดียวกันใน state.js
  const skinEditDraft = {};
  let isEditingSkin = false;

  addVisitBtn.addEventListener("click", () => show("createVisit"));

  function skinSummaryHtml(sp) {
    sp = sp || {};
    return `
      <div class="detail-row"><div class="detail-label">ลักษณะผิวโดยรวม</div><div class="detail-value">${escapeHtml(sp.skinType || "-")}</div></div>
      <div class="detail-row"><div class="detail-label">ลักษณะเส้นขน</div><div class="detail-value">${escapeHtml(sp.hairLook || "-")}</div></div>
      <div class="detail-row"><div class="detail-label">ความหนาแน่นเส้นขน</div><div class="detail-value">${escapeHtml(sp.hairDensity || "-")}</div></div>
      <div class="detail-row"><div class="detail-label">ทรงคิ้ว</div><div class="detail-value">${(sp.browShape || []).join(", ") || "-"}</div></div>
      <div class="detail-row">
        <div class="detail-label">กล้ามเนื้อคิ้ว</div>
        <div class="detail-value">${sp.muscle ? escapeHtml(sp.muscle) + (sp.muscleEvaluatedAt ? ` (ประเมินล่าสุด ${formatDate(sp.muscleEvaluatedAt)})` : "") : "ยังไม่ได้ประเมิน"}${sp.muscleNote ? `<br><span class="muted small">${escapeHtml(sp.muscleNote)}</span>` : ""}</div>
      </div>
      <button type="button" class="icon-btn icon-btn--flush" id="skinEditBtn">แก้ไขประวัติผิวและคิ้ว</button>
    `;
  }

  function skinEditHtml() {
    return `
      <div class="step-group">
        <div class="step-group-title">ลักษณะผิวโดยรวม</div>
        ${radioField("skinType", OPTIONS.skinType, skinEditDraft)}
      </div>
      <div class="step-group">
        <div class="step-group-title">ลักษณะเส้นขน</div>
        ${radioField("hairLook", OPTIONS.hairLook, skinEditDraft)}
      </div>
      <div class="step-group">
        <div class="step-group-title">ความหนาแน่นเส้นขน</div>
        ${radioField("hairDensity", OPTIONS.hairDensity, skinEditDraft)}
      </div>
      <div class="step-group">
        <div class="step-group-title">ทรงคิ้ว</div>
        ${chipGroup("browShape", OPTIONS.browShape, skinEditDraft, true)}
      </div>
      <div class="row-actions">
        <button type="button" class="btn btn-outline" id="skinCancelBtn">ยกเลิก</button>
        <button type="button" class="btn btn-primary" id="skinSaveBtn">บันทึก</button>
      </div>
    `;
  }

  function renderSkinCard(c) {
    skinCard.innerHTML = isEditingSkin ? skinEditHtml() : skinSummaryHtml(c.skinProfile);
    if (isEditingSkin) {
      document.getElementById("skinCancelBtn").addEventListener("click", () => { isEditingSkin = false; renderSkinCard(c); });
      document.getElementById("skinSaveBtn").addEventListener("click", async (e) => {
        e.currentTarget.disabled = true;
        const payload = { ...skinEditDraft };
        await saveSkinProfile(c.customerId, payload);
        c.skinProfile = { ...c.skinProfile, ...payload };
        isEditingSkin = false;
        renderSkinCard(c);
      });
    } else {
      document.getElementById("skinEditBtn").addEventListener("click", () => {
        Object.keys(skinEditDraft).forEach((k) => delete skinEditDraft[k]);
        Object.assign(skinEditDraft, c.skinProfile || {});
        skinEditDraft.browShape = [...(c.skinProfile?.browShape || [])];
        isEditingSkin = true;
        renderSkinCard(c);
      });
    }
  }

  bindFieldEvents(skinCard, skinEditDraft, () => {});

  onEnter("customerProfile", async () => {
    const c = state.currentCustomer;
    if (!c) { show("home"); return; }
    isEditingSkin = false;

    const age = ageFromDob(c.dob);
    profileCard.innerHTML = `
      <div class="pname">${escapeHtml(c.fullName || c.nickname)}</div>
      <div class="pmeta">
        ${c.nickname ? `ชื่อเล่น: ${escapeHtml(c.nickname)} &nbsp;·&nbsp; ` : ""}${c.dob ? `${escapeHtml(c.dob)}${age !== null ? ` (${age} ปี)` : ""} &nbsp;·&nbsp; ` : ""}☎ ${escapeHtml(c.phoneDisplay)}${c.line ? " &nbsp;·&nbsp; LINE: " + escapeHtml(c.line) : ""}
      </div>
      <div class="pmeta">${escapeHtml(c.customerId)}</div>
    `;

    renderSkinCard(c);

    historySummary.hidden = true;
    historyList.innerHTML = `<div class="empty-hint">Loading history...</div>`;
    let history = [];
    try {
      history = await withTimeout(getHistoryByCustomer(c.customerId), 8000, "โหลดประวัตินานเกินไป กรุณาลองเปิดใหม่อีกครั้ง");
      state.currentCustomerHistory = history;
    } catch (e) {
      console.warn("getHistoryByCustomer failed:", e);
      historyList.innerHTML = `<div class="empty-hint">โหลดประวัติไม่สำเร็จ — ${escapeHtml((e && e.message) || String(e))}<br><button type="button" class="btn btn-primary mt-12" id="retryHistoryBtn">ลองใหม่</button></div>`;
      const retryBtn = document.getElementById("retryHistoryBtn");
      if (retryBtn) retryBtn.addEventListener("click", () => show("customerProfile", { pushHistory: false }));
      return;
    }

    if (history.length === 0) {
      historyList.innerHTML = `<div class="empty-hint">No service history yet</div>`;
      return;
    }

    // สรุปย่อตามสเปก: "ครั้งที่มารับบริการล่าสุด (คำนวณเดือน)" + "เทคนิคที่ทำ" ก่อนรายการเต็มด้านล่าง
    historySummary.hidden = false;
    historySummary.innerHTML = `
      <div class="detail-row"><div class="detail-label">ครั้งที่มารับบริการล่าสุด</div><div class="detail-value">${escapeHtml(monthsSince(history[0].visitDate))}</div></div>
      <div class="detail-row"><div class="detail-label">เทคนิคที่ทำ</div><div class="detail-value">${escapeHtml(history[0].technique || "-")}</div></div>
    `;

    historyList.innerHTML = history.map((v) => `
      <div class="history-item" data-id="${v.serviceId}">
        <span class="hdate">${formatDate(v.visitDate)}</span>
        <span class="htype ${v.serviceType === "เติมสี" ? "touchup" : ""}">${escapeHtml(v.serviceType)}</span>
        ${visitFormBadge(v)}
        ${visitStatusBadge(v)}
        <div class="hdetail">
          Technique: ${escapeHtml(v.technique || "-")} · Color: ${escapeHtml(v.colorUsed || "-")}<br>
          Intensity: ${escapeHtml(v.intensity || "-")}
          ${v.note ? `<br>Note: ${escapeHtml(v.note)}` : ""}
          ${isResumableVisit(v) ? `<br><b>กดเพื่อแก้ไขต่อ</b>` : ""}
        </div>
      </div>
    `).join("");

    historyList.querySelectorAll(".history-item").forEach((el) => {
      el.addEventListener("click", () => {
        const visit = history.find((h) => h.serviceId === el.dataset.id);
        if (isResumableVisit(visit)) {
          resumeDraftVisit(visit);
        } else {
          show("visitDetail", { data: visit });
        }
      });
    });
  });
}
