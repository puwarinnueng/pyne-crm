// session.js — จัดการ session token ฝั่ง client เก็บใน cookie (ไม่ใช่ localStorage) เพื่อให้ทั้ง dev (mockApi.js)
// และ production (gas/JavaScript.html bridge) ส่ง token เดิมแนบไปกับทุก request ฝั่งเซิร์ฟเวอร์ได้
// อายุคุกกี้ยาวโดยตั้งใจ — ไม่ได้เป็นตัวกำหนดว่า session ใช้ได้จริงหรือไม่ เซิร์ฟเวอร์เป็นคนตัดสินผ่าน
// checkSession()/logout()/changePassword() (ดู gas/Code.gs) session จะอยู่จนกว่าจะ logout หรือรีเซ็ตรหัสผ่าน

const TOKEN_COOKIE = "pyneCrmToken";
const COOKIE_MAX_AGE_DAYS = 400; // ค่าสูงสุดที่เบราว์เซอร์ยอมรับสำหรับ Set-Cookie max-age

export function getToken() {
  const match = document.cookie.match(new RegExp("(?:^|; )" + TOKEN_COOKIE + "=([^;]*)"));
  return match ? decodeURIComponent(match[1]) : "";
}

export function setToken(token) {
  const maxAge = COOKIE_MAX_AGE_DAYS * 24 * 60 * 60;
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${TOKEN_COOKIE}=${encodeURIComponent(token)}; max-age=${maxAge}; path=/; SameSite=Lax${secure}`;
}

export function clearToken() {
  document.cookie = `${TOKEN_COOKIE}=; max-age=0; path=/; SameSite=Lax`;
}

// เรียกตอนพบว่า session ไม่ valid แล้วระหว่างใช้งาน (เช่น login เครื่องอื่นทับ หรือมีคนเปลี่ยนรหัสผ่าน)
// ล้าง cookie แล้วยิง event ให้ login.js ไปโชว์หน้า login ต่อ — แยกกันด้วย event กันไม่ให้ import วนกัน
export function sessionExpired() {
  clearToken();
  window.dispatchEvent(new CustomEvent("pyne:session-expired"));
}
