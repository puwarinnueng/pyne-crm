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

// ===== สัดส่วนสีที่ใช้ (mix ratio) — Form 3 เติมสีคิ้ว =====
// เก็บค่าไว้ที่ draft[key] = { [ชื่อสี]: จำนวนหยด, __other__: จำนวนหยด, Solution: จำนวนหยด }
// และ draft[`${key}OtherLabel`] = ป้ายชื่อสีที่กรอกเองในช่อง "อื่นๆ"
// รูปแบบต่างจาก text/chip/radio ทั่วไป (ตัวเลขต่อแถวสี ไม่ใช่ 1 ค่าเดียว) จึงมี bind event แยกของตัวเอง
export function mixRatioField(key, colorNames, draft) {
  const parts = draft[key] || (draft[key] = {});
  const otherLabel = draft[`${key}OtherLabel`] || "";
  const row = (label, colorKey, value) => `
    <div class="mix-row">
      <span class="mix-label">${escapeHtml(label)}</span>
      <input type="number" min="0" inputmode="numeric" class="input mix-input" data-mix-key="${key}" data-mix-color="${escapeHtml(colorKey)}" value="${value === undefined || value === null || value === "" ? "" : escapeHtml(String(value))}" placeholder="0">
      <span class="mix-unit">หยด</span>
    </div>`;
  return `
    <div class="mix-ratio-grid" data-mix-group="${key}">
      ${colorNames.map((name) => row(name, name, parts[name])).join("")}
      <div class="mix-row">
        <input type="text" class="input mix-other-label" data-mix-other-label="${key}" placeholder="อื่นๆ ระบุ..." value="${escapeHtml(otherLabel)}">
        <input type="number" min="0" inputmode="numeric" class="input mix-input" data-mix-key="${key}" data-mix-color="__other__" value="${parts.__other__ === undefined || parts.__other__ === null || parts.__other__ === "" ? "" : escapeHtml(String(parts.__other__))}" placeholder="0">
        <span class="mix-unit">หยด</span>
      </div>
      ${row("Solution", "Solution", parts.Solution === undefined ? 1 : parts.Solution)}
    </div>`;
}

// รวมค่าที่กรอกใน mixRatioField เป็น string บันทึกผล เช่น "น้ำตาลส้ม 3 : น้ำตาลเข้ม 1 : Solution 1"
// คืนค่า "" ถ้ายังไม่ได้กรอกสีไหนเลย (ใช้เช็ก required ตอนบันทึกปิด Visit ได้)
export function formatMixRatio(key, draft) {
  const parts = draft[key] || {};
  const otherLabel = (draft[`${key}OtherLabel`] || "").trim();
  const segs = [];
  Object.keys(parts).forEach((name) => {
    if (name === "Solution" || name === "__other__") return;
    const v = Number(parts[name]);
    if (v > 0) segs.push(`${name} ${v}`);
  });
  const otherV = Number(parts.__other__);
  if (otherV > 0 && otherLabel) segs.push(`${otherLabel} ${otherV}`);
  if (!segs.length) return "";
  const solutionV = parts.Solution === undefined || parts.Solution === "" ? 1 : Number(parts.Solution);
  segs.push(`Solution ${solutionV}`);
  return segs.join(" : ");
}

export function bindMixRatioEvents(container, draft) {
  container.addEventListener("input", (e) => {
    const groupKey = e.target.dataset.mixKey;
    if (groupKey) {
      const colorKey = e.target.dataset.mixColor;
      const parts = draft[groupKey] || (draft[groupKey] = {});
      // สเปก: "ใช้ไม่เกิน 3 หลุมสี" — Solution ไม่นับเป็นหลุมสี นับเฉพาะสีจริง + อื่นๆ
      if (colorKey !== "Solution") {
        const wellsUsed = new Set(Object.keys(parts).filter((k) => k !== "Solution" && Number(parts[k]) > 0));
        if (Number(e.target.value) > 0) wellsUsed.add(colorKey); else wellsUsed.delete(colorKey);
        if (wellsUsed.size > 3) {
          e.target.value = "";
          alert("สัดส่วนสีที่ใช้ได้ไม่เกิน 3 หลุม");
          return;
        }
      }
      parts[colorKey] = e.target.value;
    }
    const otherLabelKey = e.target.dataset.mixOtherLabel;
    if (otherLabelKey) {
      draft[`${otherLabelKey}OtherLabel`] = e.target.value;
    }
  });
}

// ===== ข้อมูลความพร้อมก่อนรับบริการ — ใช้ร่วมกันทุกฟอร์ม (Form 1/2/3) =====
export function readinessBlockHtml(draft) {
  return `
    <div class="form-section-title">ข้อมูลความพร้อมก่อนรับบริการ</div>
    <div class="step-group">
      <div class="step-group-title">ผิวบริเวณคิ้วมีแผลเป็นหรือไม่ <span class="required-star">*</span></div>
      ${radioField("hasScar", ["ไม่มี", "มี"], draft)}
      <div id="scarCauseBlock" ${draft.hasScar === "มี" ? "" : "hidden"}>
        ${chipGroup("scarCause", ["จากรอยเก่า", "Other"], draft, true)}
      </div>
    </div>
    <div class="step-group">
      <div class="step-group-title">ผิวบริเวณคิ้วมีความระคายเคืองภายใน 7 วันที่ผ่านมาหรือไม่ <span class="required-star">*</span></div>
      ${radioField("irritation7d", ["ไม่มี", "มี"], draft)}
      <div id="irritationDetailBlock" ${draft.irritation7d === "มี" ? "" : "hidden"}>
        ${textField("irritationDetail", "ระบุรายละเอียด", draft)}
      </div>
    </div>
    <div class="step-group">
      <div class="step-group-title">มีอาการแพ้หรือข้อมูลสำคัญที่ต้องแจ้งช่างหรือไม่ <span class="required-star">*</span></div>
      ${radioField("allergyInfo", ["ไม่มี", "มี"], draft)}
      <div id="allergyDetailBlock" ${draft.allergyInfo === "มี" ? "" : "hidden"}>
        ${textField("allergyDetail", "ระบุรายละเอียด", draft)}
      </div>
    </div>`;
}

// ผูกกับ callback ของ bindFieldEvents(container, draft, onChange) — เรียกจาก onChange(changedRadioName)
export function bindReadinessToggle(container, draft, changedRadioName) {
  if (changedRadioName === "hasScar") {
    const el = container.querySelector("#scarCauseBlock");
    if (el) el.hidden = draft.hasScar !== "มี";
  }
  if (changedRadioName === "irritation7d") {
    const el = container.querySelector("#irritationDetailBlock");
    if (el) el.hidden = draft.irritation7d !== "มี";
  }
  if (changedRadioName === "allergyInfo") {
    const el = container.querySelector("#allergyDetailBlock");
    if (el) el.hidden = draft.allergyInfo !== "มี";
  }
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
