import { show } from "./router.js";

export function initShell() {
  const hamburgerBtn = document.getElementById("hamburgerBtn");
  const dropdown = document.getElementById("mobileDropdown");

  function closeDropdown() {
    dropdown.hidden = true;
    hamburgerBtn.setAttribute("aria-expanded", "false");
  }

  hamburgerBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const willOpen = dropdown.hidden;
    dropdown.hidden = !willOpen;
    hamburgerBtn.setAttribute("aria-expanded", String(willOpen));
  });

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
