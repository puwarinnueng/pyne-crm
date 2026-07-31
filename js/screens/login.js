// login.js — หน้าเข้าสู่ระบบ + modal รีเซ็ตรหัสผ่าน (UI เท่านั้น) วางทับทั้งแอปด้วย z-index สูง
// TODO: เชื่อมระบบ auth จริงเมื่อ backend พร้อม (เพื่อนอีกคนทำ)

const LOGGED_IN_KEY = "pyneCrmLoggedIn";

let screen, form, emailInput, pwInput, errorEl;
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
  if (emailInput) emailInput.value = "";
  if (pwInput) pwInput.value = "";
  if (errorEl) errorEl.hidden = true;
  if (emailInput) emailInput.focus();
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
  emailInput = document.getElementById("loginEmail");
  pwInput = document.getElementById("loginPassword");
  errorEl = document.getElementById("loginError");
  const toggleBtn = document.getElementById("loginTogglePw");
  const forgotBtn = document.getElementById("loginForgot");

  resetOverlay = document.getElementById("resetOverlay");
  resetForm = document.getElementById("resetForm");
  resetPw = document.getElementById("resetPw");
  resetPwConfirm = document.getElementById("resetPwConfirm");
  resetError = document.getElementById("resetError");
  closeReset(); // เริ่มต้นให้ modal ปิดเสมอ กันสถานะค้างจากการโหลดผิดปกติ

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      // ยังไม่มีระบบ auth จริง (รอ backend) — กด Sign In เข้าหน้าหลักได้เลย
      errorEl.hidden = true;
      setLoggedIn(true);
      hideLogin();
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

  resetForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const pw = resetPw.value.trim();
    const confirm = resetPwConfirm.value.trim();
    if (!pw || pw !== confirm) {
      resetError.hidden = false;
      return;
    }
    resetError.hidden = true;
    // TODO: ส่งรหัสใหม่ไป backend จริงเมื่อพร้อม
    closeReset();
    alert("Password updated");
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
