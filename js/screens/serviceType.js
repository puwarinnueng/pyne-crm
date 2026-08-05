import { show } from "../router.js";
import { state } from "../state.js";
import { getHistoryByCustomer } from "../mockApi.js";
import { isCompletedBrowVisit } from "../utils.js";

let modalEl = null;
let closeTimer = null;

function getModal() {
  if (!modalEl) modalEl = document.getElementById("serviceTypeModal");
  return modalEl;
}

// เปิด modal เลือกฟอร์ม Consultation (Step 4) ทับหน้าจอปัจจุบัน — เรียกหลังสร้าง Visit (Step 3) เสร็จเสมอ
export async function openServiceTypeModal() {
  const modal = getModal();
  if (!modal) return;
  const form3Btn = document.getElementById("chooseForm3Btn");
  // "เติมสีคิ้ว" (Form 3) ใช้ได้เฉพาะลูกค้าที่เคยมีประวัติเข้ารับบริการกับร้านมาก่อนหน้า Visit นี้เท่านั้น
  // เดิมเช็คแค่ "มี state.currentCustomer อยู่ไหม" ซึ่งจริงอยู่เสมอ (ทั้งลูกค้าใหม่/เก่า) ณ จุดนี้ของ flow
  // เลยไม่เคยซ่อนปุ่มนี้จริง ๆ เลยสักครั้ง — ต้องเช็คประวัติจริงจากเซิร์ฟเวอร์ ซ่อนไว้ก่อนเป็นค่า default
  // ระหว่างรอผลเช็ค กันโชว์ผิดช่วง loading
  form3Btn.hidden = true;
  clearTimeout(closeTimer);
  modal.hidden = false;
  requestAnimationFrame(() => modal.classList.add("is-open"));

  if (state.currentCustomer) {
    try {
      const history = await getHistoryByCustomer(state.currentCustomer.customerId);
      const currentVisitId = state.visitContext && state.visitContext.visitId;
      const hasPriorVisit = history.some((v) => v.serviceId !== currentVisitId && isCompletedBrowVisit(v));
      form3Btn.hidden = !hasPriorVisit;
    } catch (e) {
      // เช็คประวัติไม่สำเร็จ — ปลอดภัยไว้ก่อนด้วยการซ่อน Form 3 ต่อไป แทนที่จะเสี่ยงโชว์ผิด
    }
  }
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
