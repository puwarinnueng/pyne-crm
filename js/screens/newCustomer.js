// newCustomer.js — Step 2 (ลูกค้าใหม่): กรอกข้อมูลส่วนตัว 5 ฟิลด์ > ยืนยันข้อมูล > กรอกประวัติผิวและคิ้ว > สร้าง Customer Profile
// flow: home > "+ New Customer" > หน้านี้ > สร้างลูกค้าเข้า DB > ไปหน้าสร้าง Visit (Step 3)

import { show, onEnter } from "../router.js";
import { state } from "../state.js";
import { findCustomerByPhone, createCustomer, saveSkinProfile, confirmCustomerProfile } from "../mockApi.js";
import { OPTIONS } from "../data/options.js";
import { radioField, chipGroup, bindFieldEvents } from "../fieldHelpers.js";
import { escapeHtml } from "../utils.js";

// state ชั่วคราวของหน้านี้เท่านั้น (ยังไม่ได้สร้าง customer จริงจนกว่าจะกด Continue) — ไม่ใช้ state.visitDraft
// เพราะฟิลด์นี้เป็นของ Customer Profile ไม่ใช่ของ Visit
const draft = {};

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

export function initNewCustomer() {
  const container = document.getElementById("newCustomerBody");
  const backBtn = document.getElementById("newCustomerBackBtn");

  function summaryHtml() {
    const age = ageFromDob(draft.dob);
    return `
      <div class="detail-row"><div class="detail-label">ชื่อ–นามสกุล</div><div class="detail-value">${escapeHtml(draft.fullName || "-")}</div></div>
      <div class="detail-row"><div class="detail-label">ชื่อเล่น</div><div class="detail-value">${escapeHtml(draft.nickname || "-")}</div></div>
      <div class="detail-row"><div class="detail-label">วันเดือนปีเกิด</div><div class="detail-value">${escapeHtml(draft.dob || "-")}${age !== null ? ` (อายุ ${age} ปี)` : ""}</div></div>
      <div class="detail-row"><div class="detail-label">เบอร์โทรศัพท์</div><div class="detail-value">${escapeHtml(draft.phone || "-")}</div></div>
    `;
  }

  function render() {
    container.innerHTML = `
      <p class="choose-lead">กรอกข้อมูลลูกค้าใหม่เพื่อสร้าง Customer Profile</p>

      <label class="field-label">ชื่อ–นามสกุลจริง <span class="required-star">*</span></label>
      <input type="text" id="ncFullName" class="input" placeholder="เช่น มาลี ใจดี" autocomplete="off">
      <label class="field-label">ชื่อเล่น <span class="required-star">*</span></label>
      <input type="text" id="ncNickname" class="input" placeholder="เช่น มายด์" autocomplete="off">
      <label class="field-label">วันเดือนปีเกิด <span class="required-star">*</span></label>
      <input type="date" id="ncDob" class="input">
      <label class="field-label">เบอร์โทรศัพท์ <span class="required-star">*</span></label>
      <input type="tel" id="ncPhone" class="input" inputmode="tel" placeholder="08x-xxx-xxxx" autocomplete="off">
      <label class="field-label">LINE ID (ถ้ามี)</label>
      <input type="text" id="ncLine" class="input" placeholder="Optional" autocomplete="off">
      <div id="ncWarning"></div>

      <div class="form-section-title">ยืนยันข้อมูลส่วนตัว</div>
      <div class="box-quiet" id="ncSummaryBox">${summaryHtml()}</div>
      <div class="step-group">
        <div class="step-group-title">ข้อมูลส่วนตัวถูกต้องหรือไม่ <span class="required-star">*</span></div>
        ${radioField("confirmOk", ["ถูกต้อง", "แก้ไข"], draft)}
      </div>

      <div class="form-section-title">ประวัติผิวและคิ้ว</div>
      <div class="step-group">
        <div class="step-group-title">ลักษณะผิวโดยรวม</div>
        ${radioField("skinType", OPTIONS.skinType, draft)}
      </div>
      <div class="step-group">
        <div class="step-group-title">ลักษณะเส้นขน</div>
        ${radioField("hairLook", OPTIONS.hairLook, draft)}
      </div>
      <div class="step-group">
        <div class="step-group-title">ความหนาแน่นเส้นขน</div>
        ${radioField("hairDensity", OPTIONS.hairDensity, draft)}
      </div>
      <div class="step-group">
        <div class="step-group-title">ทรงคิ้ว</div>
        ${chipGroup("browShape", OPTIONS.browShape, draft, true)}
      </div>
      <p class="muted small">กล้ามเนื้อคิ้ว: ยังไม่ได้ประเมิน (จะประเมินหลังเช็ดคิ้ว/วัดทรงจริงในฟอร์ม 1 หรือ 2 ครั้งแรก)</p>

      <button class="btn btn-primary btn-block mt-16" id="ncCreateBtn2">Create Customer &amp; Continue</button>
    `;

    ["ncFullName", "ncNickname", "ncDob", "ncPhone", "ncLine"].forEach((id) => {
      const el = document.getElementById(id);
      const key = { ncFullName: "fullName", ncNickname: "nickname", ncDob: "dob", ncPhone: "phone", ncLine: "line" }[id];
      el.value = draft[key] || "";
      el.addEventListener("input", () => {
        draft[key] = el.value;
        el.classList.remove("field-error");
        document.getElementById("ncSummaryBox").innerHTML = summaryHtml();
      });
    });

    document.getElementById("ncCreateBtn2").addEventListener("click", onCreate);
  }

  bindFieldEvents(container, draft, () => {});

  container.addEventListener("input", (e) => {
    const errEl = e.target.closest(".field-error");
    if (errEl) errEl.classList.remove("field-error");
  });
  container.addEventListener("click", (e) => {
    const errEl = e.target.closest(".field-error");
    if (errEl) errEl.classList.remove("field-error");
  });

  function clearErrors() {
    container.querySelectorAll(".field-error").forEach((el) => el.classList.remove("field-error"));
    document.getElementById("ncWarning").innerHTML = "";
  }
  function flagError(selector) {
    const el = container.querySelector(selector);
    if (el) el.classList.add("field-error");
    return el;
  }

  backBtn.addEventListener("click", () => show("home"));

  async function onCreate() {
    clearErrors();
    const nameEl = !draft.fullName?.trim() ? flagError("#ncFullName") : null;
    const nickEl = !draft.nickname?.trim() ? flagError("#ncNickname") : null;
    const dobEl = !draft.dob ? flagError("#ncDob") : null;
    const phoneEl = !draft.phone?.trim() ? flagError("#ncPhone") : null;
    const confirmEl = draft.confirmOk !== "ถูกต้อง" ? flagError('[data-radio-key="confirmOk"]') : null;
    const firstErr = nameEl || nickEl || dobEl || phoneEl || confirmEl;
    if (firstErr) { firstErr.scrollIntoView({ behavior: "smooth", block: "center" }); return; }

    const createBtn2 = document.getElementById("ncCreateBtn2");
    createBtn2.disabled = true;
    createBtn2.textContent = "กำลังสร้าง...";

    // ทุก request ข้างล่างนี้ยิงไปเซิร์ฟเวอร์จริง (Apps Script + LockService) พังได้ทั้งจาก network
    // hiccup หรือ lock timeout เวลาช่างหลายคนกดพร้อมกัน — เดิมไม่มี try/catch เลยสักจุด ถ้า request ไหน
    // reject ปุ่มจะค้าง disabled (หรือค้างหน้าเดิมเฉยๆ ไม่ error ไม่ navigate ต่อ) ดูเหมือนแอปค้าง/โหลดไม่ขึ้น
    let existing;
    try {
      existing = await findCustomerByPhone(draft.phone);
    } catch (e) {
      createBtn2.disabled = false;
      createBtn2.textContent = "Create Customer & Continue";
      document.getElementById("ncWarning").innerHTML = `<div class="dup-warning">⚠ เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</div>`;
      return;
    }
    if (existing) {
      createBtn2.disabled = false;
      createBtn2.textContent = "Create Customer & Continue";
      document.getElementById("ncWarning").innerHTML = `
        <div class="dup-warning">
          ⚠ This phone number already exists: <b>${escapeHtml(existing.fullName || existing.nickname)}</b> (${escapeHtml(existing.phoneDisplay)})<br>
          Please use the existing customer instead of creating a duplicate.
          <br><button class="btn btn-primary mt-8" id="ncUseExistingBtn" type="button">Open this customer</button>
        </div>`;
      document.getElementById("ncUseExistingBtn").addEventListener("click", () => {
        state.currentCustomer = existing;
        state.customerFlow = "old";
        state.currentCustomerHistory = null;
        show("customerProfile");
      });
      return;
    }

    let res;
    try {
      res = await createCustomer({
        fullName: draft.fullName.trim(), nickname: draft.nickname.trim(),
        dob: draft.dob, phone: draft.phone.trim(), line: (draft.line || "").trim()
      });
    } catch (e) {
      createBtn2.disabled = false;
      createBtn2.textContent = "Create Customer & Continue";
      document.getElementById("ncWarning").innerHTML = `<div class="dup-warning">⚠ สร้าง Customer Profile ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</div>`;
      return;
    }
    if (!res.success) {
      createBtn2.disabled = false;
      createBtn2.textContent = "Create Customer & Continue";
      document.getElementById("ncWarning").innerHTML = `<div class="dup-warning">⚠ Could not create customer (this phone may have just been added). Please try again.</div>`;
      return;
    }

    // ลูกค้าถูกสร้างสำเร็จแล้ว ณ จุดนี้ (มี customerId จริงในฐานข้อมูล) — ตั้ง state ทันทีกันไม่ให้ค้าง
    // หน้าเดิมถ้าขั้นตอนถัดไป (บันทึกประวัติผิว/ยืนยันข้อมูล) พังภายหลัง ประวัติผิวแก้ทีหลังได้ใน Customer Profile
    state.currentCustomer = res.customer;
    state.customerFlow = "new";
    state.currentCustomerHistory = [];
    try {
      const skinRes = await saveSkinProfile(res.customer.customerId, {
        skinType: draft.skinType || null,
        hairLook: draft.hairLook || null,
        hairDensity: draft.hairDensity || null,
        browShape: draft.browShape || []
      });
      const confirmRes = await confirmCustomerProfile(res.customer.customerId);
      // ใช้ผลลัพธ์ล่าสุดหลังอัปเดต skinProfile/profileConfirmedAt แล้ว ไม่ใช่ res.customer ตอน createCustomer()
      // ตอนนั้น (ก่อน saveSkinProfile/confirmCustomerProfile เขียนทับ) เพราะจะทำให้หน้าถัดไปเห็น skinProfile ว่างเปล่า
      state.currentCustomer = confirmRes.customer || skinRes.customer || res.customer;
    } catch (e) {
      console.warn("saveSkinProfile/confirmCustomerProfile failed after customer was created:", e);
    }

    Object.keys(draft).forEach((k) => delete draft[k]);
    show("createVisit");
  }

  onEnter("newCustomer", () => {
    Object.keys(draft).forEach((k) => delete draft[k]);
    render();
  });
}
