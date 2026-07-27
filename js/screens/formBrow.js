// formBrow.js — ฟอร์มคอนเซ้าต์ "สักคิ้ว" หน้าเดียวยาว (Page 1 ตาม Jotform ต้นฉบับ)
// รวมชื่อ/เบอร์โทร/LINE ลูกค้า + ทุกฟิลด์ + consent 4 บล็อก + เลือกความเข้ม + ยินยอม (radio ตัวเลือกเดียว) + เซ็นชื่อลูกค้า
// จบด้วยปุ่ม "ถัดไป" เดียว ไปหน้า techFields (Page 2)
//
// กรณีลูกค้าใหม่ (state.currentCustomer ยังไม่มี — มาจาก home > "+ ลูกค้าใหม่" > เลือกประเภทบริการ):
// ช่วงบนสุดของฟอร์มจะถามชื่อ/เบอร์โทร/LINE แทนกล่องแสดงชื่อลูกค้าเดิม ตรงตามโครงสร้าง Jotform จริง
// (Jotform ถามชื่อ+เบอร์เป็นส่วนหนึ่งของฟอร์มเดียวกัน ไม่ใช่หน้าแยกก่อนเลือกบริการ)

import { show, onEnter } from "../router.js";
import { state } from "../state.js";
import { OPTIONS } from "../data/options.js";
import { CONSENT_BLOCKS, INTENSITY_OPTIONS, AGREEMENT_TEXT } from "../data/consentText.js";
import { radioField, chipGroup, textField, bindFieldEvents } from "../fieldHelpers.js";
import { createSignaturePad } from "../signaturePad.js";
import { uploadImage, createCustomer } from "../mockApi.js";
import { escapeHtml } from "../utils.js";

function pad2(n) { return String(n).padStart(2, "0"); }
function todayDateValue() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function nowTimeValue() {
  const d = new Date();
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function initFormBrow() {
  const container = document.getElementById("browBody");
  const nextBtn = document.getElementById("browNextBtn");
  const backBtn = document.getElementById("browBackBtn");
  let pad = null;

  function customerInfoHtml() {
    const draft = state.visitDraft;
    const c = state.currentCustomer;
    if (c) {
      return `<div class="box-quiet"><b>${escapeHtml(c.name)}</b></div>`;
    }
    return `
      <div class="step-group-title">ชื่อเล่น *</div>
      <!-- placeholder="เช่น มายด์" -->
      <input type="text" class="input" data-text-key="newCustomerName" value="${escapeHtml(draft.newCustomerName || "")}">
      <div class="step-group-title">เบอร์โทร *</div>
      <!-- placeholder="08x-xxx-xxxx" -->
      <input type="tel" class="input" data-text-key="newCustomerPhone" value="${escapeHtml(draft.newCustomerPhone || "")}">
      <div class="step-group-title">ชื่อ LINE</div>
      <!-- placeholder="ไม่บังคับ" -->
      <input type="text" class="input" data-text-key="newCustomerLine" value="${escapeHtml(draft.newCustomerLine || "")}">
      <div id="newCustomerWarning"></div>
    `;
  }

  function renderCustomerInfoBlock() {
    document.getElementById("customerInfoBlock").innerHTML = customerInfoHtml();
  }

  function render() {
    const draft = state.visitDraft;
    if (!draft.serviceDate) draft.serviceDate = todayDateValue();
    if (!draft.serviceTime) draft.serviceTime = nowTimeValue();

    container.innerHTML = `
      <div class="step-group" id="customerInfoBlock">
        ${customerInfoHtml()}
      </div>

      <div class="step-group">
        <div class="step-group-title">วัน-เวลาเข้ารับบริการ *</div>
        <div style="display:flex; gap:8px;">
          <input type="date" class="input" style="margin:0" data-text-key="serviceDate" value="${escapeHtml(draft.serviceDate)}">
          <input type="time" class="input" style="margin:0" data-text-key="serviceTime" value="${escapeHtml(draft.serviceTime)}">
        </div>
      </div>

      <div class="form-section-title">ประวัติการสักคิ้ว</div>
      <div class="step-group">
        <div class="step-group-title">เคยสักคิ้วมาก่อนหรือไม่ *</div>
        ${radioField("hadBrowBefore", ["เคย", "ไม่เคย"], draft)}
      </div>
      <div class="step-group" id="oldMarkBlock" ${draft.hadBrowBefore === "เคย" ? "" : "hidden"}>
        <div class="step-group-title">ลักษณะรอยเก่า</div>
        ${chipGroup("oldMarkLook", OPTIONS.oldMarkLook, draft, true)}
      </div>

      <div class="form-section-title">ลักษณะคิ้วปัจจุบัน</div>
      <div class="step-group">
        <div class="step-group-title">ลักษณะขนคิ้ว</div>
        ${chipGroup("browHairLook", OPTIONS.browHairLook, draft, false)}
        <div class="step-group-title">ความแน่นของขนคิ้ว</div>
        ${chipGroup("browHairDensity", OPTIONS.browHairDensity, draft, false)}
      </div>

      <div class="form-section-title">ประวัติผิว</div>
      <div class="step-group">
        <div class="step-group-title">ประเภทผิว *</div>
        ${chipGroup("skinType", OPTIONS.skinType, draft, false)}
      </div>
      <div class="step-group">
        <div class="step-group-title">แผลเป็น</div>
        ${radioField("hasScar", ["มี", "ไม่มี"], draft)}
        <div class="step-group-title">จุดที่ต้องการ</div>
        ${textField("desiredArea", "ระบุจุดที่ต้องการ (ถ้ามี)", draft)}
      </div>
      <div class="step-group">
        <div class="step-group-title">ผิวมีความระคายเคืองบริเวณคิ้วภายใน 7 วันหรือไม่</div>
        ${radioField("irritation7d", ["มี", "ไม่มี"], draft)}
        <div class="step-group-title">อาการแพ้</div>
        ${textField("allergy", "ระบุอาการแพ้ (ถ้ามี)", draft)}
      </div>

      <div class="form-section-title">เป้าหมายในการสักคิ้วของลูกค้า</div>
      <div class="step-group">
        <div class="step-group-title">ปัญหาที่ลูกค้ากังวล</div>
        ${chipGroup("concerns", OPTIONS.concerns, draft, true)}
      </div>
      <div class="step-group">
        <div class="step-group-title">ฟีลคิ้วที่ต้องการ</div>
        ${chipGroup("desiredFeel", OPTIONS.desiredFeel, draft, true)}
      </div>
      <div class="step-group">
        <div class="step-group-title">เทคนิคที่เลือก *</div>
        ${chipGroup("technique", OPTIONS.technique, draft, false)}
      </div>
      <div class="step-group">
        <div class="step-group-title">สิ่งที่ "ไม่อยากได้เด็ดขาด"</div>
        ${textField("dontWant", "ระบุ (ถ้ามี)", draft)}
      </div>

      <div class="form-section-title">Consent / ข้อตกลง / การดูแลหลังทำ</div>
      ${CONSENT_BLOCKS.map((block) => `
        <div class="consent-block">
          <div class="src">${escapeHtml(block.title)}</div>
          ${escapeHtml(block.body).replace(/\n/g, "<br>")}
        </div>
      `).join("")}

      <div class="step-group-title">ลูกค้าเลือกระดับความเข้มที่ต้องการ *</div>
      <div id="intensityOptions">
        ${INTENSITY_OPTIONS.map((opt) => `
          <div class="intensity-option ${draft.intensity === opt.value ? "selected" : ""}" data-intensity="${escapeHtml(opt.value)}">
            <b>${escapeHtml(opt.label)}</b><br>${escapeHtml(opt.text)}
          </div>
        `).join("")}
      </div>

      <div class="step-group" data-radio-key="agree">
        <label class="agree-row">
          <input type="radio" name="agree" value="agreed" ${draft.agree === "agreed" ? "checked" : ""}>
          <span>${escapeHtml(AGREEMENT_TEXT)}</span>
        </label>
      </div>

      <div class="step-group-title">ลายเซ็นลูกค้า *</div>
      <div class="sig-wrap"><canvas id="sigCanvas"></canvas></div>
      <div class="sig-actions"><button id="sigClearBtn" type="button">ล้างลายเซ็น</button></div>
    `;

    pad = createSignaturePad(document.getElementById("sigCanvas"));

    container.querySelectorAll("[data-intensity]").forEach((el) => {
      el.addEventListener("click", () => {
        draft.intensity = el.dataset.intensity;
        container.querySelectorAll("[data-intensity]").forEach((x) => x.classList.remove("selected"));
        el.classList.add("selected");
      });
    });

    document.getElementById("sigClearBtn").addEventListener("click", () => pad.clear());
  }

  // ผูก event ครั้งเดียว (chip/radio/text ใช้ event delegation) — render() เรียกซ้ำได้โดยไม่ต้องผูกใหม่
  bindFieldEvents(container, state.visitDraft, (changedRadioName) => {
    // ต้อง toggle การแสดงผลแบบ DOM ตรง ๆ ห้าม re-render ทั้ง container เพราะจะล้างลายเซ็นที่วาดไว้
    if (changedRadioName === "hadBrowBefore") {
      const block = document.getElementById("oldMarkBlock");
      if (block) block.hidden = state.visitDraft.hadBrowBefore !== "เคย";
    }
  });

  async function ensureCustomer() {
    if (state.currentCustomer) return true;
    const draft = state.visitDraft;
    const name = (draft.newCustomerName || "").trim();
    const phone = (draft.newCustomerPhone || "").trim();
    if (!name || !phone) {
      alert("กรุณากรอกชื่อและเบอร์โทรลูกค้าก่อน");
      return false;
    }

    nextBtn.disabled = true;
    const res = await createCustomer({ name, phone, line: (draft.newCustomerLine || "").trim() });
    nextBtn.disabled = false;

    if (!res.success && res.error === "duplicate") {
      const warningEl = document.getElementById("newCustomerWarning");
      warningEl.innerHTML = `
        <div class="dup-warning">
          ⚠ เบอร์นี้มีอยู่ในระบบแล้ว: <b>${escapeHtml(res.existing.name)}</b> (${escapeHtml(res.existing.phoneDisplay)})<br>
          กรุณาใช้ลูกค้าเดิมแทนการสร้างใหม่
          <br><button class="btn btn-primary" id="dupUseExistingBtn" type="button" style="margin-top:8px">ใช้ลูกค้าคนนี้ แล้วกรอกต่อ</button>
        </div>`;
      document.getElementById("dupUseExistingBtn").addEventListener("click", () => {
        state.currentCustomer = res.existing;
        renderCustomerInfoBlock();
      });
      return false;
    }

    state.currentCustomer = res.customer;
    return true;
  }

  nextBtn.addEventListener("click", async () => {
    const ok = await ensureCustomer();
    if (!ok) return;

    const draft = state.visitDraft;
    const missing = [];
    if (!draft.serviceDate || !draft.serviceTime) missing.push("วัน-เวลาเข้ารับบริการ");
    if (!draft.hadBrowBefore) missing.push("เคยสักคิ้วมาก่อนหรือไม่");
    if (!draft.skinType) missing.push("ประเภทผิว");
    if (!draft.technique) missing.push("เทคนิคที่เลือก");
    if (!draft.intensity) missing.push("ระดับความเข้มที่ต้องการ");
    if (!draft.agree) missing.push("ยินยอมเข้ารับบริการ");
    if (!pad || pad.isEmpty()) missing.push("ลายเซ็นลูกค้า");
    if (missing.length) {
      alert("กรุณากรอกให้ครบก่อนไปต่อ:\n- " + missing.join("\n- "));
      return;
    }

    nextBtn.disabled = true;
    const uploaded = await uploadImage(pad.toDataURL(), {
      customerId: state.currentCustomer.customerId,
      customerName: state.currentCustomer.name,
      serviceType: state.serviceType,
      filename: "signature_customer.png"
    });
    draft.signatureCustomerUrl = uploaded.url;
    draft.agreedAt = Date.now();
    nextBtn.disabled = false;
    show("techFields");
  });

  backBtn.addEventListener("click", () => show("serviceType"));

  onEnter("formBrow", render);
}
