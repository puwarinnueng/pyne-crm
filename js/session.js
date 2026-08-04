// session.js — จัดการ session token ฝั่ง client เก็บใน localStorage เพื่อให้ทั้ง dev (mockApi.js)
// และ production (gas/JavaScript.html bridge) ส่ง token เดิมแนบไปกับทุก request ฝั่งเซิร์ฟเวอร์ได้
//
// เดิมตั้งใจเก็บใน document.cookie แต่ทดสอบจริงบน production (Apps Script IFRAME sandbox — เนื้อหาแอป
// รันอยู่ใน iframe ที่ฝังซ้อนบน googleusercontent.com) พบว่า document.cookie เขียนไม่ติดเลยแบบเงียบๆ
// (เขียนแล้วอ่านกลับมาว่างทันที) เพราะโดน sandbox/third-party cookie policy ของเบราว์เซอร์บล็อก
// ส่วน localStorage ทดสอบแล้วใช้ได้จริงและอยู่ข้ามการ refresh หน้าได้ปกติใน context เดียวกันนี้
// จึงย้ายมาใช้ localStorage แทน — ยังเป็น client-side storage ที่ต้องผ่านการตรวจสอบจริงฝั่งเซิร์ฟเวอร์
// ทุกครั้งเหมือนเดิม (checkSession()/logout()/changePassword() ใน gas/Code.gs) ไม่ได้ลดความปลอดภัยลง
const TOKEN_KEY = "pyneCrmToken";

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || "";
  } catch (e) {
    return "";
  }
}

export function setToken(token) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch (e) {
    // localStorage ไม่พร้อมใช้งาน (เช่น โหมดส่วนตัวบางเบราว์เซอร์) — ปล่อยผ่าน session จะแค่ไม่รอดข้าม refresh
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch (e) {
    // เพิกเฉย
  }
}

// เรียกตอนพบว่า session ไม่ valid แล้วระหว่างใช้งาน (เช่น login เครื่องอื่นทับ หรือมีคนเปลี่ยนรหัสผ่าน)
// ล้าง token แล้วยิง event ให้ login.js ไปโชว์หน้า login ต่อ — แยกกันด้วย event กันไม่ให้ import วนกัน
export function sessionExpired() {
  clearToken();
  window.dispatchEvent(new CustomEvent("pyne:session-expired"));
}
