// login.js — หน้าเข้าสู่ระบบ + modal รีเซ็ตรหัสผ่าน วางทับทั้งแอปด้วย z-index สูง
// ตรวจ username/password จริง: local (mock) เทียบกับ js/data/authConfig.js,
// production (gas/) เทียบกับแท็บ Config ของ Sheet ผ่าน login()/changePassword() — ดู gas/Code.gs
// สถานะ login จริงคือ session token ที่เซิร์ฟเวอร์ออกให้ (ดู js/session.js) ไม่ใช่ flag ฝั่ง client เฉยๆ

import { login, logout, changePassword } from "../mockApi.js";
import { getToken, setToken, clearToken } from "../session.js";
import { show } from "../router.js";

let screen, form, userInput, pwInput, errorEl, submitBtn;
let resetOverlay, resetForm, resetOldPw, resetPw, resetPwConfirm, resetError;

export function showLogin() {
  if (!screen) return;
  closeReset(); // กันไม่ให้ modal reset ค้างทับหน้า login
  screen.hidden = false;
  // ฟอร์มซ่อนไว้ตั้งแต่ต้น (ดู index.html) เพื่อให้ตอนโหลดหน้า/รอ checkSession() มีแค่โลโก้บนพื้นแบรนด์
  // โชว์เป็น splash เฉยๆ ไม่ใช่ฟอร์ม login เต็มที่กระพริบขึ้นมาแล้วหายไปทันทีถ้า session ยัง valid อยู่
  if (form) form.hidden = false;
  if (userInput) userInput.value = "";
  if (pwInput) pwInput.value = "";
  if (errorEl) errorEl.hidden = true;
  if (userInput) userInput.focus();
}

export function hideLogin() {
  if (screen) screen.hidden = true;
}

// ออกจากระบบ: แจ้งเซิร์ฟเวอร์ให้เพิกถอน session token ก่อน (best-effort) แล้วค่อยล้าง cookie ฝั่ง client
// เผื่อเรียกซ้ำได้ปลอดภัยแม้ session จะหมดอายุไปแล้วก็ตาม
export async function logoutUser() {
  const token = getToken();
  clearToken();
  if (token) {
    try {
      await logout(token);
    } catch (e) {
      // เพิกเฉย — client ล้าง token ไปแล้ว ต่อให้แจ้งเซิร์ฟเวอร์ไม่สำเร็จก็ยัง logout ฝั่งนี้ได้จริง
    }
  }
}

export function openReset() {
  if (!resetOverlay) return;
  resetOldPw.value = "";
  resetPw.value = "";
  resetPwConfirm.value = "";
  resetError.hidden = true;
  resetOverlay.hidden = false;
  resetOldPw.focus();
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
  resetOldPw = document.getElementById("resetOldPw");
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
      const res = await login(username, password);
      if (submitBtn) submitBtn.disabled = false;
      if (res.success) {
        setToken(res.token);
        hideLogin();
        // หน้า home ถูก mount ไว้ใต้ overlay login ตั้งแต่ตอนเปิดแอป (ตอนนั้นยังไม่มี session จริง
        // โหลดข้อมูลลูกค้าไม่สำเร็จ) สั่ง show("home") ซ้ำหลัง login ผ่านเพื่อโหลดข้อมูลใหม่ด้วย session จริง
        show("home");
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

  // session หมดอายุระหว่างใช้งาน (เช่น login เครื่องอื่นทับ หรือถูกเปลี่ยนรหัสผ่าน) — เด้งกลับหน้า login
  window.addEventListener("pyne:session-expired", () => {
    showLogin();
  });
}

function initResetModal() {
  if (!resetOverlay || !resetForm) return;
  const closeBtn = document.getElementById("resetClose");
  const backBtn = document.getElementById("resetBack");
  const resetSubmitBtn = resetForm.querySelector(".login-submit");

  resetForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const oldPw = resetOldPw.value.trim();
    const pw = resetPw.value.trim();
    const confirm = resetPwConfirm.value.trim();
    if (!oldPw) {
      resetError.textContent = "Please enter your current password.";
      resetError.hidden = false;
      return;
    }
    if (!pw || pw !== confirm) {
      resetError.textContent = "Passwords do not match.";
      resetError.hidden = false;
      return;
    }
    resetError.hidden = true;
    if (resetSubmitBtn) resetSubmitBtn.disabled = true;
    const res = await changePassword(oldPw, pw);
    if (resetSubmitBtn) resetSubmitBtn.disabled = false;
    if (res.success) {
      // เปลี่ยนรหัสผ่านสำเร็จ = เพิกถอน session เดิมเสมอ (ฝั่งเซิร์ฟเวอร์ทำไปแล้ว) ต้อง login ใหม่ด้วยรหัสใหม่
      clearToken();
      closeReset();
      alert("Password updated. Please sign in again.");
      showLogin();
    } else if (res.error === "wrong_password") {
      resetError.textContent = "Current password is incorrect.";
      resetError.hidden = false;
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
