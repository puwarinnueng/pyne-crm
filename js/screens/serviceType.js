import { show } from "../router.js";
import { state } from "../state.js";
import { createVisit, getHistoryByCustomer } from "../mockApi.js";
import { appAlert } from "../dialogs.js";
import { isCompletedBrowVisit } from "../utils.js";

let modalEl = null;
let closeTimer = null;
let isChoosing = false;

function getModal() {
  if (!modalEl) modalEl = document.getElementById("serviceTypeModal");
  return modalEl;
}

function cachedHistoryForCurrentCustomer() {
  const customerId = state.currentCustomer && state.currentCustomer.customerId;
  const history = Array.isArray(state.currentCustomerHistory) ? state.currentCustomerHistory : null;
  if (!customerId || !history) return null;
  return history.every((v) => v.customerId === customerId) ? history : null;
}

function canUseForm3(history) {
  const currentVisitId = state.visitContext && state.visitContext.visitId;
  return (history || []).some((v) => v.serviceId !== currentVisitId && isCompletedBrowVisit(v));
}

// เปิด modal เลือกฟอร์ม Consultation (Step 4) ทับหน้าจอปัจจุบัน
// แถว ServiceHistory จะถูกสร้างหลังเลือก Form สำเร็จเท่านั้น เพื่อไม่ให้มี Visit เปล่าค้างใน history
export async function openServiceTypeModal() {
  const modal = getModal();
  if (!modal) return;
  const form3Btn = document.getElementById("chooseForm3Btn");
  setChoosingDisabled(false);
  // "เติมสีคิ้ว" (Form 3) ใช้ได้เฉพาะลูกค้าที่เคยมีประวัติเข้ารับบริการกับร้านมาก่อนหน้า Visit นี้เท่านั้น
  // เดิมเช็คแค่ "มี state.currentCustomer อยู่ไหม" ซึ่งจริงอยู่เสมอ (ทั้งลูกค้าใหม่/เก่า) ณ จุดนี้ของ flow
  // เลยไม่เคยซ่อนปุ่มนี้จริง ๆ เลยสักครั้ง — ต้องเช็คประวัติจริงจากเซิร์ฟเวอร์ ซ่อนไว้ก่อนเป็นค่า default
  // ระหว่างรอผลเช็ค กันโชว์ผิดช่วง loading
  form3Btn.hidden = true;
  clearTimeout(closeTimer);
  modal.hidden = false;
  requestAnimationFrame(() => modal.classList.add("is-open"));

  if (!state.currentCustomer || state.customerFlow === "new") return;

  const cached = cachedHistoryForCurrentCustomer();
  if (cached) {
    form3Btn.hidden = !canUseForm3(cached);
    return;
  }

  try {
    const history = await getHistoryByCustomer(state.currentCustomer.customerId);
    state.currentCustomerHistory = history;
    form3Btn.hidden = !canUseForm3(history);
  } catch (e) {
    // เช็คประวัติไม่สำเร็จ — ปลอดภัยไว้ก่อนด้วยการซ่อน Form 3 ต่อไป แทนที่จะเสี่ยงโชว์ผิด
  }
}

function setChoosingDisabled(disabled, activeId = null) {
  isChoosing = disabled;
  ["chooseForm1Btn", "chooseForm2Btn", "chooseForm3Btn"].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.disabled = disabled;
    el.classList.toggle("is-loading", disabled && id === activeId);
    el.classList.toggle("is-muted", disabled && id !== activeId);
    if (disabled && id === activeId) el.setAttribute("aria-busy", "true");
    else el.removeAttribute("aria-busy");
  });
  const closeBtn = document.getElementById("serviceTypeCloseBtn");
  if (closeBtn) closeBtn.disabled = disabled;
}

async function chooseForm({ serviceType, formType, screenId, buttonId }) {
  if (isChoosing) return;
  const c = state.currentCustomer;
  const meta = state.pendingVisitMeta;
  if (!c || !meta) {
    closeServiceTypeModal();
    show(c ? "createVisit" : "home");
    return;
  }

  state.serviceType = serviceType;
  state.formType = formType;
  setChoosingDisabled(true, buttonId);
  try {
    const res = await createVisit({
      ...meta,
      serviceType,
      formType
    });
    state.visitContext = {
      visitId: res.visitId,
      zervaBookingId: meta.zervaBookingId,
      visitDate: meta.visitDate,
      timeSlot: meta.timeSlot
    };
    state.pendingVisitMeta = null;
    state.resetVisitDraft();
    closeServiceTypeModal({ force: true });
    show(screenId);
  } catch (e) {
    console.warn("createVisit after form selection failed:", e);
    await appAlert("สร้าง Visit ไม่สำเร็จ — เช็คสัญญาณอินเทอร์เน็ตแล้วลองใหม่อีกครั้ง", { title: "สร้าง Visit ไม่สำเร็จ" });
  } finally {
    setChoosingDisabled(false);
  }
}

export function closeServiceTypeModal(options = {}) {
  const modal = getModal();
  if (isChoosing && !options.force) return;
  if (!modal || modal.hidden) return;
  modal.classList.remove("is-open");
  closeTimer = setTimeout(() => { modal.hidden = true; }, 220);
}

export function initServiceType() {
  const modal = getModal();
  if (!modal) return;

  document.getElementById("serviceTypeCloseBtn").addEventListener("click", closeServiceTypeModal);

  // คลิกพื้นหลัง (backdrop) เพื่อปิด
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeServiceTypeModal();
  });

  // ปุ่ม Esc เพื่อปิด
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.hidden) closeServiceTypeModal();
  });

  document.getElementById("chooseForm1Btn").addEventListener("click", () => {
    chooseForm({ serviceType: "สักคิ้ว", formType: "form1", screenId: "form1", buttonId: "chooseForm1Btn" });
  });

  document.getElementById("chooseForm2Btn").addEventListener("click", () => {
    chooseForm({ serviceType: "สักคิ้ว", formType: "form2", screenId: "form2", buttonId: "chooseForm2Btn" });
  });

  document.getElementById("chooseForm3Btn").addEventListener("click", () => {
    chooseForm({ serviceType: "เติมสี", formType: "form3", screenId: "formTouchup", buttonId: "chooseForm3Btn" });
  });
}
