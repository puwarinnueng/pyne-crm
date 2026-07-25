// formBrow.js — ฟอร์มคอนเซ้า "สักคิ้ว" 3 ขั้นตอน ตรงตามกลุ่มฟิลด์ใน Jotform ต้นฉบับ
// (ขั้นตอนที่ 4 คือ Consent อยู่ในหน้าจอแยก screen-consentSign)

import { show, onEnter } from "../router.js";
import { state } from "../state.js";
import { OPTIONS } from "../data/options.js";
import { radioField, chipGroup, textField, bindFieldEvents } from "../fieldHelpers.js";

const STEPS = [
  {
    title: "ประวัติการสักคิ้ว",
    render(draft) {
      return `
        <div class="step-group">
          <div class="step-group-title">เคยสักคิ้วมาก่อนหรือไม่ *</div>
          ${radioField("hadBrowBefore", ["เคย", "ไม่เคย"], draft)}
        </div>
        ${draft.hadBrowBefore === "เคย" ? `
        <div class="step-group">
          <div class="step-group-title">ลักษณะรอยเก่า</div>
          ${chipGroup("oldMarkLook", OPTIONS.oldMarkLook, draft, true)}
        </div>` : ""}
      `;
    },
    valid(draft) { return !!draft.hadBrowBefore; }
  },
  {
    title: "ลักษณะคิ้ว / ประวัติผิว",
    render(draft) {
      return `
        <div class="step-group">
          <div class="step-group-title">ลักษณะขนคิ้ว</div>
          ${chipGroup("browHairLook", OPTIONS.browHairLook, draft, false)}
          <div class="step-group-title">ความแน่นของขนคิ้ว</div>
          ${chipGroup("browHairDensity", OPTIONS.browHairDensity, draft, false)}
        </div>
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
      `;
    },
    valid(draft) { return !!draft.skinType; }
  },
  {
    title: "เป้าหมายของลูกค้า",
    render(draft) {
      return `
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
      `;
    },
    valid(draft) { return !!draft.technique; }
  }
];

export function initFormBrow() {
  const container = document.getElementById("browStepContainer");
  const stepTitle = document.getElementById("browStepTitle");
  const stepIndicator = document.getElementById("browStepIndicator");
  const nextBtn = document.getElementById("browNextBtn");
  const backBtn = document.getElementById("browBackBtn");

  function renderStep() {
    const step = STEPS[state.browStepIndex];
    stepTitle.textContent = step.title;
    stepIndicator.textContent = `${state.browStepIndex + 1}/${STEPS.length}`;
    container.innerHTML = step.render(state.visitDraft);
    nextBtn.textContent = state.browStepIndex === STEPS.length - 1 ? "ถัดไป: เงื่อนไข + เซ็นยินยอม" : "ถัดไป";
  }

  bindFieldEvents(container, state.visitDraft, (changedRadioName) => {
    // chip เปลี่ยน selected class เองแล้วใน bindFieldEvents — ที่นี่ต้อง re-render แค่ตอน
    // "hadBrowBefore" เปลี่ยน เพื่อโชว์/ซ่อนช่อง "ลักษณะรอยเก่า" แบบมีเงื่อนไข
    if (changedRadioName === "hadBrowBefore") {
      renderStep();
    }
  });

  nextBtn.addEventListener("click", () => {
    const step = STEPS[state.browStepIndex];
    if (step.valid && !step.valid(state.visitDraft)) {
      alert("กรุณากรอกข้อมูลที่มี * ให้ครบก่อนไปต่อ");
      return;
    }
    if (state.browStepIndex < STEPS.length - 1) {
      state.browStepIndex += 1;
      renderStep();
    } else {
      show("consentSign");
    }
  });

  backBtn.addEventListener("click", () => {
    if (state.browStepIndex > 0) {
      state.browStepIndex -= 1;
      renderStep();
    } else {
      show("serviceType");
    }
  });

  onEnter("formBrow", () => {
    state.browStepIndex = 0;
    renderStep();
  });
}
