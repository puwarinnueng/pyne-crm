import { show, onEnter } from "../router.js";
import { state } from "../state.js";
import { exportConsentPdf } from "../mockApi.js";
import { appAlert } from "../dialogs.js";

export function initConfirmation() {
  const summaryEl = document.getElementById("confirmSummary");
  const exportBtn = document.getElementById("exportPdfBtn");
  const backHomeBtn = document.getElementById("backHomeBtn");

  exportBtn.addEventListener("click", async () => {
    exportBtn.disabled = true;
    exportBtn.textContent = "Generating PDF...";
    try {
      const res = await exportConsentPdf(state.lastSavedServiceId);
      if (res && res.success && res.url) {
        await appAlert(`สร้าง PDF เรียบร้อยแล้ว\n${res.filename || ""}`, {
          title: "Export PDF",
          okText: "เปิด PDF"
        });
        window.open(res.url, "_blank", "noopener");
        return;
      }
      await appAlert((res && (res.note || res.error)) || "สร้าง PDF ไม่สำเร็จ", { title: "Export PDF" });
    } catch (err) {
      await appAlert(`สร้าง PDF ไม่สำเร็จ — ${err.message || err}`, { title: "Export PDF" });
    } finally {
      exportBtn.disabled = false;
      exportBtn.textContent = "Export Consent Form (PDF)";
    }
  });

  backHomeBtn.addEventListener("click", () => {
    state.reset();
    show("home");
  });

  onEnter("confirmation", () => {
    const c = state.currentCustomer;
    summaryEl.textContent = `Saved ${state.serviceType} visit for ${c ? (c.nickname || c.fullName) : ""} (ID ${state.lastSavedServiceId})`;
  });
}
