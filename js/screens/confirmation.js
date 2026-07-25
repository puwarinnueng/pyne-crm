import { show, onEnter } from "../router.js";
import { state } from "../state.js";
import { exportConsentPdf } from "../mockApi.js";

export function initConfirmation() {
  const summaryEl = document.getElementById("confirmSummary");
  const exportBtn = document.getElementById("exportPdfBtn");
  const backHomeBtn = document.getElementById("backHomeBtn");

  exportBtn.addEventListener("click", async () => {
    exportBtn.disabled = true;
    exportBtn.textContent = "กำลังสร้าง PDF...";
    const res = await exportConsentPdf(state.lastSavedServiceId);
    exportBtn.disabled = false;
    exportBtn.textContent = "Export ใบคอนเซ้นต์ (PDF) — mock";
    alert(res.note);
  });

  backHomeBtn.addEventListener("click", () => {
    state.reset();
    show("home");
  });

  onEnter("confirmation", () => {
    const c = state.currentCustomer;
    summaryEl.textContent = `บันทึกประวัติ ${state.serviceType} ของ ${c ? c.name : ""} เรียบร้อยแล้ว (รหัส ${state.lastSavedServiceId})`;
  });
}
