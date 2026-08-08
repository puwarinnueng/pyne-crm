// createVisit.js — Step 3: เก็บข้อมูลนัดก่อนเลือกฟอร์ม
// ยังไม่สร้างแถว ServiceHistory จนกว่าช่างจะเลือก Form 1/2/3 ใน modal ถัดไปสำเร็จ

import { show, onEnter } from "../router.js?v=20260808ae";
import { state } from "../state.js?v=20260808ae";
import { getHistoryByCustomer } from "../mockApi.js?v=20260808ae";
import { openServiceTypeModal } from "./serviceType.js?v=20260808ae";
import { appConfirm } from "../dialogs.js?v=20260808ae";
import { escapeHtml, formatDate, normalizeVisitStatus } from "../utils.js?v=20260808ae";

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
    try {
      // เช็คก่อนว่าลูกค้าคนนี้มี Visit ที่ยังไม่ปิด ("in_progress") ค้างอยู่ไหม — ปกติไม่ควรมี แต่เกิดได้
      // ถ้าหน้าเว็บ reload กลางทางระหว่างกรอกฟอร์ม (visitContext เป็นแค่ state ในหน่วยความจำ ไม่ persist)
      // แล้วช่างกลับมาเริ่มใหม่ ไม่งั้นจะได้ Visit ซ้อนกัน 2 แถวสำหรับคิวเดียวกันแบบเงียบ ๆ
      const history = await getHistoryByCustomer(c.customerId);
      const openVisit = history.find((v) => normalizeVisitStatus(v.status) === "in_progress");
      if (openVisit) {
        const proceed = await appConfirm(
          `ลูกค้าคนนี้มีคิวที่ยังไม่ปิดอยู่\n\nคิว ${openVisit.serviceId}\nสร้างเมื่อ ${formatDate(openVisit.createdAt || openVisit.visitDate)}\n\nอาจเป็นครั้งก่อนที่กรอกค้างไว้ ถ้าสร้างคิวใหม่ คิวเก่าจะยังค้างอยู่`,
          {
            title: "มีคิวค้างอยู่",
            okText: "สร้างคิวใหม่",
            cancelText: "กลับไปเช็คก่อน"
          }
        );
        if (!proceed) { continueBtn.disabled = false; return; }
      }
    } catch (e) {
      // เช็ค Visit ค้างไม่สำเร็จ — ไม่บล็อกการทำงานต่อ แค่ข้ามการเตือนไปเฉย ๆ
      console.warn("checking for open visit failed:", e);
    }

    const visitDate = dateEl.value ? new Date(dateEl.value).getTime() : Date.now();
    state.pendingVisitMeta = {
      customerId: c.customerId,
      zervaBookingId: zervaEl.value.trim(),
      visitDate,
      timeSlot: timeValue
    };
    state.visitContext = null;
    state.resetVisitDraft();
    state.formStepIndex = 0;
    state.formType = null;
    state.serviceType = null;
    continueBtn.disabled = false;
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
    // ค่าเริ่มต้นที่ร้านใช้บ่อย — ลดการกดซ้ำ
    const defaultSlot = document.querySelector('[data-time-slot="10:30"]');
    if (defaultSlot) selectSlot("10:30");
    state.pendingVisitMeta = null;
    document.querySelectorAll(".field-error").forEach((el) => el.classList.remove("field-error"));
    continueBtn.disabled = false;
  });
}
