// visitDetail.js — หน้าดูรายละเอียดประวัติการเข้ารับบริการแบบอ่านอย่างเดียว (แก้ไขไม่ได้)
// เปิดจากการกดรายการใน customerProfile.js (ส่ง visit object มาทาง show("visitDetail", { data: visit }))

import { onEnter } from "../router.js";
import { formatDate, escapeHtml, formTypeLabel, isCompletedVisitStatus, visitStatusLabel } from "../utils.js";
import { exportConsentPdf } from "../mockApi.js";
import { appAlert } from "../dialogs.js";

const FIELD_LABELS = {
  hadBrowBefore: "เคยสักคิ้วมาก่อนหรือไม่",
  oldMarkLook: "ลักษณะรอยเก่าที่เห็นในปัจจุบัน",
  oldMarkTone: "โทนสีรอยเดิม",
  fixPoints: "จุดที่ต้องการแก้ไขจากรอยเดิม",
  browHairLook: "ลักษณะขนคิ้ว",
  browHairDensity: "ความแน่นของขนคิ้ว",
  skinType: "ประเภทผิว",
  hasScar: "ผิวบริเวณคิ้วมีแผลเป็นหรือไม่",
  scarCause: "สาเหตุแผลเป็น",
  desiredArea: "จุดที่ต้องการ",
  irritation7d: "ผิวระคายเคืองบริเวณคิ้วภายใน 7 วัน",
  irritationDetail: "รายละเอียดความระคายเคือง",
  allergyInfo: "มีอาการแพ้/ข้อมูลสำคัญที่ต้องแจ้งช่างหรือไม่",
  allergyDetail: "รายละเอียดอาการแพ้",
  concerns: "ปัญหาหลักที่กังวล",
  desiredOverview: "ภาพรวมที่ต้องการ",
  desiredFeel: "ฟีลคิ้วที่ต้องการ",
  notWanted: "สิ่งที่ไม่อยากได้เด็ดขาด",
  dontWant: "สิ่งที่ไม่อยากได้เด็ดขาด",
  adjustFromLast: "สิ่งที่อยากปรับจากครั้งก่อน",
  touchupPrice: "ค่าเติมสี (บาท)",
  colorChoice: "สีที่เลือก"
};

function fmtValue(v) {
  if (Array.isArray(v)) return v.length ? v.join(", ") : "-";
  if (v === undefined || v === null || v === "") return "-";
  return String(v);
}

function row(label, value) {
  return `
    <div class="detail-row">
      <div class="detail-label">${escapeHtml(label)}</div>
      <div class="detail-value">${escapeHtml(fmtValue(value))}</div>
    </div>`;
}

function photoBox(url) {
  return `<div class="photo-slot">${url ? `<img src="${url}">` : `<span class="muted small">ไม่มีรูป</span>`}</div>`;
}

export function initVisitDetail() {
  const body = document.getElementById("visitDetailBody");

  async function handleExportPdf(visit, btn) {
    btn.disabled = true;
    btn.textContent = "Generating PDF...";
    try {
      const res = await exportConsentPdf(visit.serviceId);
      if (res && res.success && res.url) {
        await appAlert(`สร้าง PDF เรียบร้อยแล้ว\n${res.filename || ""}`, {
          title: "Export PDF",
          okText: "เปิด PDF"
        });
        window.open(res.url, "_blank", "noopener");
        return;
      }
      await appAlert((res && (res.note || res.error)) || "สร้าง PDF ไม่สำเร็จ", { title: "Export PDF" });
    } catch (err) {
      await appAlert(`สร้าง PDF ไม่สำเร็จ — ${err.message || err}`, { title: "Export PDF" });
    } finally {
      btn.disabled = false;
      btn.textContent = "Export Consent Form (PDF)";
    }
  }

  onEnter("visitDetail", (visit) => {
    if (!visit) {
      body.innerHTML = `<div class="empty-hint">ไม่พบข้อมูลประวัตินี้</div>`;
      return;
    }
    const raw = visit.rawAnswers || {};
    const rawRows = Object.keys(FIELD_LABELS)
      .filter((key) => raw[key] !== undefined && raw[key] !== null && raw[key] !== "" && !(Array.isArray(raw[key]) && raw[key].length === 0))
      .map((key) => row(FIELD_LABELS[key], raw[key]))
      .join("");

    body.innerHTML = `
      <div class="box-quiet">
        <b>${escapeHtml(visit.serviceType || "-")}</b>${formTypeLabel(visit.formType) ? ` &nbsp;·&nbsp; ${escapeHtml(formTypeLabel(visit.formType))}` : ""} &nbsp;·&nbsp; ${formatDate(visit.visitDate)}
      </div>

      ${isCompletedVisitStatus(visit.status) ? `
      <button type="button" class="btn btn-outline btn-block visit-export-btn" id="visitExportPdfBtn">Export Consent Form (PDF)</button>
      ` : ""}

      <div class="step-group">
        <div class="step-group-title">รูป Before / After</div>
        <div class="photo-row">
          ${photoBox(visit.beforePhotoUrl)}
          ${photoBox(visit.afterPhotoUrl)}
        </div>
      </div>

      <div class="step-group">
        <div class="step-group-title">สรุปบริการ</div>
        ${row("เทคนิค", visit.technique)}
        ${row("สีที่ใช้", visit.colorUsed)}
        ${row("ความเข้ม", visit.intensity)}
        ${visit.muscle ? row("กล้ามเนื้อคิ้ว", visit.muscle) : ""}
        ${visit.shapeDesign ? row("ทรงที่ออกแบบ", visit.shapeDesign) : ""}
        ${visit.browGuard ? row("การกันคิ้ว", visit.browGuard) : ""}
        ${visit.analysis ? row("ผลการวิเคราะห์จากช่าง", visit.analysis) : ""}
        ${visit.satisfaction ? row("ความพึงพอใจกับผลลัพธ์หลังลอก", visit.satisfaction) : ""}
        ${visit.colorRetention ? row("การติดสีโดยรวม", visit.colorRetention) : ""}
        ${visit.wantsMoreChange ? row("มีสิ่งที่ต้องการแก้ไขเพิ่มเติมหรือไม่", visit.wantsMoreChange) : ""}
        ${(visit.changeItems || []).length ? row("สิ่งที่ต้องการแก้ไขเพิ่มเติม", visit.changeItems.join(", ")) : ""}
        ${visit.mixRatio ? row("สัดส่วนสีที่ใช้", visit.mixRatio) : ""}
        ${visit.redness ? row("ความแดงผิว", visit.redness) : ""}
        ${visit.adherence ? row("ความติดสี", visit.adherence) : ""}
        ${!isCompletedVisitStatus(visit.status) && visitStatusLabel(visit.status) ? row("สถานะ", visitStatusLabel(visit.status)) : ""}
        ${visit.note ? row("หมายเหตุ", visit.note) : ""}
      </div>

      ${rawRows ? `
      <div class="step-group">
        <div class="step-group-title">รายละเอียดจากแบบฟอร์มที่ลูกค้ากรอก</div>
        ${rawRows}
      </div>` : ""}

      <div class="step-group">
        <div class="step-group-title">ลายเซ็น</div>
        <div class="photo-row">
          <div class="photo-slot photo-slot-sig">${visit.signatureCustomerUrl ? `<img src="${visit.signatureCustomerUrl}">` : `<span class="muted small">ไม่มี</span>`}</div>
          <div class="photo-slot photo-slot-sig"><span class="muted small">(ชนิสตา ศุภสุข)</span></div>
        </div>
      </div>
    `;

    const exportBtn = document.getElementById("visitExportPdfBtn");
    if (exportBtn) exportBtn.addEventListener("click", () => handleExportPdf(visit, exportBtn));
  });
}
