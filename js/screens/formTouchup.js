// formTouchup.js — ร่างเบื้องต้น (DRAFT) รอฟิลด์ฉบับสมบูรณ์จากร้าน ดู implementation-plan-phase1.md

import { show, onEnter } from "../router.js";
import { state } from "../state.js";
import { getHistoryByCustomer } from "../mockApi.js";
import { formatDate, escapeHtml } from "../utils.js";
import { openServiceTypeModal } from "./serviceType.js";

export function initFormTouchup() {
  const prevBox = document.getElementById("touchupPrevVisit");
  const adjustEl = document.getElementById("tuAdjust");
  const intensityEl = document.getElementById("tuIntensity");
  const priceEl = document.getElementById("tuPrice");
  const nextBtn = document.getElementById("tuNextBtn");
  const backBtn = document.getElementById("touchupBackBtn");

  backBtn.addEventListener("click", () => {
    show(state.currentCustomer ? "customerProfile" : "home");
    openServiceTypeModal();
  });

  nextBtn.addEventListener("click", () => {
    state.visitDraft.adjustFromLast = adjustEl.value.trim();
    state.visitDraft.intensity = intensityEl.value;
    state.visitDraft.touchupPrice = priceEl.value;
    show("techFields");
  });

  onEnter("formTouchup", async () => {
    adjustEl.value = "";
    priceEl.value = "";
    const c = state.currentCustomer;
    if (!c) { show("home"); return; }
    prevBox.textContent = "กำลังโหลดประวัติล่าสุด...";
    const history = await getHistoryByCustomer(c.customerId);
    if (history.length === 0) {
      prevBox.innerHTML = `<b>ไม่มีประวัติเก่า</b> — ลูกค้าคนนี้ยังไม่เคยมีประวัติในระบบ`;
      return;
    }
    const last = history[0];
    prevBox.innerHTML = `
      <b>ครั้งล่าสุด:</b> ${formatDate(last.visitDate)} (${escapeHtml(last.serviceType)})<br>
      เทคนิค: ${escapeHtml(last.technique || "-")} · สี: ${escapeHtml(last.colorUsed || "-")}<br>
      ความเข้ม: ${escapeHtml(last.intensity || "-")}
      ${last.note ? `<br>หมายเหตุ: ${escapeHtml(last.note)}` : ""}
    `;
  });
}
