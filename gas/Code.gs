/**
 * Code.gs — จุดเริ่มต้นเว็บแอป
 */

function doGet(e) {
  return HtmlService.createTemplateFromFile("Index")
    .evaluate()
    .setTitle("Pyne Studio CRM")
    .addMetaTag("viewport", "width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ใช้ใน Index.html แบบ <?!= include('Stylesheet') ?> เพื่อรวมไฟล์ CSS/JS เข้าเป็นหน้าเดียว
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function login(username, password) {
  const storedUsername = getConfigValue_("USERNAME");
  const storedPassword = getConfigValue_("PASSWORD");
  const ok = String(username || "") === String(storedUsername) && String(password || "") === String(storedPassword);
  if (!ok) return { success: false };
  const token = Utilities.getUuid();
  setSessionToken_(token);
  return { success: true, token: token };
}

function checkSession(token) {
  const stored = getSessionToken_();
  return { valid: !!stored && !!token && String(token) === String(stored) };
}

function logout(token) {
  clearSessionToken_();
  return { success: true };
}

// เปลี่ยนรหัสผ่าน — ต้องกรอกรหัสผ่านเดิมถูกต้องก่อนเสมอ (กันไม่ให้ใครตั้งรหัสใหม่ได้จากหน้า login
// โดยไม่รู้รหัสเดิม) เปลี่ยนสำเร็จแล้ว invalidate session ทันที บังคับ login ใหม่ด้วยรหัสผ่านใหม่
function changePassword(oldPassword, newPassword) {
  const storedPassword = getConfigValue_("PASSWORD");
  if (String(oldPassword || "") !== String(storedPassword)) {
    return { success: false, error: "wrong_password" };
  }
  setConfigValue_("PASSWORD", newPassword);
  clearSessionToken_();
  return { success: true };
}
