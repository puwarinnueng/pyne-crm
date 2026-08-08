import { show } from "./router.js?v=20260808ae";
import { showLogin, openReset, logoutUser } from "./screens/login.js?v=20260808ae";

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

  // ปุ่มโปรไฟล์ในเมนูมือถือ (Reset password / Log out)
  dropdown.querySelectorAll("[data-account-action]").forEach((item) => {
    item.addEventListener("click", () => {
      const action = item.dataset.accountAction;
      closeDropdown();
      if (action === "reset") {
        openReset();
      } else if (action === "logout") {
        logoutUser().finally(() => {
          show("home");
          showLogin();
        });
      }
    });
  });

  // ลิงก์เมนู (sidebar เดสก์ท็อป + dropdown มือถือ) ที่มี data-nav ให้พาไปหน้านั้นจริง ๆ
  document.querySelectorAll("[data-nav]").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      show(link.dataset.nav);
    });
  });

  initUserMenu();
}

// เมนูผู้ใช้ที่ footer ของ sidebar: Reset password / Log out
function initUserMenu() {
  const menu = document.getElementById("userMenu");
  const trigger = document.getElementById("userMenuTrigger");
  const popover = document.getElementById("userMenuPopover");
  if (!menu || !trigger || !popover) return;

  function closeMenu() {
    menu.classList.remove("is-open");
    popover.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
  }

  function openMenu() {
    menu.classList.add("is-open");
    popover.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
  }

  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    if (popover.hidden) openMenu();
    else closeMenu();
  });

  document.addEventListener("click", (e) => {
    if (!popover.hidden && !menu.contains(e.target)) closeMenu();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });

  popover.querySelectorAll(".user-menu-item").forEach((item) => {
    item.addEventListener("click", () => {
      const action = item.dataset.action;
      closeMenu();
      if (action === "reset") {
        openReset();
      } else if (action === "logout") {
        logoutUser().finally(() => {
          show("home");
          showLogin();
        });
      }
    });
  });
}
