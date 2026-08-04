// login.js — หน้าเข้าสู่ระบบ + modal รีเซ็ตรหัสผ่าน วางทับทั้งแอปด้วย z-index สูง
// ตรวจ username/password จริง: local (mock) เทียบกับ js/data/authConfig.js,
// production (gas/) เทียบกับแท็บ Config ของ Sheet ผ่าน checkLogin()/changePassword() — ดู gas/Code.gs

import { checkLogin, changePassword } from "../mockApi.js";

const LOGGED_IN_KEY = "pyneCrmLoggedIn";

let screen, form, userInput, pwInput, errorEl, submitBtn;
let resetOverlay, resetForm, resetPw, resetPwConfirm, resetError;

export function isLoggedIn() {
  return localStorage.getItem(LOGGED_IN_KEY) === "1";
}

export function setLoggedIn(value) {
  if (value) localStorage.setItem(LOGGED_IN_KEY, "1");
  else localStorage.removeItem(LOGGED_IN_KEY);
}

export function showLogin() {
  if (!screen) return;
  closeReset(); // กันไม่ให้ modal reset ค้างทับหน้า login
  screen.hidden = false;
  if (userInput) userInput.value = "";
  if (pwInput) pwInput.value = "";
  if (errorEl) errorEl.hidden = true;
  if (userInput) userInput.focus();
}

export function hideLogin() {
  if (screen) screen.hidden = true;
}

export function openReset() {
  if (!resetOverlay) return;
  resetPw.value = "";
  resetPwConfirm.value = "";
  resetError.hidden = true;
  resetOverlay.hidden = false;
  resetPw.focus();
}

export function closeReset() {
  if (resetOverlay) resetOverlay.hidden = true;
}

export function initLogin() {
  screen = document.getElementById("loginScreen");
  form = document.getElementById("loginForm");
  userInput = document.getElementById("loginUsername");
  pwInput = document.getElementById("loginPassword");
  errorEl = document.getElementById("loginError");
  submitBtn = form ? form.querySelector(".login-submit") : null;
  const toggleBtn = document.getElementById("loginTogglePw");
  const forgotBtn = document.getElementById("loginForgot");

  resetOverlay = document.getElementById("resetOverlay");
  resetForm = document.getElementById("resetForm");
  resetPw = document.getElementById("resetPw");
  resetPwConfirm = document.getElementById("resetPwConfirm");
  resetError = document.getElementById("resetError");
  closeReset(); // เริ่มต้นให้ modal ปิดเสมอ กันสถานะค้างจากการโหลดผิดปกติ

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const username = userInput.value.trim();
      const password = pwInput.value;
      if (!username || !password) {
        errorEl.textContent = "Please enter your username and password.";
        errorEl.hidden = false;
        return;
      }
      errorEl.hidden = true;
      if (submitBtn) submitBtn.disabled = true;
      const res = await checkLogin(username, password);
      if (submitBtn) submitBtn.disabled = false;
      if (res.success) {
        setLoggedIn(true);
        hideLogin();
      } else {
        errorEl.textContent = "Invalid username or password.";
        errorEl.hidden = false;
      }
    });

    toggleBtn.addEventListener("click", () => {
      const show = pwInput.type === "password";
      pwInput.type = show ? "text" : "password";
      toggleBtn.setAttribute("aria-label", show ? "Hide password" : "Show password");
    });

    forgotBtn.addEventListener("click", openReset);
  }

  initResetModal();
}

function initResetModal() {
  if (!resetOverlay || !resetForm) return;
  const closeBtn = document.getElementById("resetClose");
  const backBtn = document.getElementById("resetBack");
  const resetSubmitBtn = resetForm.querySelector(".login-submit");

  resetForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const pw = resetPw.value.trim();
    const confirm = resetPwConfirm.value.trim();
    if (!pw || pw !== confirm) {
      resetError.textContent = "Passwords do not match.";
      resetError.hidden = false;
      return;
    }
    resetError.hidden = true;
    if (resetSubmitBtn) resetSubmitBtn.disabled = true;
    const res = await changePassword(pw);
    if (resetSubmitBtn) resetSubmitBtn.disabled = false;
    if (res.success) {
      closeReset();
      alert("Password updated");
    } else {
      resetError.textContent = "Could not update password. Please try again.";
      resetError.hidden = false;
    }
  });

  // ปุ่มลูกตาโชว์/ซ่อนรหัสของทั้งสองช่อง
  resetForm.querySelectorAll("[data-reset-toggle]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const field = document.getElementById(btn.dataset.resetToggle);
      const show = field.type === "password";
      field.type = show ? "text" : "password";
      btn.setAttribute("aria-label", show ? "Hide password" : "Show password");
    });
  });

  closeBtn.addEventListener("click", closeReset);
  backBtn.addEventListener("click", closeReset);
  resetOverlay.addEventListener("click", (e) => {
    if (e.target === resetOverlay) closeReset();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !resetOverlay.hidden) closeReset();
  });
}
