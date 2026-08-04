import { show } from "../router.js";
import { state } from "../state.js";

let modalEl = null;
let closeTimer = null;

function getModal() {
  if (!modalEl) modalEl = document.getElementById("serviceTypeModal");
  return modalEl;
}

// เปิด modal เลือกฟอร์ม Consultation (Step 4) ทับหน้าจอปัจจุบัน — เรียกหลังสร้าง Visit (Step 3) เสร็จเสมอ
export function openServiceTypeModal() {
  const modal = getModal();
  if (!modal) return;
  // "เติมสีคิ้ว" (Form 3) ใช้ได้เฉพาะลูกค้าที่เคยมีประวัติสักคิ้วกับร้านมาก่อนเท่านั้น
  document.getElementById("chooseForm3Btn").hidden = !state.currentCustomer;
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

  document.getElementById("chooseForm1Btn").addEventListener("click", () => {
    state.serviceType = "สักคิ้ว";
    state.formType = "form1";
    closeServiceTypeModal();
    show("form1");
  });

  document.getElementById("chooseForm2Btn").addEventListener("click", () => {
    state.serviceType = "สักคิ้ว";
    state.formType = "form2";
    closeServiceTypeModal();
    show("form2");
  });

  document.getElementById("chooseForm3Btn").addEventListener("click", () => {
    state.serviceType = "เติมสี";
    state.formType = "form3";
    closeServiceTypeModal();
    show("formTouchup");
  });
}
