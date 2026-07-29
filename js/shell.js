import { show } from "./router.js";

export function initShell() {
  const hamburgerBtn = document.getElementById("hamburgerBtn");
  const dropdown = document.getElementById("mobileDropdown");
  const overlay = document.getElementById("mobileMenuOverlay");
  const closeBtn = document.getElementById("mobileMenuClose");
  let closeTimer;

  function closeDropdown() {
    dropdown.classList.remove("is-open");
    overlay.classList.remove("is-visible");
    hamburgerBtn.setAttribute("aria-expanded", "false");
    clearTimeout(closeTimer);
    closeTimer = window.setTimeout(() => {
      dropdown.hidden = true;
      overlay.hidden = true;
    }, 220);
  }

  function openDropdown() {
    clearTimeout(closeTimer);
    dropdown.hidden = false;
    overlay.hidden = false;
    requestAnimationFrame(() => {
      dropdown.classList.add("is-open");
      overlay.classList.add("is-visible");
    });
    hamburgerBtn.setAttribute("aria-expanded", "true");
  }

  hamburgerBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (dropdown.hidden) openDropdown();
    else closeDropdown();
  });

  closeBtn.addEventListener("click", closeDropdown);
  overlay.addEventListener("click", closeDropdown);

  document.addEventListener("click", (e) => {
    if (!dropdown.hidden && !dropdown.contains(e.target) && e.target !== hamburgerBtn) {
      closeDropdown();
    }
  });

  dropdown.querySelectorAll(".mobile-dropdown-item").forEach((item) => {
    item.addEventListener("click", closeDropdown);
  });

  // ลิงก์เมนู (sidebar เดสก์ท็อป + dropdown มือถือ) ที่มี data-nav ให้พาไปหน้านั้นจริง ๆ
  document.querySelectorAll("[data-nav]").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      show(link.dataset.nav);
    });
  });
}
