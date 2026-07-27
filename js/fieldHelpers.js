// fieldHelpers.js — ตัวช่วยสร้าง HTML ฟิลด์ฟอร์มแบบใช้ซ้ำได้ (chip / radio / text)
// ใช้ร่วมกันระหว่าง formBrow.js และ techFields.js

import { escapeHtml } from "./utils.js";

export function radioField(key, options, draft) {
  return `
    <div class="radio-row" data-radio-key="${key}">
      ${options.map((opt) => `
        <label class="native-choice">
          <input type="radio" name="${key}" value="${escapeHtml(opt)}" ${draft[key] === opt ? "checked" : ""}>
          <span>${escapeHtml(opt)}</span>
        </label>
      `).join("")}
    </div>`;
}

// option ที่ชื่อ "Other" จะมีช่องกรอกข้อความต่อท้ายทันที (โชว์เฉพาะตอนติ๊กเลือก) — ค่าที่พิมพ์เก็บแยกไว้ที่ draft[`${key}Other`]
export function chipGroup(key, options, draft, multi) {
  const selected = multi ? (draft[key] || []) : [draft[key]].filter(Boolean);
  const otherKey = `${key}Other`;
  const inputType = multi ? "checkbox" : "radio";
  return `
    <div class="choice-grid" data-chip-key="${key}" data-chip-multi="${multi ? "1" : "0"}">
      ${options.map((opt) => {
        const isOther = opt === "Other";
        const checked = selected.includes(opt);
        return `
          <label class="native-choice">
            <input type="${inputType}" ${multi ? "" : `name="${key}"`} data-chip-value="${escapeHtml(opt)}" ${checked ? "checked" : ""}>
            <span>${isOther ? "อื่นๆ" : escapeHtml(opt)}</span>
          </label>
          ${isOther ? `<input type="text" class="input other-input" data-other-key="${otherKey}" placeholder="ระบุ..." value="${escapeHtml(draft[otherKey] || "")}" ${checked ? "" : "hidden"}>` : ""}
        `;
      }).join("")}
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
  container.addEventListener("change", (e) => {
    const chipGroupEl = e.target.closest("[data-chip-key]");
    if (chipGroupEl && e.target.dataset.chipValue !== undefined) {
      const key = chipGroupEl.dataset.chipKey;
      const multi = chipGroupEl.dataset.chipMulti === "1";
      const value = e.target.dataset.chipValue;
      if (multi) {
        const arr = draft[key] || (draft[key] = []);
        const idx = arr.indexOf(value);
        if (e.target.checked && idx < 0) arr.push(value);
        if (!e.target.checked && idx >= 0) arr.splice(idx, 1);
      } else {
        draft[key] = e.target.checked ? value : null;
      }
      const otherInput = chipGroupEl.querySelector("[data-other-key]");
      if (otherInput) {
        otherInput.hidden = multi ? !draft[key].includes("Other") : draft[key] !== "Other";
      }
      onChange();
      return;
    }

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
    if (e.target.dataset.otherKey) {
      draft[e.target.dataset.otherKey] = e.target.value;
    }
  });
}
