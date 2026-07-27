import { show, onEnter } from "../router.js";
import { state } from "../state.js";

export function initServiceType() {
  document.getElementById("serviceTypeBackBtn").addEventListener("click", () => {
    show(state.currentCustomer ? "customerProfile" : "home");
  });

  document.getElementById("chooseBrowBtn").addEventListener("click", () => {
    state.serviceType = "สักคิ้ว";
    state.resetVisitDraft();
    state.browStepIndex = 0;
    show("formBrow");
  });

  document.getElementById("chooseTouchupBtn").addEventListener("click", () => {
    state.serviceType = "เติมสี";
    state.resetVisitDraft();
    show("formTouchup");
  });

  onEnter("serviceType", () => {
    // ลูกค้าใหม่ (ยังไม่มี state.currentCustomer) ต้องทำ "สักคิ้ว" (ฟอร์มคอนเซ้าครั้งแรก) เท่านั้น
    // "เติมสี" ใช้ได้เฉพาะลูกค้าเก่าที่มีประวัติอยู่แล้ว
    document.getElementById("chooseTouchupBtn").hidden = !state.currentCustomer;
  });
}
