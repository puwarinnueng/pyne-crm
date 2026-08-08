import { searchCustomers, listRecentCustomers, normalizePhone } from "../mockApi.js?v=20260808ae";
import { show, onEnter } from "../router.js?v=20260808ae";
import { state } from "../state.js?v=20260808ae";
import { escapeHtml, formatDateShort, visitStatusLabel, visitStatusBadgeClass, isResumableVisitStatus } from "../utils.js?v=20260808ae";

const ICON_PHONE = `<svg class="cell-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z"/></svg>`;
const ICON_LINE = `<svg class="cell-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z"/></svg>`;
const ICON_CAL = `<svg class="cell-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`;
const ICON_STAR = `<svg class="cell-star" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`;
const ICON_MORE = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>`;
const ICON_VIEW = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z"/><circle cx="12" cy="12" r="3"/></svg>`;
const ICON_SERVICE = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`;

function initials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function statusBadgeHtml(openStatus) {
  if (!openStatus) return "";
  const hint = isResumableVisitStatus(openStatus) ? " · กดเพื่อทำต่อ" : "";
  return `<span class="draft-badge draft-badge--inline ${visitStatusBadgeClass(openStatus)}">${escapeHtml(visitStatusLabel(openStatus))}${hint}</span>`;
}

export function initHome() {
  const tbody = document.getElementById("customersTableBody");
  const tableCard = document.getElementById("customersTableBody").closest(".customers-table-card");
  const table = tableCard.querySelector("table");
  const emptyState = document.getElementById("customersEmptyState");
  const searchInput = document.getElementById("searchInput");
  const tableScroll = tableCard.querySelector(".table-scroll");
  const cardList = document.getElementById("customersCardList");
  const startChoice = document.getElementById("homeStartChoice");
  const searchPanel = document.getElementById("homeSearchPanel");
  const chooseNewCustomerBtn = document.getElementById("chooseNewCustomerBtn");
  const chooseOldCustomerBtn = document.getElementById("chooseOldCustomerBtn");
  const searchBackBtn = document.getElementById("homeSearchBackBtn");
  const summary = document.getElementById("customersSummary");

  let visibleCustomers = [];
  let searchRequestSeq = 0;
  let tablePointer = null;
  let tableDragStarted = false;

  if (tableScroll) {
    tableScroll.addEventListener("pointerdown", (e) => {
      tablePointer = {
        x: e.clientX,
        y: e.clientY,
        scrollLeft: tableScroll.scrollLeft
      };
      tableDragStarted = false;
    }, { passive: true });
    tableScroll.addEventListener("pointermove", (e) => {
      if (!tablePointer) return;
      const dx = Math.abs(e.clientX - tablePointer.x);
      const dy = Math.abs(e.clientY - tablePointer.y);
      if (dx > 8 || dy > 8 || Math.abs(tableScroll.scrollLeft - tablePointer.scrollLeft) > 4) {
        tableDragStarted = true;
      }
    }, { passive: true });
    tableScroll.addEventListener("scroll", () => {
      if (tablePointer) tableDragStarted = true;
    }, { passive: true });
    tableScroll.addEventListener("pointerup", () => {
      window.setTimeout(() => {
        tablePointer = null;
        tableDragStarted = false;
      }, 0);
    }, { passive: true });
    tableScroll.addEventListener("pointercancel", () => {
      tablePointer = null;
      tableDragStarted = false;
    }, { passive: true });
  }

  function renderSummary(mode, count) {
    if (!summary) return;
    if (!count) {
      summary.hidden = true;
      summary.innerHTML = "";
      return;
    }
    summary.hidden = false;
    summary.innerHTML = mode === "recent"
      ? `ลูกค้าล่าสุด <strong>${count}</strong> คน · พิมพ์เบอร์เพื่อค้นหา`
      : `พบ <strong>${count}</strong> คน`;
  }

  function openProfile(customer) {
    searchRequestSeq += 1;
    state.currentCustomer = customer;
    state.customerFlow = "old";
    state.currentCustomerHistory = null;
    show("customerProfile");
  }

  function openService(customer) {
    state.currentCustomer = customer;
    state.customerFlow = "old";
    state.currentCustomerHistory = null;
    state.serviceType = null;
    state.resetVisitDraft();
    show("createVisit");
  }

  function emptyGuideHtml() {
    return `
      <div class="empty-guide">
        <p class="empty-guide-title">พิมพ์เบอร์โทรเพื่อค้นหา</p>
        <p class="empty-guide-sub">อย่างน้อย 3 ตัว เช่น <strong>081</strong> หรือ <strong>089</strong></p>
      </div>`;
  }

  function bindRowMenu(root, getCustomer) {
    function closeAllMenus() {
      root.querySelectorAll(".row-menu").forEach((menu) => {
        menu.classList.remove("is-open");
        const pop = menu.querySelector(".row-menu-popover");
        const trigger = menu.querySelector(".row-menu-trigger");
        if (pop) pop.hidden = true;
        if (trigger) trigger.setAttribute("aria-expanded", "false");
      });
    }

    root.querySelectorAll("[data-id]").forEach((el) => {
      const customer = getCustomer(el.dataset.id);
      const menu = el.querySelector(".row-menu");
      const trigger = el.querySelector(".row-menu-trigger");
      const popover = el.querySelector(".row-menu-popover");

      el.addEventListener("click", (e) => {
        if (e.target.closest(".row-menu")) return;
        if (tableDragStarted) return;
        if (customer) openProfile(customer);
      });
      el.addEventListener("keydown", (e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        if (e.target.closest(".row-menu")) return;
        e.preventDefault();
        if (customer) openProfile(customer);
      });

      if (!menu || !trigger || !popover) return;

      trigger.addEventListener("click", (e) => {
        e.stopPropagation();
        const willOpen = popover.hidden;
        closeAllMenus();
        if (!willOpen) return;
        menu.classList.add("is-open");
        popover.hidden = false;
        trigger.setAttribute("aria-expanded", "true");
        const triggerRect = trigger.getBoundingClientRect();
        const popoverRect = popover.getBoundingClientRect();
        const gap = 6;
        const left = Math.min(
          window.innerWidth - popoverRect.width - 12,
          Math.max(12, triggerRect.right - popoverRect.width)
        );
        const spaceBelow = window.innerHeight - triggerRect.bottom;
        const top = spaceBelow >= popoverRect.height + gap
          ? triggerRect.bottom + gap
          : triggerRect.top - popoverRect.height - gap;
        popover.style.left = `${left}px`;
        popover.style.top = `${Math.max(12, top)}px`;
      });

      popover.querySelectorAll("[data-action]").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          closeAllMenus();
          if (!customer) return;
          if (btn.dataset.action === "view") openProfile(customer);
          else if (btn.dataset.action === "service") openService(customer);
        });
      });
    });
  }

  function actionsMenuHtml() {
    return `
      <div class="row-menu">
        <button type="button" class="row-menu-trigger" aria-haspopup="true" aria-expanded="false" aria-label="เมนู">
          ${ICON_MORE}
        </button>
        <div class="row-menu-popover" role="menu" hidden>
          <button type="button" class="row-menu-item" role="menuitem" data-action="view">
            ${ICON_VIEW}<span>ดูโปรไฟล์</span>
          </button>
          <button type="button" class="row-menu-item" role="menuitem" data-action="service">
            ${ICON_SERVICE}<span>เริ่มบริการ</span>
          </button>
        </div>
      </div>`;
  }

  function render(rows, mode = "search") {
    visibleCustomers = rows || [];
    const qPhone = normalizePhone(searchInput.value);

    if (cardList) {
      cardList.innerHTML = "";
      cardList.hidden = true;
    }

    if (mode === "search" && qPhone.length < 3 && !visibleCustomers.length) {
      table.hidden = true;
      emptyState.hidden = false;
      emptyState.innerHTML = emptyGuideHtml();
      renderSummary(mode, 0);
      return;
    }

    if (mode === "search" && qPhone.length < 3) {
      // recent list while typing < 3
    }

    if (visibleCustomers.length === 0) {
      table.hidden = true;
      emptyState.hidden = false;
      emptyState.innerHTML = mode === "recent"
        ? `<div class="empty-guide"><p class="empty-guide-title">ยังไม่มีลูกค้าล่าสุด</p><p class="empty-guide-sub">พิมพ์เบอร์เพื่อค้นหา หรือเพิ่มลูกค้าใหม่จากหน้าแรก</p></div>`
        : `<div class="empty-guide"><p class="empty-guide-title">ไม่พบลูกค้า</p><p class="empty-guide-sub">ลองเช็คเบอร์อีกครั้ง: “${escapeHtml(searchInput.value.trim())}”</p></div>`;
      renderSummary(mode, 0);
      return;
    }

    table.hidden = false;
    emptyState.hidden = true;
    renderSummary(mode, visibleCustomers.length);

    tbody.innerHTML = visibleCustomers.map((c) => {
      const visitsCount = Number(c.visitsCount || 0);
      const statusBadge = statusBadgeHtml(c.openVisitStatus);
      const sub = visitsCount > 0 && c.lastTechnique && c.lastTechnique !== "-"
        ? `<span class="cust-sub">${escapeHtml(c.lastTechnique)}</span>` : "";
      const lineCell = c.line
        ? `${ICON_LINE}<span>@${escapeHtml(c.line)}</span>`
        : `<span class="cell-empty">—</span>`;
      const lastVisit = visitsCount === 0
        ? `<span class="cell-empty">ลูกค้าใหม่</span>`
        : `${ICON_CAL}<span>${escapeHtml(formatDateShort(c.lastVisitDate))}</span>`;
      return `
      <tr data-id="${c.customerId}" tabindex="0" role="button" aria-label="เปิดโปรไฟล์ลูกค้า">
        <td class="cell-customer">
          <span class="avatar">${escapeHtml(initials(c.nickname || c.fullName))}</span>
          <span class="cust-meta">
            <span class="cust-name">${escapeHtml(c.nickname || c.fullName)}${statusBadge}</span>
            ${sub}
          </span>
        </td>
        <td><span class="cell-ico">${ICON_PHONE}<span>${escapeHtml(c.phoneDisplay)}</span></span></td>
        <td><span class="cell-ico">${lineCell}</span></td>
        <td><span class="cell-ico">${lastVisit}</span></td>
        <td><span class="cell-visits">${ICON_STAR}<span><strong>${visitsCount}</strong> ครั้ง</span></span></td>
        <td class="cell-actions">${actionsMenuHtml()}</td>
      </tr>`;
    }).join("");

    if (cardList) {
      cardList.hidden = false;
      cardList.innerHTML = visibleCustomers.map((c) => {
        const visitsCount = Number(c.visitsCount || 0);
        const statusBadge = statusBadgeHtml(c.openVisitStatus);
        const lastVisit = visitsCount === 0
          ? "ลูกค้าใหม่"
          : formatDateShort(c.lastVisitDate);
        return `
        <article class="cust-card" data-id="${c.customerId}" tabindex="0" role="button" aria-label="เปิดโปรไฟล์ลูกค้า">
          <div class="cust-card-main">
            <span class="avatar">${escapeHtml(initials(c.nickname || c.fullName))}</span>
            <div class="cust-meta">
              <span class="cust-name">${escapeHtml(c.nickname || c.fullName)}${statusBadge}</span>
              <span class="cust-sub">${escapeHtml(c.phoneDisplay)}</span>
              <span class="cust-sub">${escapeHtml(lastVisit)} · ${visitsCount} ครั้ง</span>
            </div>
          </div>
          <div class="cust-card-actions">${actionsMenuHtml()}</div>
        </article>`;
      }).join("");
      bindRowMenu(cardList, (id) => visibleCustomers.find((c) => c.customerId === id));
    }

    bindRowMenu(tbody, (id) => visibleCustomers.find((c) => c.customerId === id));
  }

  function closeAllOpenMenus() {
    document.querySelectorAll(".row-menu.is-open").forEach((menu) => {
      menu.classList.remove("is-open");
      const pop = menu.querySelector(".row-menu-popover");
      const trigger = menu.querySelector(".row-menu-trigger");
      if (pop) pop.hidden = true;
      if (trigger) trigger.setAttribute("aria-expanded", "false");
    });
  }

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".row-menu")) closeAllOpenMenus();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAllOpenMenus();
  });

  async function runPhoneSearch() {
    const qPhone = normalizePhone(searchInput.value);
    const requestId = ++searchRequestSeq;
    if (qPhone.length < 3) {
      loadRecentCustomers(requestId);
      return;
    }
    table.hidden = true;
    if (cardList) cardList.hidden = true;
    emptyState.hidden = false;
    emptyState.textContent = "กำลังค้นหา...";
    try {
      const rows = await searchCustomers(qPhone);
      if (requestId !== searchRequestSeq) return;
      render(rows, "search");
    } catch (e) {
      if (requestId !== searchRequestSeq) return;
      console.warn("searchCustomers failed:", e);
      emptyState.innerHTML = `ค้นหาไม่สำเร็จ — ${escapeHtml((e && e.message) || String(e))}<br><button type="button" class="btn btn-primary mt-12" id="retryLoadCustomersBtn">ลองอีกครั้ง</button>`;
      document.getElementById("retryLoadCustomersBtn")?.addEventListener("click", runPhoneSearch);
    }
  }

  async function loadRecentCustomers(requestId = ++searchRequestSeq) {
    table.hidden = true;
    if (cardList) cardList.hidden = true;
    emptyState.hidden = false;
    emptyState.textContent = "กำลังโหลดลูกค้าล่าสุด...";
    try {
      const rows = await listRecentCustomers(5);
      if (requestId !== searchRequestSeq) return;
      render(rows, "recent");
    } catch (e) {
      if (requestId !== searchRequestSeq) return;
      console.warn("listRecentCustomers failed:", e);
      emptyState.innerHTML = `โหลดไม่สำเร็จ — ${escapeHtml((e && e.message) || String(e))}<br><button type="button" class="btn btn-primary mt-12" id="retryRecentCustomersBtn">ลองอีกครั้ง</button>`;
      document.getElementById("retryRecentCustomersBtn")?.addEventListener("click", () => loadRecentCustomers());
    }
  }

  searchInput.addEventListener("input", () => setTimeout(runPhoneSearch, 0));
  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      runPhoneSearch();
    }
  });

  function showStartChoice() {
    startChoice.hidden = false;
    searchPanel.hidden = true;
    if (searchBackBtn) searchBackBtn.hidden = true;
  }

  function showSearchPanel(options = {}) {
    const shouldLoadRecent = options.loadRecent !== false;
    const shouldPreserveSearch = options.preserveSearch === true;
    startChoice.hidden = true;
    searchPanel.hidden = false;
    if (searchBackBtn) searchBackBtn.hidden = false;
    if (!shouldPreserveSearch) {
      searchInput.value = "";
      visibleCustomers = [];
    }
    requestAnimationFrame(() => searchInput.focus());
    if (shouldLoadRecent) {
      if (shouldPreserveSearch && normalizePhone(searchInput.value).length >= 3) {
        render(visibleCustomers, "search");
      } else if (shouldPreserveSearch && visibleCustomers.length) {
        render(visibleCustomers, "recent");
      } else {
        loadRecentCustomers();
      }
    } else {
      searchRequestSeq += 1;
      render([], "search");
    }
  }

  chooseNewCustomerBtn.addEventListener("click", () => {
    state.currentCustomer = null;
    state.customerFlow = "new";
    state.currentCustomerHistory = null;
    state.serviceType = null;
    state.resetVisitDraft();
    show("newCustomer");
  });

  chooseOldCustomerBtn.addEventListener("click", showSearchPanel);
  searchBackBtn.addEventListener("click", showStartChoice);

  onEnter("home", (data) => {
    if (data?.mode === "oldCustomerSearch") {
      showSearchPanel({ preserveSearch: data.preserveSearch === true });
      return;
    }
    showStartChoice();
    searchInput.value = "";
    visibleCustomers = [];
    renderSummary("search", 0);
  });
}
