import { show, onEnter } from "../router.js?v=20260808ag";
import { state } from "../state.js?v=20260808ag";
import { exportConsentPdf } from "../mockApi.js?v=20260808ao";
import { openExportFile } from "../utils.js?v=20260808ao";
import { appAlert } from "../dialogs.js?v=20260808ag";

export function initConfirmation() {
  const summaryEl = document.getElementById("confirmSummary");
  const exportBtn = document.getElementById("exportPdfBtn");
  const backHomeBtn = document.getElementById("backHomeBtn");

  exportBtn.addEventListener("click", async () => {
    exportBtn.disabled = true;
    exportBtn.textContent = "กำลังสร้าง PDF...";
    try {
      const res = await exportConsentPdf(state.lastSavedServiceId);
      if (res && res.success && (res.downloadUrl || res.url)) {
        openExportFile(res.downloadUrl || res.url, res.filename || "consent.pdf", { preview: Boolean(res.preview) });
        await appAlert(res.note || "เปิดหน้าต่างพิมพ์แล้ว — เลือก Save as PDF", {
          title: "ส่งออก PDF",
          okText: "ตกลง"
        });
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
