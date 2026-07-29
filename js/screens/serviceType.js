import { show } from "../router.js";
import { state } from "../state.js";

let modalEl = null;
let closeTimer = null;

function getModal() {
  if (!modalEl) modalEl = document.getElementById("serviceTypeModal");
  return modalEl;
}

// เปิด modal เลือกประเภทบริการทับหน้าจอปัจจุบัน (home หรือ customerProfile)
export function openServiceTypeModal() {
  const modal = getModal();
  if (!modal) return;
  // "เติมสี" ใช้ได้เฉพาะลูกค้าเก่าที่มีประวัติอยู่แล้ว — ลูกค้าใหม่ต้องทำ "สักคิ้ว" เท่านั้น
  document.getElementById("chooseTouchupBtn").hidden = !state.currentCustomer;
  clearTimeout(closeTimer);
  modal.hidden = false;
  requestAnimationFrame(() => modal.classList.add("is-open"));
}

export function closeServiceTypeModal() {
  const modal = getModal();
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

  document.getElementById("chooseBrowBtn").addEventListener("click", () => {
    state.serviceType = "สักคิ้ว";
    state.resetVisitDraft();
    state.browStepIndex = 0;
    closeServiceTypeModal();
    show("formBrow");
  });

  document.getElementById("chooseTouchupBtn").addEventListener("click", () => {
    state.serviceType = "เติมสี";
    state.resetVisitDraft();
    closeServiceTypeModal();
    show("formTouchup");
  });
}
