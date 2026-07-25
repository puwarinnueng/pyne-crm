import { show, onEnter } from "../router.js";
import { state } from "../state.js";
import { uploadImage } from "../mockApi.js";
import { createSignaturePad } from "../signaturePad.js";
import { CONSENT_BLOCKS, INTENSITY_OPTIONS, AGREEMENT_TEXT } from "../data/consentText.js";
import { escapeHtml } from "../utils.js";

export function initConsentSign() {
  const body = document.getElementById("consentBody");
  const nextBtn = document.getElementById("consentNextBtn");
  const backBtn = document.getElementById("consentBackBtn");
  let pad = null;

  function updateNextState() {
    const agreed = body.querySelector("#agreeCheckbox")?.checked;
    const hasIntensity = !!state.visitDraft.intensity;
    const hasSignature = pad && !pad.isEmpty();
    nextBtn.disabled = !(agreed && hasIntensity && hasSignature);
  }

  function render() {
    body.innerHTML = `
      ${CONSENT_BLOCKS.map((block) => `
        <div class="consent-block">
          <div class="src">${escapeHtml(block.title)}</div>
          ${escapeHtml(block.body).replace(/\n/g, "<br>")}
        </div>
      `).join("")}

      <div class="step-group-title">ลูกค้าเลือกระดับความเข้มที่ต้องการ *</div>
      <div id="intensityOptions">
        ${INTENSITY_OPTIONS.map((opt) => `
          <div class="intensity-option ${state.visitDraft.intensity === opt.value ? "selected" : ""}" data-intensity="${escapeHtml(opt.value)}">
            <b>${escapeHtml(opt.label)}</b><br>${escapeHtml(opt.text)}
          </div>
        `).join("")}
      </div>

      <label class="agree-row">
        <input type="checkbox" id="agreeCheckbox">
        <span>${escapeHtml(AGREEMENT_TEXT)}</span>
      </label>

      <div class="step-group-title">ลายเซ็นลูกค้า *</div>
      <div class="sig-wrap">
        <canvas id="sigCanvas"></canvas>
      </div>
      <div class="sig-actions"><button id="sigClearBtn" type="button">ล้างลายเซ็น</button></div>
    `;

    pad = createSignaturePad(document.getElementById("sigCanvas"));

    body.querySelectorAll("[data-intensity]").forEach((el) => {
      el.addEventListener("click", () => {
        state.visitDraft.intensity = el.dataset.intensity;
        body.querySelectorAll("[data-intensity]").forEach((x) => x.classList.remove("selected"));
        el.classList.add("selected");
        updateNextState();
      });
    });

    document.getElementById("agreeCheckbox").addEventListener("change", updateNextState);
    document.getElementById("sigCanvas").addEventListener("pointerup", updateNextState);
    document.getElementById("sigCanvas").addEventListener("touchend", updateNextState);
    document.getElementById("sigCanvas").addEventListener("mouseup", updateNextState);
    document.getElementById("sigClearBtn").addEventListener("click", () => { pad.clear(); updateNextState(); });

    updateNextState();
  }

  nextBtn.addEventListener("click", async () => {
    if (!pad || pad.isEmpty()) return;
    nextBtn.disabled = true;
    const uploaded = await uploadImage(pad.toDataURL(), {
      customerId: state.currentCustomer.customerId,
      customerName: state.currentCustomer.name,
      serviceType: state.serviceType,
      filename: "signature_customer.png"
    });
    state.visitDraft.signatureCustomerUrl = uploaded.url;
    state.visitDraft.agreedAt = Date.now();
    show("techFields");
  });

  backBtn.addEventListener("click", () => {
    show(state.serviceType === "เติมสี" ? "formTouchup" : "formBrow");
  });

  onEnter("consentSign", render);
}
