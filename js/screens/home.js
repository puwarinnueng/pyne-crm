import { listCustomersWithStats, normalizePhone } from "../mockApi.js";
import { show, onEnter } from "../router.js";
import { state } from "../state.js";
import { escapeHtml, formatDateShort } from "../utils.js";

const ICON_PHONE = `<svg class="cell-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z"/></svg>`;
const ICON_LINE = `<svg class="cell-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z"/></svg>`;
const ICON_CAL = `<svg class="cell-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`;
const ICON_STAR = `<svg class="cell-star" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`;

function initials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function tagFor(c) {
  if (c.visitsCount <= 1) return { key: "new", label: "New" };
  return { key: "regular", label: "Regular" };
}

function isThisMonth(ts) {
  if (!ts) return false;
  const d = new Date(ts);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

export function initHome() {
  const tbody = document.getElementById("customersTableBody");
  const tableCard = document.getElementById("customersTableBody").closest(".customers-table-card");
  const table = tableCard.querySelector("table");
  const emptyState = document.getElementById("customersEmptyState");
  const searchInput = document.getElementById("searchInput");
  const newCustomerBtn = document.getElementById("newCustomerBtn");
  const summary = document.getElementById("customersSummary");

  let allCustomers = [];

  function renderSummary() {
    const total = allCustomers.length;
    const newThisMonth = allCustomers.filter((c) => isThisMonth(c.createdAt)).length;
    summary.innerHTML =
      `<strong>${total}</strong> customer${total === 1 ? "" : "s"}` +
      `<span class="dot">·</span><strong>${newThisMonth}</strong> New this month`;
  }

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

    tbody.innerHTML = rows.map((c) => {
      const tag = tagFor(c);
      const sub = c.visitsCount > 0 && c.lastTechnique && c.lastTechnique !== "-"
        ? `<span class="cust-sub">${escapeHtml(c.lastTechnique)}</span>` : "";
      const lineCell = c.line
        ? `${ICON_LINE}<span>@${escapeHtml(c.line)}</span>`
        : `<span class="cell-empty">—</span>`;
      const lastVisit = c.visitsCount === 0
        ? `<span class="cell-empty">New customer</span>`
        : `${ICON_CAL}<span>${escapeHtml(formatDateShort(c.lastVisitDate))}</span>`;
      return `
      <tr data-id="${c.customerId}">
        <td class="cell-customer">
          <span class="avatar">${escapeHtml(initials(c.name))}</span>
          <span class="cust-meta">
            <span class="cust-name">${escapeHtml(c.name)}</span>
            ${sub}
          </span>
        </td>
        <td><span class="cell-ico">${ICON_PHONE}<span>${escapeHtml(c.phoneDisplay)}</span></span></td>
        <td><span class="cell-ico">${lineCell}</span></td>
        <td><span class="cell-ico">${lastVisit}</span></td>
        <td><span class="cell-visits">${ICON_STAR}<span><strong>${c.visitsCount}</strong> visit${c.visitsCount === 1 ? "" : "s"}</span></span></td>
        <td><span class="tag tag-${tag.key}">${tag.label}</span></td>
      </tr>`;
    }).join("");

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
    renderSummary();
    render();
  }

  searchInput.addEventListener("input", render);

  newCustomerBtn.addEventListener("click", () => {
    // ลูกค้าใหม่: สร้างลูกค้าเข้าฐานข้อมูลก่อน แล้วจึงเลือกบริการ (แยกตัวตนออกจากฟอร์มคอนเซ้นต์)
    state.currentCustomer = null;
    state.serviceType = null;
    state.resetVisitDraft();
    show("newCustomer");
  });

  onEnter("home", () => {
    searchInput.value = "";
    loadCustomers();
  });
}
