import { show, onEnter } from "../router.js?v=20260808ae";
import { state } from "../state.js?v=20260808ae";
import { exportConsentPdf } from "../mockApi.js?v=20260808ae";
import { appAlert } from "../dialogs.js?v=20260808ae";

export function initConfirmation() {
  const summaryEl = document.getElementById("confirmSummary");
  const exportBtn = document.getElementById("exportPdfBtn");
  const backHomeBtn = document.getElementById("backHomeBtn");

  exportBtn.addEventListener("click", async () => {
    exportBtn.disabled = true;
    exportBtn.textContent = "กำลังสร้าง PDF...";
    try {
      const res = await exportConsentPdf(state.lastSavedServiceId);
      if (res && res.success && res.url) {
        await appAlert(`สร้าง PDF เรียบร้อยแล้ว\n${res.filename || ""}`, {
          title: "ส่งออก PDF",
          okText: "เปิด PDF"
        });
        window.open(res.url, "_blank", "noopener");
        return;
      }
      await appAlert((res && (res.note || res.error)) || "สร้าง PDF ไม่สำเร็จ", { title: "ส่งออก PDF" });
    } catch (err) {
      await appAlert(`สร้าง PDF ไม่สำเร็จ — ${err.message || err}`, { title: "ส่งออก PDF" });
    } finally {
      exportBtn.disabled = false;
      exportBtn.textContent = "ส่งออกใบยินยอม (PDF)";
    }
  });

  backHomeBtn.addEventListener("click", () => {
    state.reset();
    show("home");
  });

  onEnter("confirmation", () => {
    const c = state.currentCustomer;
    const name = c ? (c.nickname || c.fullName) : "";
    summaryEl.textContent = `บันทึกคิว ${state.serviceType || ""} ของ ${name} แล้ว (รหัส ${state.lastSavedServiceId})`;
  });
}
