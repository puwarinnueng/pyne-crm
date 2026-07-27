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
    "js/signaturePad.js",
    "js/fieldHelpers.js",
    "__BRIDGE__",
    "js/screens/gate.js",
    "js/screens/home.js",
    "js/screens/customerProfile.js",
    "js/screens/visitDetail.js",
    "js/screens/serviceType.js",
    "js/screens/formBrow.js",
    "js/screens/formTouchup.js",
    "js/screens/techFields.js",
    "js/screens/confirmation.js",
    "js/main.js",
]

BRIDGE = '''// ==== Server API bridge (แทนที่ js/mockApi.js) ====
// ห่อ google.script.run ให้เรียกแบบ Promise เหมือน mockApi.js เดิม ชื่อฟังก์ชันตรงกันทุกตัว
function callServer_(name, ...args) {
  return new Promise((resolve, reject) => {
    google.script.run
      .withSuccessHandler(resolve)
      .withFailureHandler((err) => reject(err))
      [name](...args);
  });
}
function checkPasscode(pin) { return callServer_("checkPasscode", pin); }
function searchCustomers(query) { return callServer_("searchCustomers", query); }
function listRecentCustomers(limit) { return callServer_("listRecentCustomers", limit); }
function findCustomerByPhone(phone) { return callServer_("findCustomerByPhone", phone); }
function createCustomer(data) { return callServer_("createCustomer", data); }
function getCustomer(customerId) { return callServer_("getCustomer", customerId); }
function getHistoryByCustomer(customerId) { return callServer_("getHistoryByCustomer", customerId); }
function saveVisit(payload) { return callServer_("saveVisit", payload); }
function uploadImage(dataUrl, meta) { return callServer_("uploadImage", dataUrl, meta); }
function exportConsentPdf(serviceId) { return callServer_("exportConsentPdf", serviceId); }
'''


def strip_module_syntax(src):
    src = re.sub(r'^import\s.*?;\s*$', '', src, flags=re.MULTILINE)
    src = re.sub(r'^export\s+(async\s+function|function|const|let|var)\b', r'\1', src, flags=re.MULTILINE)
    return src.strip("\n")


def build_javascript_html():
    parts = []
    for item in JS_ORDER:
        if item == "__BRIDGE__":
            parts.append(BRIDGE.strip("\n"))
            continue
        with open(os.path.join(ROOT, item), encoding="utf-8") as f:
            raw = f.read()
        parts.append(f"// ==== {item} ====\n{strip_module_syntax(raw)}")
    combined = "\n\n".join(parts)
    out = "<script>\n" + combined + "\n</script>\n"
    with open(os.path.join(ROOT, "gas/JavaScript.html"), "w", encoding="utf-8") as f:
        f.write(out)
    print(f"wrote gas/JavaScript.html ({len(out)} chars)")


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
