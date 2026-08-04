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

function checkPasscode(pin) {
  const value = getConfigValue_("PASSCODE");
  return { success: String(pin) === String(value) };
}

function checkLogin(username, password) {
  const storedUsername = getConfigValue_("USERNAME");
  const storedPassword = getConfigValue_("PASSWORD");
  const success = String(username || "") === String(storedUsername) && String(password || "") === String(storedPassword);
  return { success: success };
}

function changePassword(newPassword) {
  setConfigValue_("PASSWORD", newPassword);
  return { success: true };
}
