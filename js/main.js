import { show } from "./router.js";
import { state } from "./state.js";
import { getCustomer } from "./mockApi.js";
import { initShell } from "./shell.js";
// import { initGate } from "./screens/gate.js"; // ปิดใช้งานหน้าถามรหัสผ่านไว้ก่อน เผื่อเปิดใช้ในอนาคต
import { initHome } from "./screens/home.js";
import { initNewCustomer } from "./screens/newCustomer.js";
import { initCustomerProfile } from "./screens/customerProfile.js";
import { initVisitDetail } from "./screens/visitDetail.js";
import { initServiceType } from "./screens/serviceType.js";
import { initFormBrow } from "./screens/formBrow.js";
import { initFormTouchup } from "./screens/formTouchup.js";
import { initTechFields } from "./screens/techFields.js";
import { initConfirmation } from "./screens/confirmation.js";

initShell();
// initGate();
initHome();
initNewCustomer();
initCustomerProfile();
initVisitDetail();
initServiceType();
initFormBrow();
initFormTouchup();
initTechFields();
initConfirmation();

// เปิดหน้าใดหน้าหนึ่งตรง ๆ ได้ระหว่าง dev/testing เช่น
// index.html?debugScreen=customerProfile&debugCustomer=C0001&debugServiceType=สักคิ้ว
// ห่อด้วย async IIFE แทน top-level await เพราะไฟล์นี้จะถูกรวมเป็น <script> ธรรมดา
// (ไม่ใช่ type=module) ตอนแปลงเป็น Apps Script — top-level await ใช้ไม่ได้ในสคริปต์ปกติ
(async () => {
  const params = new URLSearchParams(location.search);
  const debugScreen = params.get("debugScreen");
  const debugCustomerId = params.get("debugCustomer");
  const debugServiceType = params.get("debugServiceType");

  if (debugCustomerId) {
    state.currentCustomer = await getCustomer(debugCustomerId);
  }
  if (debugServiceType) {
    state.serviceType = debugServiceType;
  }
  show(debugScreen || "home", { pushHistory: false });
})();
