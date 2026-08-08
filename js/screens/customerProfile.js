// customerProfile.js — Customer Profile (hero + stats + skin panel + visit cards)

import { getHistoryByCustomer, saveSkinProfile } from "../mockApi.js?v=20260808ae";
import { show, onEnter } from "../router.js?v=20260808ae";
import { state } from "../state.js?v=20260808ae";
import { OPTIONS } from "../data/options.js?v=20260808ae";
import { radioField, chipGroup, bindFieldEvents } from "../fieldHelpers.js?v=20260808ae";
import { formatDate, escapeHtml, formTypeLabel, isResumableVisitStatus, normalizeVisitStatus, visitStatusLabel, visitStatusBadgeClass } from "../utils.js?v=20260808ae";
import { enrichVisitForDisplay } from "../formWizard.js?v=20260808ae";

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

function formatMonthYear(ts) {
  if (!ts) return "-";
  const d = new Date(ts);
  if (isNaN(d.getTime())) return "-";
  const months = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  return `${months[d.getMonth()]} ${d.getFullYear() + 543}`;
}

function initials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
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

function resolveResumeStep(visit, draft) {
  const saved = Number(draft?.formStepIndex);
  if (Number.isFinite(saved) && saved >= 0) return saved;
  if (shouldResumeAtTechFields(visit, draft)) return 5;
  return 0;
}

function isResumableVisit(visit) {
  return isResumableVisitStatus(visit?.status);
}

function serviceTypeBadge(visit) {
  const label = visit?.serviceType || "Visit";
  const kind = visit?.serviceType === "เติมสี" ? "touchup" : "brow";
  return `<span class="cp-pill cp-pill--${kind}">${escapeHtml(label)}</span>`;
}

function formTypeBadge(visit) {
  const label = formTypeLabel(visit?.formType);
  if (!label) return "";
  const kind = visit?.formType === "form3" ? "form3" : visit?.formType === "form2" ? "form2" : "form1";
  return `<span class="cp-pill cp-pill--${kind}">${escapeHtml(label)}</span>`;
}

function statusBadge(visit) {
  const status = normalizeVisitStatus(visit?.status);
  if (!status) return "";
  return `<span class="cp-pill cp-pill--status ${visitStatusBadgeClass(status)}">${escapeHtml(visitStatusLabel(status))}</span>`;
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
  delete state.visitDraft.formStepIndex;

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

  const step = resolveResumeStep(visit, raw);
  state.formStepIndex = step;
  show(step >= 5 ? "techFields" : screenForFormType(formType));
}

export function initCustomerProfile() {
  const profileCard = document.getElementById("profileCard");
  const profileStats = document.getElementById("profileStats");
  const skinCard = document.getElementById("skinProfileCard");
  const historyCount = document.getElementById("historyCount");
  const historyList = document.getElementById("historyList");
  const addVisitBtn = document.getElementById("addVisitBtn");
  const backBtn = document.getElementById("customerProfileBackBtn");

  const skinEditDraft = {};
  let isEditingSkin = false;

  addVisitBtn?.addEventListener("click", () => show("createVisit"));
  backBtn?.addEventListener("click", () => {
    if (state.customerFlow === "old") {
      show("home", { data: { mode: "oldCustomerSearch", preserveSearch: true }, pushHistory: false });
      return;
    }
    show("home", { pushHistory: false });
  });

  function skinField(label, value) {
    return `
      <div class="cp-field">
        <span class="cp-field-label">${escapeHtml(label)}</span>
        <strong class="cp-field-value">${escapeHtml(value || "-")}</strong>
      </div>`;
  }

  function skinSummaryHtml(sp) {
    sp = sp || {};
    const muscle = sp.muscle
      ? `${sp.muscle}${sp.muscleEvaluatedAt ? ` · ${formatDate(sp.muscleEvaluatedAt)}` : ""}`
      : "ยังไม่ได้ประเมิน";
    return `
      <div class="cp-panel-head">
        <h3 class="cp-section-title">ผิว &amp; คิ้ว</h3>
        <button type="button" class="cp-edit-link" id="skinEditBtn">แก้ไข</button>
      </div>
      <div class="cp-skin-grid">
        ${skinField("ประเภทผิว", sp.skinType)}
        ${skinField("ลักษณะขน", sp.hairLook)}
        ${skinField("ความหนาแน่น", sp.hairDensity)}
        ${skinField("ทรงคิ้ว", (sp.browShape || []).join(", "))}
        ${skinField("กล้ามเนื้อคิ้ว", muscle)}
        ${sp.muscleNote ? skinField("โน้ตกล้ามเนื้อ", sp.muscleNote) : skinField("โน้ตกล้ามเนื้อ", "-")}
      </div>`;
  }

  function skinEditHtml() {
    return `
      <div class="cp-panel-head">
        <h3 class="cp-section-title">ผิว &amp; คิ้ว</h3>
      </div>
      <div class="step-group">
        <div class="step-group-title">ประเภทผิว</div>
        ${radioField("skinType", OPTIONS.skinType, skinEditDraft)}
      </div>
      <div class="step-group">
        <div class="step-group-title">ลักษณะขน</div>
        ${radioField("hairLook", OPTIONS.hairLook, skinEditDraft)}
      </div>
      <div class="step-group">
        <div class="step-group-title">ความหนาแน่น</div>
        ${radioField("hairDensity", OPTIONS.hairDensity, skinEditDraft)}
      </div>
      <div class="step-group">
        <div class="step-group-title">ทรงคิ้ว</div>
        ${chipGroup("browShape", OPTIONS.browShape, skinEditDraft, true)}
      </div>
      <div class="row-actions">
        <button type="button" class="btn btn-outline" id="skinCancelBtn">ยกเลิก</button>
        <button type="button" class="btn btn-primary" id="skinSaveBtn">บันทึก</button>
      </div>`;
  }

  function renderSkinCard(c) {
    skinCard.innerHTML = isEditingSkin ? skinEditHtml() : skinSummaryHtml(c.skinProfile);
    if (isEditingSkin) {
      document.getElementById("skinCancelBtn")?.addEventListener("click", () => {
        isEditingSkin = false;
        renderSkinCard(c);
      });
      document.getElementById("skinSaveBtn")?.addEventListener("click", async (e) => {
        e.currentTarget.disabled = true;
        const payload = { ...skinEditDraft };
        await saveSkinProfile(c.customerId, payload);
        c.skinProfile = { ...c.skinProfile, ...payload };
        isEditingSkin = false;
        renderSkinCard(c);
      });
    } else {
      document.getElementById("skinEditBtn")?.addEventListener("click", () => {
        Object.keys(skinEditDraft).forEach((k) => delete skinEditDraft[k]);
        Object.assign(skinEditDraft, c.skinProfile || {});
        skinEditDraft.browShape = [...(c.skinProfile?.browShape || [])];
        isEditingSkin = true;
        renderSkinCard(c);
      });
    }
  }

  function renderHero(c) {
    const age = ageFromDob(c.dob);
    const displayName = c.fullName || c.nickname || "Customer";
    const metaBits = [];
    if (c.nickname && c.fullName && c.nickname !== c.fullName) {
      metaBits.push(`ชื่อเล่น: ${escapeHtml(c.nickname)}`);
    }
    if (c.dob) metaBits.push(`${escapeHtml(c.dob)}${age != null ? ` (${age} ปี)` : ""}`);
    if (c.line) metaBits.push(`LINE @${escapeHtml(c.line)}`);

    profileCard.innerHTML = `
      <span class="cp-avatar" aria-hidden="true">${escapeHtml(initials(c.nickname || displayName))}</span>
      <div class="cp-hero-text">
        <div class="cp-hero-name">${escapeHtml(displayName)}</div>
        ${metaBits.length ? `<div class="cp-hero-meta">${metaBits.join(" · ")}</div>` : ""}
        <div class="cp-hero-ids">
          <span>${escapeHtml(c.customerId || "-")}</span>
          <span>${escapeHtml(c.phoneDisplay || c.phone || "-")}</span>
        </div>
      </div>`;
  }

  function renderStats(history) {
    const latest = (history && history[0]) || null;
    const techVisit = (history || []).find((v) => v.technique) || latest;
    const total = history.length;
    profileStats.hidden = false;
    profileStats.innerHTML = `
      <div class="cp-stat">
        <strong class="cp-stat-value">${total}</strong>
        <span class="cp-stat-label">จำนวนครั้ง</span>
      </div>
      <div class="cp-stat">
        <strong class="cp-stat-value">${escapeHtml(formatMonthYear(latest?.visitDate))}</strong>
        <span class="cp-stat-label">ครั้งล่าสุด</span>
      </div>
      <div class="cp-stat">
        <strong class="cp-stat-value">${escapeHtml(techVisit?.technique || "—")}</strong>
        <span class="cp-stat-label">เทคนิค</span>
      </div>`;
  }

  function visitCardHtml(v) {
    v = enrichVisitForDisplay(v);
    const hasDetails = Boolean(v.technique || v.colorUsed || v.intensity || v.note);
    return `
      <article class="cp-visit${isResumableVisit(v) ? " is-resumable" : ""}" data-id="${escapeHtml(v.serviceId)}" role="button" tabindex="0">
        <div class="cp-visit-top">
          <div class="cp-visit-pills">
            ${serviceTypeBadge(v)}
            ${formTypeBadge(v)}
            ${statusBadge(v)}
          </div>
          <time class="cp-visit-date">${escapeHtml(formatDate(v.visitDate))}</time>
        </div>
        ${hasDetails ? `
        <div class="cp-visit-grid">
          <div class="cp-field">
            <span class="cp-field-label">เทคนิค</span>
            <strong class="cp-field-value">${escapeHtml(v.technique || "—")}</strong>
          </div>
          <div class="cp-field">
            <span class="cp-field-label">สี</span>
            <strong class="cp-field-value">${escapeHtml(v.colorUsed || "—")}</strong>
          </div>
          <div class="cp-field">
            <span class="cp-field-label">ความเข้ม</span>
            <strong class="cp-field-value">${escapeHtml(v.intensity || "—")}</strong>
          </div>
        </div>` : ""}
        ${v.note ? `<p class="cp-visit-note">${escapeHtml(v.note)}</p>` : ""}
        ${isResumableVisit(v) ? `<p class="cp-visit-hint">กดเพื่อทำต่อจากขั้นที่ค้างไว้</p>` : ""}
      </article>`;
  }

  bindFieldEvents(skinCard, skinEditDraft, () => {});

  onEnter("customerProfile", async () => {
    const c = state.currentCustomer;
    if (!c) { show("home"); return; }
    isEditingSkin = false;

    renderHero(c);
    renderSkinCard(c);
    profileStats.hidden = true;
    profileStats.innerHTML = "";
    if (historyCount) historyCount.textContent = "";
    historyList.innerHTML = `<div class="empty-hint">กำลังโหลดประวัติ...</div>`;

    let history = [];
    try {
      history = await withTimeout(getHistoryByCustomer(c.customerId), 8000, "History took too long — please try again");
      state.currentCustomerHistory = history;
    } catch (e) {
      console.warn("getHistoryByCustomer failed:", e);
      historyList.innerHTML = `<div class="empty-hint">โหลดประวัติไม่สำเร็จ — ${escapeHtml((e && e.message) || String(e))}<br><button type="button" class="btn btn-primary mt-12" id="retryHistoryBtn">ลองอีกครั้ง</button></div>`;
      document.getElementById("retryHistoryBtn")?.addEventListener("click", () => show("customerProfile", { pushHistory: false }));
      return;
    }

    renderStats(history);
    if (historyCount) {
      historyCount.textContent = history.length ? `${history.length} ครั้ง` : "ยังไม่มี";
    }

    if (history.length === 0) {
      historyList.innerHTML = `<div class="empty-hint">ยังไม่มีประวัติบริการ</div>`;
      return;
    }

    historyList.innerHTML = history.map(visitCardHtml).join("");

    historyList.querySelectorAll(".cp-visit").forEach((el) => {
      const open = () => {
        const visit = history.find((h) => h.serviceId === el.dataset.id);
        if (isResumableVisit(visit)) resumeDraftVisit(visit);
        else show("visitDetail", { data: visit });
      };
      el.addEventListener("click", open);
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open();
        }
      });
    });
  });
}
