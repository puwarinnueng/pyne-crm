// fieldHelpers.js — ตัวช่วยสร้าง HTML ฟิลด์ฟอร์มแบบใช้ซ้ำได้ (chip / radio / text)
// ใช้ร่วมกันระหว่าง formBrow.js และ techFields.js

import { escapeHtml } from "./utils.js";

export function radioField(key, options, draft) {
  return `
    <div class="radio-row" data-radio-key="${key}">
      ${options.map((opt) => `
        <label>
          <input type="radio" name="${key}" value="${opt}" ${draft[key] === opt ? "checked" : ""}>
          <span>${opt}</span>
        </label>
      `).join("")}
    </div>`;
}

export function chipGroup(key, options, draft, multi) {
  const selected = multi ? (draft[key] || []) : [draft[key]].filter(Boolean);
  return `
    <div class="choice-grid" data-chip-key="${key}" data-chip-multi="${multi ? "1" : "0"}">
      ${options.map((opt) => `
        <div class="chip ${selected.includes(opt) ? "selected" : ""}" data-chip-value="${escapeHtml(opt)}">${escapeHtml(opt)}</div>
      `).join("")}
    </div>`;
}

// placeholder ปิดไว้ตามคำสั่งผู้ใช้ — พารามิเตอร์ยังรับไว้เผื่อเปิดใช้อีกครั้งในอนาคต
export function textField(key, placeholder, draft) {
  return `<input type="text" class="input" data-text-key="${key}" value="${escapeHtml(draft[key] || "")}"><!-- placeholder="${escapeHtml(placeholder || "")}" -->`;
}

export function textAreaField(key, placeholder, draft) {
  return `<textarea class="input textarea" data-text-key="${key}">${escapeHtml(draft[key] || "")}</textarea><!-- placeholder="${escapeHtml(placeholder || "")}" -->`;
}

// ผูก event delegation ให้ container ที่มี chip/radio/text field จาก helper ข้างบน
// เรียกครั้งเดียวตอน init แล้ว renderStep() ใหม่ได้เรื่อย ๆ โดยไม่ต้องผูกซ้ำ
export function bindFieldEvents(container, draft, onChange) {
  container.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    const group = chip.closest("[data-chip-key]");
    const key = group.dataset.chipKey;
    const multi = group.dataset.chipMulti === "1";
    const value = chip.dataset.chipValue;
    if (multi) {
      const arr = draft[key] || [];
      const idx = arr.indexOf(value);
      if (idx >= 0) arr.splice(idx, 1); else arr.push(value);
      draft[key] = arr;
      // สลับ class โดยตรงแทนการ re-render ทั้ง container เพื่อไม่ให้ state ของฟิลด์อื่นในหน้าเดียวกัน
      // (เช่น signature canvas ใน techFields.js) หายไปตอนคลิก chip
      chip.classList.toggle("selected");
    } else {
      const wasSelected = draft[key] === value;
      draft[key] = wasSelected ? null : value;
      group.querySelectorAll(".chip").forEach((c) => c.classList.remove("selected"));
      if (!wasSelected) chip.classList.add("selected");
    }
    onChange();
  });

  container.addEventListener("change", (e) => {
    const radioGroupEl = e.target.closest("[data-radio-key]");
    if (radioGroupEl && e.target.name) {
      draft[e.target.name] = e.target.value;
      onChange(e.target.name);
    }
  });

  container.addEventListener("input", (e) => {
    if (e.target.dataset.textKey) {
      draft[e.target.dataset.textKey] = e.target.value;
    }
  });
}
