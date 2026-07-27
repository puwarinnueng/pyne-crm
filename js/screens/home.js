import { searchCustomers, listRecentCustomers } from "../mockApi.js";
import { show, onEnter } from "../router.js";
import { state } from "../state.js";
import { escapeHtml } from "../utils.js";

export function initHome() {
  const input = document.getElementById("searchInput");
  const btn = document.getElementById("searchBtn");
  const resultsTitleEl = document.getElementById("searchResultsTitle");
  const resultsEl = document.getElementById("searchResults");
  const newCustomerBtn = document.getElementById("newCustomerBtn");

  function renderList(results) {
    if (results.length === 0) {
      resultsEl.innerHTML = `<div class="empty-hint">ยังไม่มีลูกค้าในระบบ<br>กด "+ ลูกค้าใหม่" เพื่อเพิ่มได้เลย</div>`;
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

  async function showRecent() {
    resultsTitleEl.textContent = "ลูกค้าล่าสุด";
    resultsEl.innerHTML = `<div class="empty-hint">กำลังโหลด...</div>`;
    const results = await listRecentCustomers(10);
    renderList(results);
  }

  async function runSearch() {
    const q = input.value.trim();
    if (!q) {
      await showRecent();
      return;
    }
    resultsTitleEl.textContent = `ผลการค้นหา "${q}"`;
    resultsEl.innerHTML = `<div class="empty-hint">กำลังค้นหา...</div>`;
    const results = await searchCustomers(q);
    if (results.length === 0) {
      resultsEl.innerHTML = `<div class="empty-hint">ไม่พบลูกค้าที่ตรงกับ "${escapeHtml(q)}"<br>กด "+ ลูกค้าใหม่" เพื่อเพิ่มได้เลย</div>`;
      return;
    }
    renderList(results);
  }

  btn.addEventListener("click", runSearch);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") runSearch(); });
  input.addEventListener("input", () => { if (!input.value.trim()) showRecent(); });
  newCustomerBtn.addEventListener("click", () => {
    // ลูกค้าใหม่: เลือกประเภทบริการก่อน แล้วค่อยกรอกชื่อ/เบอร์โทร/LINE ในฟอร์มหน้า 1 เลย (ตาม Jotform จริง)
    state.currentCustomer = null;
    state.serviceType = null;
    state.resetVisitDraft();
    show("serviceType");
  });

  onEnter("home", () => {
    input.value = "";
    showRecent();
  });
}
