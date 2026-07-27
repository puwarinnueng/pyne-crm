// visitDetail.js — หน้าดูรายละเอียดประวัติการเข้ารับบริการแบบอ่านอย่างเดียว (แก้ไขไม่ได้)
// เปิดจากการกดรายการใน customerProfile.js (ส่ง visit object มาทาง show("visitDetail", { data: visit }))

import { onEnter } from "../router.js";
import { formatDate, escapeHtml } from "../utils.js";

const FIELD_LABELS = {
  hadBrowBefore: "เคยสักคิ้วมาก่อนหรือไม่",
  oldMarkLook: "ลักษณะรอยเก่า",
  browHairLook: "ลักษณะขนคิ้ว",
  browHairDensity: "ความแน่นของขนคิ้ว",
  skinType: "ประเภทผิว",
  hasScar: "แผลเป็น",
  desiredArea: "จุดที่ต้องการ",
  irritation7d: "ผิวระคายเคืองบริเวณคิ้วภายใน 7 วัน",
  allergy: "อาการแพ้",
  concerns: "ปัญหาที่ลูกค้ากังวล",
  desiredFeel: "ฟีลคิ้วที่ต้องการ",
  dontWant: "สิ่งที่ไม่อยากได้เด็ดขาด",
  adjustFromLast: "สิ่งที่อยากปรับจากครั้งก่อน",
  touchupPrice: "ค่าเติมสี (บาท)"
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
        <b>${escapeHtml(visit.serviceType || "-")}</b> &nbsp;·&nbsp; ${formatDate(visit.visitDate)}
      </div>

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
  });
}
