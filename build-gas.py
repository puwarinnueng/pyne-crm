#!/usr/bin/env python3
"""
build-gas.py — compile the mock web app (index.html, css/style.css, js/*.js)
into Apps Script-compatible gas/Index.html, gas/Stylesheet.html, gas/JavaScript.html.

Run this again any time you edit the UI/logic in the main index.html/css/js folders,
so the gas/ version stays in sync. Does NOT touch gas/*.gs (backend) files.

Usage:
    cd pyne-crm-web
    python3 build-gas.py
"""
import re
import os

ROOT = os.path.dirname(os.path.abspath(__file__))

JS_ORDER = [
    "js/utils.js",
    "js/data/options.js",
    "js/data/consentText.js",
    "js/data/techSignature.js",
    "js/state.js",
    "js/router.js",
    "js/session.js",
    "js/dialogs.js",
    "js/shell.js",
    "js/signaturePad.js",
    "js/fieldHelpers.js",
    "__BRIDGE__",
    "js/visitFlow.js",
    "js/screens/login.js",
    "js/screens/home.js",
    "js/screens/newCustomer.js",
    "js/screens/customerProfile.js",
    "js/screens/visitDetail.js",
    "js/screens/createVisit.js",
    "js/screens/serviceType.js",
    "js/screens/formOne.js",
    "js/screens/formTwo.js",
    "js/screens/formTouchup.js",
    "js/screens/techFields.js",
    "js/screens/confirmation.js",
    "js/main.js",
]

BRIDGE = '''// ==== Server API bridge (แทนที่ js/mockApi.js) ====
// ห่อ google.script.run ให้เรียกแบบ Promise เหมือน mockApi.js เดิม ชื่อฟังก์ชันตรงกันทุกตัว
// normalizePhone เป็น utility ล้วน ๆ (ไม่ต้องยิงเซิร์ฟเวอร์) — คัดลอกมาจาก js/mockApi.js ตรงตัว
// เพราะฝั่ง client (gas/JavaScript.html) กับฝั่ง server (gas/*.gs) เป็นคนละ scope กันโดยสิ้นเชิงใน Apps Script
function normalizePhone(phone) {
  if (!phone) return "";
  let p = String(phone).replace(/[^\\d+]/g, "");
  if (p.startsWith("+66")) p = "0" + p.slice(3);
  else if (p.startsWith("66") && p.length > 9) p = "0" + p.slice(2);
  return p;
}
function callServer_(name, ...args) {
  return new Promise((resolve, reject) => {
    google.script.run
      .withSuccessHandler(resolve)
      .withFailureHandler((err) => reject(err))
      [name](...args);
  });
}
// ฟังก์ชันที่ต้อง login ก่อนถึงจะเรียกได้ (เซิร์ฟเวอร์เช็คด้วย requireSession_() ดู gas/Utils.gs) — แนบ
// session token (จาก cookie ผ่าน getToken() ใน js/session.js) เป็นอาร์กิวเมนต์แรกให้อัตโนมัติทุกครั้ง
// ถ้าเซิร์ฟเวอร์ตอบ UNAUTHORIZED (session ไม่ valid แล้ว เช่น login เครื่องอื่นทับ/ถูกเปลี่ยนรหัสผ่าน)
// จะเคลียร์ cookie แล้วเด้งกลับหน้า login ทันทีผ่าน sessionExpired()
function callServerAuthed_(name, ...args) {
  return callServer_(name, getToken(), ...args).catch((err) => {
    const message = (err && err.message) || String(err || "");
    if (message.indexOf("UNAUTHORIZED") >= 0) sessionExpired();
    throw err;
  });
}
function login(username, password) { return callServer_("login", username, password); }
function checkSession(token) { return callServer_("checkSession", token); }
function logout(token) { return callServer_("logout", token); }
function changePassword(oldPassword, newPassword) { return callServer_("changePassword", oldPassword, newPassword); }
function searchCustomers(query) { return callServerAuthed_("searchCustomers", query); }
function listRecentCustomers(limit) { return callServerAuthed_("listRecentCustomers", limit); }
function listCustomersWithStats() { return callServerAuthed_("listCustomersWithStats"); }
function debugCustomerSearch(query) { return callServerAuthed_("debugCustomerSearch", query); }
function findCustomerByPhone(phone) { return callServerAuthed_("findCustomerByPhone", phone); }
function createCustomer(data) { return callServerAuthed_("createCustomer", data); }
function confirmCustomerProfile(customerId) { return callServerAuthed_("confirmCustomerProfile", customerId); }
function saveSkinProfile(customerId, skinProfile) { return callServerAuthed_("saveSkinProfile", customerId, skinProfile); }
function updateMuscleEvaluation(customerId, muscle, muscleNote) { return callServerAuthed_("updateMuscleEvaluation", customerId, muscle, muscleNote); }
function getCustomer(customerId) { return callServerAuthed_("getCustomer", customerId); }
function getHistoryByCustomer(customerId) { return callServerAuthed_("getHistoryByCustomer", customerId); }
function createVisit(payload) { return callServerAuthed_("createVisit", payload); }
function closeVisitNotServed(visitId, reason) { return callServerAuthed_("closeVisitNotServed", visitId, reason); }
function saveVisit(payload) { return callServerAuthed_("saveVisit", payload); }
function ensureVisitFolder(meta) { return callServerAuthed_("ensureVisitFolder", meta); }
function uploadImage(dataUrl, meta) { return callServerAuthed_("uploadImage", dataUrl, meta); }
function exportConsentPdf(serviceId) { return callServerAuthed_("exportConsentPdf", serviceId); }
'''


def strip_module_syntax(src):
    src = re.sub(r'^import\s.*?;\s*$', '', src, flags=re.MULTILINE)
    src = re.sub(r'^export\s+(async\s+function|function|const|let|var)\b', r'\1', src, flags=re.MULTILINE)
    return src.strip("\n")


def build_javascript_html():
    # แต่ละไฟล์ห่อเป็น <script> ของตัวเอง แทนที่จะรวมเป็น <script> เดียวก้อนใหญ่ก้อนเดียว —
    # จำเป็นจริงๆ ไม่ใช่แค่จัดระเบียบ: Apps Script IFRAME sandbox mode (การ render จริงบน
    # googleusercontent.com) พบว่า <script> เดียวที่ใหญ่เกินไป (~145KB+) โดน "ตัดกลางคัน" ระหว่างขั้นตอน
    # แทรกเนื้อหาเข้า iframe ของ Google เอง (bug/ข้อจำกัดฝั่ง Google ไม่ใช่ syntax error ของเรา — ยืนยันแล้วว่า
    # แยกเป็น <script> ย่อยตามไฟล์ทำให้ทุกฟังก์ชันถูกโหลดครบ) แต่ละไฟล์ที่ export ฟังก์ชัน/const ระดับบนสุด
    # (function/const/let ที่ hoist ได้) ทำให้ตัดแบ่งตรงนี้ปลอดภัย ไม่กระทบลำดับการทำงานเลย
    parts = []
    for item in JS_ORDER:
        if item == "__BRIDGE__":
            parts.append(BRIDGE.strip("\n"))
            continue
        with open(os.path.join(ROOT, item), encoding="utf-8") as f:
            raw = f.read()
        parts.append(f"// ==== {item} ====\n{strip_module_syntax(raw)}")
    scripts = "\n".join(f"<script>\n{part}\n</script>" for part in parts if part.strip())
    out = scripts + "\n"
    with open(os.path.join(ROOT, "gas/JavaScript.html"), "w", encoding="utf-8") as f:
        f.write(out)
    print(f"wrote gas/JavaScript.html ({len(out)} chars, {len(parts)} script tags)")


def build_stylesheet_html():
    with open(os.path.join(ROOT, "css/style.css"), encoding="utf-8") as f:
        css = f.read()
    out = "<style>\n" + css + "\n</style>\n"
    with open(os.path.join(ROOT, "gas/Stylesheet.html"), "w", encoding="utf-8") as f:
        f.write(out)
    print(f"wrote gas/Stylesheet.html ({len(out)} chars)")


if __name__ == "__main__":
    build_javascript_html()
    build_stylesheet_html()
    print("Done. gas/Index.html is hand-maintained separately — update it manually if you")
    print("change screen markup in index.html (add/remove/rename a <section class=screen>).")
