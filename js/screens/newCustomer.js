import { createCustomer } from "../mockApi.js";
import { show, onEnter } from "../router.js";
import { state } from "../state.js";
import { escapeHtml } from "../utils.js";

export function initNewCustomer() {
  const nameEl = document.getElementById("ncName");
  const phoneEl = document.getElementById("ncPhone");
  const lineEl = document.getElementById("ncLine");
  const noteEl = document.getElementById("ncNote");
  const warningEl = document.getElementById("ncPhoneWarning");
  const saveBtn = document.getElementById("ncSaveBtn");

  async function trySave() {
    warningEl.hidden = true;
    warningEl.innerHTML = "";

    if (!nameEl.value.trim() || !phoneEl.value.trim()) {
      warningEl.hidden = false;
      warningEl.textContent = "กรุณากรอกชื่อและเบอร์โทร";
      return;
    }

    saveBtn.disabled = true;
    const res = await createCustomer({
      name: nameEl.value.trim(),
      phone: phoneEl.value.trim(),
      line: lineEl.value.trim(),
      note: noteEl.value.trim()
    });
    saveBtn.disabled = false;

    if (!res.success && res.error === "duplicate") {
      warningEl.hidden = false;
      warningEl.innerHTML = `
        <div class="dup-warning">
          ⚠ เบอร์นี้มีอยู่ในระบบแล้ว: <b>${escapeHtml(res.existing.name)}</b> (${escapeHtml(res.existing.phoneDisplay)})<br>
          กรุณาเลือกลูกค้าเดิมแทนการสร้างใหม่
          <br><button class="btn btn-primary" id="ncGoExisting" style="margin-top:8px">ไปที่ลูกค้าคนนี้</button>
        </div>`;
      document.getElementById("ncGoExisting").addEventListener("click", () => {
        state.currentCustomer = res.existing;
        show("customerProfile");
      });
      return;
    }

    state.currentCustomer = res.customer;
    show("customerProfile");
  }

  saveBtn.addEventListener("click", trySave);

  onEnter("newCustomer", () => {
    nameEl.value = "";
    phoneEl.value = "";
    lineEl.value = "";
    noteEl.value = "";
    warningEl.hidden = true;
  });
}
