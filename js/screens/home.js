import { listCustomersWithStats, normalizePhone } from "../mockApi.js";
import { show, onEnter } from "../router.js";
import { state } from "../state.js";
import { escapeHtml, formatDateShort } from "../utils.js";

export function initHome() {
  const tbody = document.getElementById("customersTableBody");
  const tableCard = document.getElementById("customersTableBody").closest(".customers-table-card");
  const table = tableCard.querySelector("table");
  const emptyState = document.getElementById("customersEmptyState");
  const searchInput = document.getElementById("searchInput");
  const newCustomerBtn = document.getElementById("newCustomerBtn");

  let allCustomers = [];

  function render() {
    const q = searchInput.value.trim().toLowerCase();
    const qPhone = normalizePhone(searchInput.value);

    let rows = allCustomers;
    if (q) {
      rows = rows.filter((c) => {
        const nameHit = c.name.toLowerCase().includes(q);
        const lineHit = (c.line || "").toLowerCase().includes(q);
        const phoneHit = qPhone.length >= 3 && c.phoneNormalized.includes(qPhone);
        return nameHit || lineHit || phoneHit;
      });
    }

    if (rows.length === 0) {
      table.hidden = true;
      emptyState.hidden = false;
      emptyState.innerHTML = allCustomers.length === 0
        ? `No customers yet — click "+ New Customer" to add one.`
        : `No customers match "${escapeHtml(searchInput.value.trim())}".`;
      return;
    }
    table.hidden = false;
    emptyState.hidden = true;

    tbody.innerHTML = rows.map((c) => `
      <tr data-id="${c.customerId}">
        <td class="cell-name">${escapeHtml(c.name)}</td>
        <td>${escapeHtml(c.phoneDisplay)}</td>
        <td>${c.visitsCount}</td>
        <td>${c.visitsCount === 0 ? "New customer" : formatDateShort(c.lastVisitDate)}</td>
        <td>${escapeHtml(c.lastTechnique)}</td>
        <td class="cell-actions"><button class="btn-link-view" type="button">View Profile</button></td>
      </tr>
    `).join("");

    tbody.querySelectorAll("tr").forEach((tr) => {
      tr.addEventListener("click", () => {
        const customer = rows.find((c) => c.customerId === tr.dataset.id);
        state.currentCustomer = customer;
        show("customerProfile");
      });
    });
  }

  async function loadCustomers() {
    table.hidden = true;
    emptyState.hidden = false;
    emptyState.textContent = "Loading...";
    allCustomers = await listCustomersWithStats();
    render();
  }

  searchInput.addEventListener("input", render);

  newCustomerBtn.addEventListener("click", () => {
    // ลูกค้าใหม่: เลือกประเภทบริการก่อน แล้วค่อยกรอกชื่อ/เบอร์โทร/LINE ในฟอร์มหน้า 1 เลย (ตาม Jotform จริง)
    state.currentCustomer = null;
    state.serviceType = null;
    state.resetVisitDraft();
    show("serviceType");
  });

  onEnter("home", () => {
    searchInput.value = "";
    loadCustomers();
  });
}
