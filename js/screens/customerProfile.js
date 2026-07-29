import { getHistoryByCustomer } from "../mockApi.js";
import { show, onEnter } from "../router.js";
import { state } from "../state.js";
import { formatDate, escapeHtml } from "../utils.js";
import { openServiceTypeModal } from "./serviceType.js";

export function initCustomerProfile() {
  const profileCard = document.getElementById("profileCard");
  const historyList = document.getElementById("historyList");
  const addVisitBtn = document.getElementById("addVisitBtn");

  addVisitBtn.addEventListener("click", () => {
    state.resetVisitDraft();
    state.serviceType = null;
    openServiceTypeModal();
  });

  onEnter("customerProfile", async () => {
    const c = state.currentCustomer;
    if (!c) { show("home"); return; }

    profileCard.innerHTML = `
      <div class="pname">${escapeHtml(c.name)}</div>
      <div class="pmeta">📞 ${escapeHtml(c.phoneDisplay)}${c.line ? " &nbsp;·&nbsp; LINE: " + escapeHtml(c.line) : ""}</div>
    `;

    historyList.innerHTML = `<div class="empty-hint">กำลังโหลดประวัติ...</div>`;
    const history = await getHistoryByCustomer(c.customerId);

    if (history.length === 0) {
      historyList.innerHTML = `<div class="empty-hint">ยังไม่มีประวัติการเข้ารับบริการ</div>`;
      return;
    }

    historyList.innerHTML = history.map((v) => `
      <div class="history-item" data-id="${v.serviceId}">
        <span class="hdate">${formatDate(v.visitDate)}</span>
        <span class="htype ${v.serviceType === "เติมสี" ? "touchup" : ""}">${escapeHtml(v.serviceType)}</span>
        <div class="hdetail">
          เทคนิค: ${escapeHtml(v.technique || "-")} · สี: ${escapeHtml(v.colorUsed || "-")}<br>
          ความเข้ม: ${escapeHtml(v.intensity || "-")}
          ${v.note ? `<br>หมายเหตุ: ${escapeHtml(v.note)}` : ""}
        </div>
      </div>
    `).join("");

    historyList.querySelectorAll(".history-item").forEach((el) => {
      el.addEventListener("click", () => {
        const visit = history.find((h) => h.serviceId === el.dataset.id);
        show("visitDetail", { data: visit });
      });
    });
  });
}
