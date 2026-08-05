import { getHistoryByCustomer, saveSkinProfile } from "../mockApi.js";
import { show, onEnter } from "../router.js";
import { state } from "../state.js";
import { OPTIONS } from "../data/options.js";
import { radioField, chipGroup, bindFieldEvents } from "../fieldHelpers.js";
import { formatDate, escapeHtml } from "../utils.js";

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
      <button type="button" class="icon-btn" id="skinEditBtn" style="padding-left:0">แก้ไขประวัติผิวและคิ้ว</button>
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
      <div style="display:flex; gap:10px; margin-top:10px">
        <button type="button" class="btn btn-outline" id="skinCancelBtn" style="flex:1">ยกเลิก</button>
        <button type="button" class="btn btn-primary" id="skinSaveBtn" style="flex:1">บันทึก</button>
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
      history = await getHistoryByCustomer(c.customerId);
    } catch (e) {
      console.warn("getHistoryByCustomer failed:", e);
      historyList.innerHTML = `<div class="empty-hint">โหลดประวัติไม่สำเร็จ — ${escapeHtml((e && e.message) || String(e))}</div>`;
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
        ${v.status === "draft" ? `<span class="draft-badge" style="margin:0 0 0 6px">Draft</span>` : ""}
        ${v.status === "ไม่ได้รับบริการ" ? `<span class="draft-badge" style="margin:0 0 0 6px; background:var(--error-bg); color:var(--error-text)">Not served</span>` : ""}
        <div class="hdetail">
          Technique: ${escapeHtml(v.technique || "-")} · Color: ${escapeHtml(v.colorUsed || "-")}<br>
          Intensity: ${escapeHtml(v.intensity || "-")}
          ${v.note ? `<br>Note: ${escapeHtml(v.note)}` : ""}
        </div>
      </div>
    `).join("");

    historyList.querySelectorAll(".history-item").forEach((el) => {
      el.addEventListener("click", () => {
        const visit = history.find((h) => h.serviceId === el.dataset.id);
        show("visitDetail", { data: visit });
      });
    });
  });
}
