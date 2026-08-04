// createVisit.js — Step 3: สร้างประวัติการเข้ารับบริการใหม่ (ทุกคิว ไม่ว่าลูกค้าใหม่/เก่า ต้องผ่านหน้านี้ก่อนเปิดฟอร์ม)
// เก็บ Zerva Booking ID + วันที่ + เวลานัด แล้วสร้าง Visit สถานะ "กำลังดำเนินการ" ก่อนไปหน้าเลือกฟอร์ม (Step 4)

import { show, onEnter } from "../router.js";
import { state } from "../state.js";
import { createVisit } from "../mockApi.js";
import { openServiceTypeModal } from "./serviceType.js";
import { escapeHtml } from "../utils.js";

function pad2(n) { return String(n).padStart(2, "0"); }
function todayDateValue() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function initCreateVisit() {
  const profileBox = document.getElementById("cvProfileBox");
  const zervaEl = document.getElementById("cvZervaId");
  const dateEl = document.getElementById("cvDate");
  const slotButtons = document.querySelectorAll("[data-time-slot]");
  const customSlotBtn = document.getElementById("cvCustomSlotBtn");
  const customTimeEl = document.getElementById("cvCustomTime");
  const continueBtn = document.getElementById("cvContinueBtn");
  const backBtn = document.getElementById("createVisitBackBtn");

  let selectedSlot = null;

  function selectSlot(slot) {
    selectedSlot = slot;
    slotButtons.forEach((b) => b.classList.toggle("is-selected", b.dataset.timeSlot === slot));
    customSlotBtn.classList.toggle("is-selected", slot === "custom");
    customTimeEl.hidden = slot !== "custom";
    zervaEl.closest(".page-pad")?.querySelectorAll(".field-error").forEach((el) => {
      if (el.id === "cvSlotGroup") el.classList.remove("field-error");
    });
  }

  slotButtons.forEach((btn) => btn.addEventListener("click", () => selectSlot(btn.dataset.timeSlot)));
  customSlotBtn.addEventListener("click", () => selectSlot("custom"));

  backBtn.addEventListener("click", () => show(state.currentCustomer ? "customerProfile" : "home"));

  [zervaEl].forEach((el) => el.addEventListener("input", () => el.classList.remove("field-error")));

  continueBtn.addEventListener("click", async () => {
    const c = state.currentCustomer;
    if (!c) { show("home"); return; }

    document.querySelectorAll(".field-error").forEach((el) => el.classList.remove("field-error"));
    let firstErr = null;
    if (!zervaEl.value.trim()) { zervaEl.classList.add("field-error"); firstErr = firstErr || zervaEl; }
    const slotGroup = document.getElementById("cvSlotGroup");
    const timeValue = selectedSlot === "custom" ? customTimeEl.value : selectedSlot;
    if (!timeValue) { slotGroup.classList.add("field-error"); firstErr = firstErr || slotGroup; }
    if (firstErr) { firstErr.scrollIntoView({ behavior: "smooth", block: "center" }); return; }

    continueBtn.disabled = true;
    const visitDate = dateEl.value ? new Date(dateEl.value).getTime() : Date.now();
    const res = await createVisit({
      customerId: c.customerId,
      zervaBookingId: zervaEl.value.trim(),
      visitDate,
      timeSlot: timeValue
    });
    continueBtn.disabled = false;

    state.visitContext = {
      visitId: res.visitId,
      zervaBookingId: zervaEl.value.trim(),
      visitDate,
      timeSlot: timeValue
    };
    state.resetVisitDraft();
    state.formType = null;
    state.serviceType = null;
    openServiceTypeModal();
  });

  onEnter("createVisit", () => {
    const c = state.currentCustomer;
    if (!c) { show("home"); return; }
    profileBox.innerHTML = `
      <div><b>${escapeHtml(c.fullName || c.nickname)}</b> (${escapeHtml(c.nickname || "-")})</div>
      <div class="muted small">${escapeHtml(c.customerId)} &nbsp;·&nbsp; ☎ ${escapeHtml(c.phoneDisplay || "-")}</div>
    `;
    zervaEl.value = "";
    dateEl.value = todayDateValue();
    customTimeEl.value = "";
    customTimeEl.hidden = true;
    selectedSlot = null;
    slotButtons.forEach((b) => b.classList.remove("is-selected"));
    customSlotBtn.classList.remove("is-selected");
    document.querySelectorAll(".field-error").forEach((el) => el.classList.remove("field-error"));
    continueBtn.disabled = false;
  });
}
