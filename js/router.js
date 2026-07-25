// router.js — สลับหน้าจอแบบง่าย (ไม่ใช้ URL hash เพื่อให้เหมือนพฤติกรรม Apps Script HtmlService SPA)

const enterHandlers = {};
let historyStack = ["gate"];

export function onEnter(screenId, handler) {
  enterHandlers[screenId] = handler;
}

export function show(screenId, opts = {}) {
  document.querySelectorAll(".screen").forEach((el) => el.classList.remove("active"));
  const target = document.getElementById("screen-" + screenId);
  if (!target) {
    console.error("Unknown screen:", screenId);
    return;
  }
  target.classList.add("active");

  if (opts.pushHistory !== false) {
    if (historyStack[historyStack.length - 1] !== screenId) {
      historyStack.push(screenId);
    }
  }

  if (enterHandlers[screenId]) {
    enterHandlers[screenId](opts.data);
  }
  window.scrollTo(0, 0);
}

export function goBack(fallback = "home") {
  historyStack.pop(); // ทิ้งหน้าปัจจุบัน
  const prev = historyStack.pop() || fallback;
  show(prev);
}

// ผูกปุ่มที่มี data-back="screenId" ให้กลับไปหน้านั้นแบบตรง ๆ (ไม่พึ่ง history stack)
document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-back]");
  if (btn) {
    show(btn.getAttribute("data-back"));
  }
});
