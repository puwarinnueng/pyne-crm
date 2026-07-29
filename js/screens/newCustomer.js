// newCustomer.js — หน้าสร้างลูกค้าใหม่ (แยกออกจากฟอร์มบริการ)
// flow: home > "+ New Customer" > หน้านี้ > สร้างลูกค้าเข้า DB > เปิด modal เลือกบริการ

import { show, onEnter } from "../router.js";
import { state } from "../state.js";
import { findCustomerByPhone, createCustomer } from "../mockApi.js";
import { escapeHtml } from "../utils.js";
import { openServiceTypeModal } from "./serviceType.js";

export function initNewCustomer() {
  const nameEl = document.getElementById("ncName");
  const phoneEl = document.getElementById("ncPhone");
  const lineEl = document.getElementById("ncLine");
  const warnEl = document.getElementById("ncWarning");
  const createBtn = document.getElementById("ncCreateBtn");
  const backBtn = document.getElementById("newCustomerBackBtn");

  backBtn.addEventListener("click", () => show("home"));

  function clearErrors() {
    [nameEl, phoneEl].forEach((el) => el.classList.remove("field-error"));
    warnEl.innerHTML = "";
  }

  [nameEl, phoneEl].forEach((el) => {
    el.addEventListener("input", () => el.classList.remove("field-error"));
  });

  createBtn.addEventListener("click", async () => {
    clearErrors();
    const name = nameEl.value.trim();
    const phone = phoneEl.value.trim();
    const line = lineEl.value.trim();

    let firstErr = null;
    if (!name) { nameEl.classList.add("field-error"); firstErr = firstErr || nameEl; }
    if (!phone) { phoneEl.classList.add("field-error"); firstErr = firstErr || phoneEl; }
    if (firstErr) { firstErr.scrollIntoView({ behavior: "smooth", block: "center" }); return; }

    createBtn.disabled = true;

    // กันเบอร์ซ้ำ: ถ้ามีลูกค้าเบอร์นี้แล้ว เสนอให้เปิดประวัติคนเดิมแทนการสร้างซ้ำ
    const existing = await findCustomerByPhone(phone);
    if (existing) {
      createBtn.disabled = false;
      warnEl.innerHTML = `
        <div class="dup-warning">
          ⚠ เบอร์นี้มีอยู่ในระบบแล้ว: <b>${escapeHtml(existing.name)}</b> (${escapeHtml(existing.phoneDisplay)})<br>
          ควรใช้ลูกค้าเดิมแทนการสร้างซ้ำ
          <br><button class="btn btn-primary" id="ncUseExistingBtn" type="button" style="margin-top:8px">เปิดประวัติลูกค้าคนนี้</button>
        </div>`;
      document.getElementById("ncUseExistingBtn").addEventListener("click", () => {
        state.currentCustomer = existing;
        show("customerProfile");
      });
      return;
    }

    const res = await createCustomer({ name, phone, line });
    createBtn.disabled = false;
    if (!res.success) {
      warnEl.innerHTML = `<div class="dup-warning">⚠ ไม่สามารถสร้างลูกค้าได้ (เบอร์อาจเพิ่งถูกสร้างไปแล้ว) ลองอีกครั้ง</div>`;
      return;
    }

    // สร้างลูกค้าสำเร็จ → ตั้งเป็นลูกค้าปัจจุบัน แล้วพาไปหน้าประวัติพร้อมเปิด modal เลือกบริการทับ
    state.currentCustomer = res.customer;
    state.serviceType = null;
    state.resetVisitDraft();
    show("customerProfile");
    openServiceTypeModal();
  });

  onEnter("newCustomer", () => {
    nameEl.value = "";
    phoneEl.value = "";
    lineEl.value = "";
    clearErrors();
    createBtn.disabled = false;
  });
}
