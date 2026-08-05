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
    const res = await exportConsentPdf(state.lastSavedServiceId);
    exportBtn.disabled = false;
    exportBtn.textContent = "Export Consent Form (PDF) — mock";
    await appAlert(res.note, { title: "Export PDF" });
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
