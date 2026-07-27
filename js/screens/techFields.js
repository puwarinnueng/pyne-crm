import { show, onEnter } from "../router.js";
import { state } from "../state.js";
import { saveVisit, uploadImage, createCustomer, ensureVisitFolder } from "../mockApi.js";
import { OPTIONS } from "../data/options.js";
import { radioField, chipGroup, textAreaField, bindFieldEvents } from "../fieldHelpers.js";
import { readFileAsDataUrl, ensureVisitSessionKey } from "../utils.js";
import { TECH_SIGNATURE_DATA_URL } from "../data/techSignature.js";

export function initTechFields() {
  const body = document.getElementById("techBody");
  const saveBtn = document.getElementById("techSaveBtn");
  const backBtn = document.getElementById("techBackBtn");

  function photoSlot(key, label) {
    const url = state.visitDraft[key + "PhotoDataUrl"];
    return `
      <div class="photo-slot" data-photo-key="${key}">
        ${url ? `<img src="${url}">` : `
          <label>
            <span style="font-size:22px">📷</span>
            <span>${label}</span>
            <input type="file" accept="image/*" data-photo-input="${key}">
          </label>`}
      </div>`;
  }

  function render() {
    const isTouchup = state.serviceType === "เติมสี";
    body.innerHTML = `
      <div class="step-group">
        <div class="step-group-title">รูป Before / After <span class="required-star">*</span></div>
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
        <div class="step-group-title">ลายเซ็นช่างผู้ให้บริการ</div>
        <div class="tech-sig-wrap">
          <img src="${TECH_SIGNATURE_DATA_URL}" alt="ลายเซ็นช่าง">
        </div>
        <p class="muted small" style="text-align:center">(ชนิสตา ศุภสุข)</p>
      </div>
    `;

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

  backBtn.addEventListener("click", () => show("formBrow"));

  saveBtn.addEventListener("click", async () => {
    body.querySelectorAll(".field-error").forEach((el) => el.classList.remove("field-error"));
    const beforeEl = !state.visitDraft.beforePhotoDataUrl ? body.querySelector('.photo-slot[data-photo-key="before"]') : null;
    const afterEl = !state.visitDraft.afterPhotoDataUrl ? body.querySelector('.photo-slot[data-photo-key="after"]') : null;
    if (beforeEl) beforeEl.classList.add("field-error");
    if (afterEl) afterEl.classList.add("field-error");
    if (beforeEl || afterEl) {
      (beforeEl || afterEl).scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    saveBtn.disabled = true;

    const draft = state.visitDraft;
    const isNewCustomer = !state.currentCustomer;

    // folder ใน Drive ตั้งชื่อด้วยเบอร์โทร (รู้ค่าได้ทันทีตั้งแต่ page 1) แทน customerId (ที่ต้องรอ
    // สร้างลูกค้าเสร็จก่อนถึงจะรู้) เพื่อให้ "สร้างลูกค้า" กับ "หา/สร้าง visit folder" รันพร้อมกันได้เลย
    const folderMeta = {
      customerPhone: isNewCustomer ? (draft.newCustomerPhone || "").trim() : state.currentCustomer.phoneNormalized,
      customerName: isNewCustomer ? (draft.newCustomerName || "").trim() : state.currentCustomer.name,
      serviceType: state.serviceType,
      visitKey: ensureVisitSessionKey(draft)
    };

    const customerPromise = isNewCustomer
      ? createCustomer({
          name: (draft.newCustomerName || "").trim(),
          phone: (draft.newCustomerPhone || "").trim(),
          line: (draft.newCustomerLine || "").trim()
        })
      : Promise.resolve({ success: true, customer: state.currentCustomer });

    const hasSignature = Boolean(draft.signatureCustomerDataUrl);

    // สร้างลูกค้า + หา/สร้าง visit folder พร้อมกันเลย (ไม่พึ่งกัน) — พอได้ folderId แน่นอนแล้วค่อย
    // upload รูป/ลายเซ็นทั้งหมดแบบขนานเต็มที่ ไม่มี race เพราะไม่มีไฟล์ไหนต้องมาหา/สร้างโฟลเดอร์ซ้ำอีก
    const [customerRes, folderRes] = await Promise.all([
      customerPromise,
      ensureVisitFolder(folderMeta)
    ]);

    if (!customerRes.success) {
      alert("เบอร์นี้ถูกสร้างเป็นลูกค้าไปแล้วระหว่างกรอกฟอร์ม กรุณากลับไปหน้าก่อนหน้าแล้วเลือกลูกค้าเดิม");
      saveBtn.disabled = false;
      return;
    }
    state.currentCustomer = customerRes.customer;

    const uploadMeta = { folderId: folderRes.folderId };
    const [beforeUp, afterUp, sigUp] = await Promise.all([
      uploadImage(draft.beforePhotoDataUrl, { ...uploadMeta, filename: "before.jpg" }),
      uploadImage(draft.afterPhotoDataUrl, { ...uploadMeta, filename: "after.jpg" }),
      hasSignature
        ? uploadImage(draft.signatureCustomerDataUrl, { ...uploadMeta, filename: "signature_customer.png" })
        : Promise.resolve(null)
    ]);

    const serviceDateTime = state.visitDraft.serviceDate && state.visitDraft.serviceTime
      ? new Date(`${state.visitDraft.serviceDate}T${state.visitDraft.serviceTime}`).getTime()
      : Date.now();

    const payload = {
      customerId: state.currentCustomer.customerId,
      serviceType: state.serviceType,
      visitDate: serviceDateTime,
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
      signatureCustomerUrl: hasSignature ? sigUp.url : null,
      signatureTechUrl: "(ชนิสตา ศุภสุข) — ลายเซ็นคงที่",
      rawAnswers: { ...state.visitDraft, beforePhotoDataUrl: undefined, afterPhotoDataUrl: undefined }
    };

    const res = await saveVisit(payload);
    saveBtn.disabled = false;
    state.lastSavedServiceId = res.serviceId;
    show("confirmation");
  });

  onEnter("techFields", render);
}
