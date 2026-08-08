import { show } from "./router.js?v=20260808ag";
import { state } from "./state.js?v=20260808ag";
import { getCustomer, checkSession } from "./mockApi.js?v=20260808ag";
import { getToken } from "./session.js?v=20260808ag";
import { initDialogs } from "./dialogs.js?v=20260808ag";
import { initShell } from "./shell.js?v=20260808ag";
import { initHistorySheet } from "./formWizard.js?v=20260808ag";
import { initLogin, showLogin, hideLogin } from "./screens/login.js?v=20260808ag";
import { initHome } from "./screens/home.js?v=20260808ag";
import { initNewCustomer } from "./screens/newCustomer.js?v=20260808ag";
import { initCustomerProfile } from "./screens/customerProfile.js?v=20260808ag";
import { initVisitDetail } from "./screens/visitDetail.js?v=20260808ao";
import { initCreateVisit } from "./screens/createVisit.js?v=20260808ag";
import { initServiceType } from "./screens/serviceType.js?v=20260808ag";
import { initFormOne } from "./screens/formOne.js?v=20260808ag";
import { initFormTwo } from "./screens/formTwo.js?v=20260808ag";
import { initFormTouchup } from "./screens/formTouchup.js?v=20260808ag";
import { initTechFields } from "./screens/techFields.js?v=20260808ag";
import { initConfirmation } from "./screens/confirmation.js?v=20260808ao";

function safeInit(name, fn) {
  try {
    fn();
  } catch (e) {
    console.error(`[pyne] ${name} failed:`, e);
  }
}

// โชว์ฟอร์ม login ก่อน inits อื่น — กันค้างที่ splash โลโก้ถ้ามี init พัง
initDialogs();
safeInit("initLogin", initLogin);

safeInit("initShell", initShell);
safeInit("initHistorySheet", initHistorySheet);
safeInit("initHome", initHome);
safeInit("initNewCustomer", initNewCustomer);
safeInit("initCustomerProfile", initCustomerProfile);
safeInit("initVisitDetail", initVisitDetail);
safeInit("initCreateVisit", initCreateVisit);
safeInit("initServiceType", initServiceType);
safeInit("initFormOne", initFormOne);
safeInit("initFormTwo", initFormTwo);
safeInit("initFormTouchup", initFormTouchup);
safeInit("initTechFields", initTechFields);
safeInit("initConfirmation", initConfirmation);

// เปิดหน้าใดหน้าหนึ่งตรง ๆ ได้ระหว่าง dev/testing เช่น
// index.html?debugScreen=customerProfile&debugCustomer=C0001&debugServiceType=สักคิ้ว
(async () => {
  try {
    const params = new URLSearchParams(location.search);
    const debugScreen = params.get("debugScreen");
    const debugCustomerId = params.get("debugCustomer");
    const debugServiceType = params.get("debugServiceType");

    const token = getToken();
    const session = token ? await checkSession(token) : { valid: false };

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
  } catch (e) {
    console.error("[pyne] boot failed:", e);
    showLogin();
  }
})();
