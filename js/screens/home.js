import { searchCustomers } from "../mockApi.js";
import { show, onEnter } from "../router.js";
import { state } from "../state.js";
import { escapeHtml } from "../utils.js";

export function initHome() {
  const input = document.getElementById("searchInput");
  const btn = document.getElementById("searchBtn");
  const resultsEl = document.getElementById("searchResults");
  const newCustomerBtn = document.getElementById("newCustomerBtn");
  const logoutBtn = document.getElementById("homeLogoutBtn");

  async function runSearch() {
    const q = input.value.trim();
    if (!q) {
      resultsEl.innerHTML = `<div class="empty-hint">พิมพ์ชื่อ เบอร์โทร หรือชื่อ LINE เพื่อค้นหา</div>`;
      return;
    }
    resultsEl.innerHTML = `<div class="empty-hint">กำลังค้นหา...</div>`;
    const results = await searchCustomers(q);
    if (results.length === 0) {
      resultsEl.innerHTML = `<div class="empty-hint">ไม่พบลูกค้าที่ตรงกับ "${escapeHtml(q)}"<br>กด "+ ลูกค้าใหม่" เพื่อเพิ่มได้เลย</div>`;
      return;
    }
    resultsEl.innerHTML = results.map((c) => `
      <div class="result-item" data-id="${c.customerId}">
        <div>
          <div class="result-name">${escapeHtml(c.name)}</div>
          <div class="result-meta">${escapeHtml(c.phoneDisplay)}${c.line ? " · LINE: " + escapeHtml(c.line) : ""}</div>
        </div>
        <div>›</div>
      </div>
    `).join("");

    resultsEl.querySelectorAll(".result-item").forEach((el) => {
      el.addEventListener("click", () => {
        const customer = results.find((c) => c.customerId === el.dataset.id);
        state.currentCustomer = customer;
        show("customerProfile");
      });
    });
  }

  btn.addEventListener("click", runSearch);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") runSearch(); });
  newCustomerBtn.addEventListener("click", () => show("newCustomer"));
  logoutBtn.addEventListener("click", () => show("gate"));

  onEnter("home", () => {
    input.value = "";
    resultsEl.innerHTML = `<div class="empty-hint">พิมพ์ชื่อ เบอร์โทร หรือชื่อ LINE เพื่อค้นหา</div>`;
    input.focus();
  });
}
