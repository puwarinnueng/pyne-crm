import { show, onEnter } from "../router.js";
import { state } from "../state.js";
import { saveVisit, uploadImage } from "../mockApi.js";
import { createSignaturePad } from "../signaturePad.js";
import { OPTIONS } from "../data/options.js";
import { radioField, chipGroup, textAreaField, bindFieldEvents } from "../fieldHelpers.js";
import { readFileAsDataUrl } from "../utils.js";

export function initTechFields() {
  const body = document.getElementById("techBody");
  const saveBtn = document.getElementById("techSaveBtn");
  let techPad = null;

  function photoSlot(key, label) {
    const url = state.visitDraft[key + "PhotoDataUrl"];
    return `
      <div class="photo-slot" data-photo-key="${key}">
        ${url ? `<img src="${url}">` : `
          <label>
            <span style="font-size:22px">📷</span>
            <span>${label}</span>
            <input type="file" accept="image/*" capture="environment" data-photo-input="${key}">
          </label>`}
      </div>`;
  }

  function render() {
    const isTouchup = state.serviceType === "เติมสี";
    body.innerHTML = `
      <div class="step-group">
        <div class="step-group-title">รูป Before / After *</div>
        <div class="photo-row">
          ${photoSlot("before", "Before")}
          ${photoSlot("after", "After")}
        </div>
      </div>

      ${!isTouchup ? `
      <div class="step-group">
        <div class="step-group-title">กล้ามเนื้อคิ้ว</div>
        ${chipGroup("muscle", OPTIONS.muscle, state.visitDraft, true)}
        <div class="step-group-title">ทรงที่ออกแบบ</div>
        ${chipGroup("shapeDesign", OPTIONS.shapeDesign, state.visitDraft, true)}
        <div class="step-group-title">การกันคิ้ว</div>
        ${radioField("browGuard", OPTIONS.browGuard, state.visitDraft)}
      </div>` : ""}

      <div class="step-group">
        <div class="step-group-title">สีที่ใช้</div>
        ${chipGroup("colorUsed", OPTIONS.colorUsed, state.visitDraft, false)}
      </div>

      <div class="step-group">
        <div class="step-group-title">ผลการวิเคราะห์จากช่าง</div>
        ${textAreaField("analysis", "บันทึกผลการวิเคราะห์ / หมายเหตุ", state.visitDraft)}
      </div>

      <div class="step-group">
        <div class="step-group-title">ลายเซ็นช่างผู้ให้บริการ *</div>
        <div class="sig-wrap"><canvas id="techSigCanvas"></canvas></div>
        <div class="sig-actions"><button id="techSigClearBtn" type="button">ล้างลายเซ็น</button></div>
        <p class="muted small" style="text-align:center">(ชนิสตา ศุภสุข)</p>
      </div>
    `;

    techPad = createSignaturePad(document.getElementById("techSigCanvas"));
    document.getElementById("techSigClearBtn").addEventListener("click", () => techPad.clear());

    body.querySelectorAll("[data-photo-input]").forEach((inputEl) => {
      inputEl.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const dataUrl = await readFileAsDataUrl(file);
        state.visitDraft[inputEl.dataset.photoInput + "PhotoDataUrl"] = dataUrl;
        render();
      });
    });
  }

  bindFieldEvents(body, state.visitDraft, () => {});

  saveBtn.addEventListener("click", async () => {
    if (!state.visitDraft.beforePhotoDataUrl || !state.visitDraft.afterPhotoDataUrl) {
      alert("กรุณาถ่ายรูป Before และ After ให้ครบก่อนบันทึก");
      return;
    }
    if (!techPad || techPad.isEmpty()) {
      alert("กรุณาให้ช่างเซ็นชื่อก่อนบันทึก");
      return;
    }
    saveBtn.disabled = true;

    const photoMeta = {
      customerId: state.currentCustomer.customerId,
      customerName: state.currentCustomer.name,
      serviceType: state.serviceType
    };
    const [beforeUp, afterUp, techSigUp] = await Promise.all([
      uploadImage(state.visitDraft.beforePhotoDataUrl, { ...photoMeta, filename: "before.jpg" }),
      uploadImage(state.visitDraft.afterPhotoDataUrl, { ...photoMeta, filename: "after.jpg" }),
      uploadImage(techPad.toDataURL(), { ...photoMeta, filename: "signature_tech.png" })
    ]);

    const payload = {
      customerId: state.currentCustomer.customerId,
      serviceType: state.serviceType,
      technique: state.visitDraft.technique || null,
      colorUsed: state.visitDraft.colorUsed || null,
      intensity: state.visitDraft.intensity || null,
      muscle: state.visitDraft.muscle || null,
      shapeDesign: state.visitDraft.shapeDesign || null,
      browGuard: state.visitDraft.browGuard || null,
      analysis: state.visitDraft.analysis || null,
      note: state.visitDraft.adjustFromLast || state.visitDraft.dontWant || null,
      beforePhotoUrl: beforeUp.url,
      afterPhotoUrl: afterUp.url,
      signatureCustomerUrl: state.visitDraft.signatureCustomerUrl || null,
      signatureTechUrl: techSigUp.url,
      rawAnswers: { ...state.visitDraft, beforePhotoDataUrl: undefined, afterPhotoDataUrl: undefined }
    };

    const res = await saveVisit(payload);
    saveBtn.disabled = false;
    state.lastSavedServiceId = res.serviceId;
    show("confirmation");
  });

  onEnter("techFields", render);
}
