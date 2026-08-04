import { show } from "./router.js";
import { state } from "./state.js";
import { getCustomer, checkSession } from "./mockApi.js";
import { getToken } from "./session.js";
import { initShell } from "./shell.js";
import { initLogin, showLogin, hideLogin } from "./screens/login.js";
import { initHome } from "./screens/home.js";
import { initNewCustomer } from "./screens/newCustomer.js";
import { initCustomerProfile } from "./screens/customerProfile.js";
import { initVisitDetail } from "./screens/visitDetail.js";
import { initCreateVisit } from "./screens/createVisit.js";
import { initServiceType } from "./screens/serviceType.js";
import { initFormOne } from "./screens/formOne.js";
import { initFormTwo } from "./screens/formTwo.js";
import { initFormTouchup } from "./screens/formTouchup.js";
import { initTechFields } from "./screens/techFields.js";
import { initConfirmation } from "./screens/confirmation.js";

initShell();
initLogin();
initHome();
initNewCustomer();
initCustomerProfile();
initVisitDetail();
initCreateVisit();
initServiceType();
initFormOne();
initFormTwo();
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

  // เช็ค session token (คุกกี้) กับเซิร์ฟเวอร์ทุกครั้งที่โหลดหน้า/refresh ใหม่ — ไม่เชื่อ flag ฝั่ง client เฉยๆ
  const token = getToken();
  const session = token ? await checkSession(token) : { valid: false };

  // debug เจาะจงหน้า / หรือ session ยัง valid อยู่จริง → ข้าม login; ไม่เช่นนั้นโชว์ login
  if (debugScreen || session.valid) {
    hideLogin();
  } else {
    showLogin();
  }

  if (debugCustomerId) {
    try {
      state.currentCustomer = await getCustomer(debugCustomerId);
    } catch (e) {
      console.warn("debugCustomer: ต้อง login ก่อนถึงจะดึงข้อมูลลูกค้าได้", e);
    }
  }
  if (debugServiceType) {
    state.serviceType = debugServiceType;
  }
  show(debugScreen || "home", { pushHistory: false });
})();
