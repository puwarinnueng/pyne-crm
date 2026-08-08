// visitDetail.js — read-only visit details (opened from customer profile)

import { onEnter } from "../router.js?v=20260808ag";
import { formatDate, escapeHtml, formTypeLabel, isCompletedVisitStatus, visitStatusLabel, isOtherOption, optionDisplayLabel, openExportFile } from "../utils.js?v=20260808ao";
import { enrichVisitForDisplay } from "../formWizard.js?v=20260808ag";
import { exportConsentPdf } from "../mockApi.js?v=20260808ao";
import { appAlert } from "../dialogs.js?v=20260808ag";
import { withIcon } from "../icons.js?v=20260808ag";

const SKIP_RAW_KEYS = new Set([
  "formStepIndex",
  "visitSessionKey",
  "beforePhotoDataUrl",
  "afterPhotoDataUrl",
  "signatureCustomerDataUrl",
  "existingBeforePhotoUrl",
  "existingAfterPhotoUrl",
  "existingSignatureCustomerUrl",
  "mixRatioParts"
]);

/** Form fields grouped for display — covers Form 1 / 2 / 3 + post-service */
const DETAIL_SECTIONS = [
  {
    title: "เช็คสุขภาพ",
    fields: [
      ["hasScar", "แผลเป็นบริเวณคิ้ว"],
      ["scarCause", "สาเหตุแผล"],
      ["scarCauseOther", "สาเหตุแผล (อื่น ๆ)"],
      ["irritation7d", "ระคายเคืองใน 7 วัน"],
      ["irritationDetail", "รายละเอียดระคายเคือง"],
      ["allergyInfo", "แพ้ / ข้อมูลสำคัญ"],
      ["allergyDetail", "รายละเอียดการแพ้"]
    ]
  },
  {
    title: "ความต้องการ",
    fields: [
      ["hadBrowBefore", "เคยสักคิ้วมาก่อน"],
      ["oldMarkLook", "ลักษณะงานเก่า"],
      ["oldMarkLookOther", "ลักษณะงานเก่า (อื่น ๆ)"],
      ["oldMarkTone", "โทนงานเก่า"],
      ["oldMarkToneOther", "โทนงานเก่า (อื่น ๆ)"],
      ["fixPoints", "จุดที่อยากแก้"],
      ["fixPointsOther", "จุดที่อยากแก้ (อื่น ๆ)"],
      ["concerns", "กังวลหลัก"],
      ["concernsOther", "กังวล (อื่น ๆ)"],
      ["desiredOverview", "ลุคที่อยากได้"],
      ["desiredOverviewOther", "ลุคที่อยากได้ (อื่น ๆ)"],
      ["desiredFeel", "ความรู้สึกที่อยากได้"],
      ["desiredArea", "บริเวณที่อยากได้"],
      ["notWanted", "สิ่งที่ไม่ต้องการ"],
      ["notWantedOther", "สิ่งที่ไม่ต้องการ (อื่น ๆ)"],
      ["dontWant", "สิ่งที่ไม่ต้องการ"],
      ["adjustFromLast", "ปรับจากครั้งก่อน"],
      ["satisfaction", "ความพึงพอใจหลังลอก"],
      ["colorRetention", "สีติดอยู่"],
      ["wantsMoreChange", "อยากปรับเพิ่ม"],
      ["changeItems", "สิ่งที่อยากปรับ"],
      ["changeItemsOther", "สิ่งที่อยากปรับ (อื่น ๆ)"],
      ["colorChoice", "สีที่เลือก"],
      ["intensity", "ความเข้มเป้าหมาย"],
      ["touchupPrice", "ราคาเติมสี"]
    ]
  },
  {
    title: "ออกแบบ",
    fields: [
      ["technique", "เทคนิค"],
      ["prevTechnique", "เทคนิคครั้งก่อน"],
      ["muscle", "กล้ามเนื้อคิ้ว"],
      ["muscleNote", "โน้ตกล้ามเนื้อ"],
      ["shapeDesign", "ทรงที่ออกแบบ"],
      ["shapeDesignOther", "ทรง (อื่น ๆ)"],
      ["shapeDesignNote", "โน้ตทรง"],
      ["prevShapeDesign", "ทรงครั้งก่อน"],
      ["browGuard", "บราวการ์ด"],
      ["prevColorUsed", "สีครั้งก่อน"]
    ]
  },
  {
    title: "Consent",
    fields: [
      ["customerInfoConfirmed", "ยืนยันข้อมูลลูกค้า"],
      ["preServiceAgree", "ยินยอมก่อนทำ"],
      ["finalAgree", "ยินยอมสุดท้าย"],
      ["agreedAt", "เซ็นเมื่อ"]
    ]
  },
  {
    title: "หลังทำ",
    fields: [
      ["redness", "แดงของผิว"],
      ["adherence", "สีติด"]
    ]
  }
];

function hasValue(v) {
  if (v === undefined || v === null || v === "") return false;
  if (Array.isArray(v) && v.length === 0) return false;
  return true;
}

function fmtValue(v) {
  if (Array.isArray(v)) return v.length ? v.join(", ") : "-";
  if (v === true) return "ใช่";
  if (v === false) return "ไม่";
  if (v === "agreed") return "ยินยอม";
  if (typeof v === "number" && v > 1e11) return formatDate(v);
  if (v === undefined || v === null || v === "") return "-";
  if (typeof v === "object") {
    try { return JSON.stringify(v); } catch (e) { return String(v); }
  }
  return String(v);
}

function displayField(raw, key) {
  let value = raw[key];
  if (!hasValue(value)) return null;

  if (Array.isArray(value)) {
    value = value.map((item) => {
      if (!isOtherOption(item)) return item;
      const other = raw[key + "Other"];
      return hasValue(other) ? other : optionDisplayLabel(item);
    });
  } else if (isOtherOption(value)) {
    const other = raw[key + "Other"];
    if (hasValue(other)) value = other;
    else value = optionDisplayLabel(value);
  }
  return value;
}

function row(label, value) {
  if (!hasValue(value)) return "";
  return `
    <div class="detail-row">
      <div class="detail-label">${escapeHtml(label)}</div>
      <div class="detail-value">${escapeHtml(fmtValue(value))}</div>
    </div>`;
}

function photoBox(url, emptyLabel = "ไม่มีรูป") {
  return `<div class="photo-slot">${url ? `<img src="${escapeHtml(url)}" alt="">` : `<span class="muted small">${escapeHtml(emptyLabel)}</span>`}</div>`;
}

function sectionHtml(title, rowsHtml) {
  if (!rowsHtml) return "";
  return `
    <div class="step-group">
      <div class="step-group-title">${escapeHtml(title)}</div>
      <div class="box-quiet">${rowsHtml}</div>
    </div>`;
}

function firstValue(...candidates) {
  for (const v of candidates) {
    if (hasValue(v)) return v;
  }
  return null;
}

function formatMixRatioParts(parts) {
  if (!parts || typeof parts !== "object") return null;
  const entries = Object.entries(parts).filter(([, n]) => Number(n) > 0);
  if (!entries.length) return null;
  return entries.map(([color, n]) => `${color} ${n}`).join(" · ");
}

function sectionRows(raw, fields) {
  return fields.map(([key, label]) => row(label, displayField(raw, key))).join("");
}

const EXPORT_BTN_IDLE = withIcon("file", "ใบยินยอม PDF");

export function initVisitDetail() {
  const body = document.getElementById("visitDetailBody");
  const exportBtn = document.getElementById("visitExportPdfBtn");

  async function handleExportPdf(visit, btn) {
    const idle = btn.innerHTML;
    btn.disabled = true;
    btn.textContent = "กำลังสร้าง PDF...";
    try {
      const res = await exportConsentPdf(visit.serviceId);
      if (res && res.success && (res.downloadUrl || res.url)) {
        openExportFile(res.downloadUrl || res.url, res.filename || "consent.pdf", { preview: Boolean(res.preview) });
        await appAlert(res.note || "เปิดหน้าต่างพิมพ์แล้ว — เลือก Save as PDF", {
          title: "ส่งออก PDF",
          okText: "ตกลง"
        });
        return;
      }
      await appAlert((res && (res.note || res.error)) || "สร้าง PDF ไม่สำเร็จ", { title: "ส่งออก PDF" });
    } catch (err) {
      await appAlert(`สร้าง PDF ไม่สำเร็จ — ${err.message || err}`, { title: "ส่งออก PDF" });
    } finally {
      btn.disabled = false;
      btn.innerHTML = idle;
    }
  }

  onEnter("visitDetail", (visit) => {
    if (exportBtn) {
      exportBtn.hidden = true;
      exportBtn.disabled = false;
      exportBtn.innerHTML = EXPORT_BTN_IDLE;
      exportBtn.onclick = null;
    }

    if (!visit) {
      body.innerHTML = `<div class="empty-hint">ไม่พบคิวนี้</div>`;
      return;
    }
    visit = enrichVisitForDisplay(visit);
    const raw = (visit.rawAnswers && typeof visit.rawAnswers === "object") ? visit.rawAnswers : {};

    const metaRows = [
      row("สถานะ", visitStatusLabel(visit.status) || visit.status),
      row("รหัสคิว", visit.serviceId),
      row("รหัสจอง Zerva", visit.zervaBookingId),
      row("นัดหมาย", visit.visitDate ? `${formatDate(visit.visitDate)}${visit.timeSlot ? ` ${visit.timeSlot}` : ""}` : null),
      row("บริการ", visit.serviceType),
      row("ฟอร์ม", formTypeLabel(visit.formType)),
      visit.notServedReason ? row("เหตุผลที่ไม่ได้รับบริการ", visit.notServedReason) : ""
    ].join("");

    const summaryRows = [
      row("เทคนิค", firstValue(visit.technique, displayField(raw, "technique"), raw.prevTechnique)),
      row("สีที่ใช้", firstValue(visit.colorUsed, displayField(raw, "colorChoice"), raw.prevColorUsed)),
      row("ความเข้ม", firstValue(visit.intensity, displayField(raw, "intensity"))),
      row("กล้ามเนื้อคิ้ว", firstValue(visit.muscle, displayField(raw, "muscle"))),
      row("โน้ตกล้ามเนื้อ", displayField(raw, "muscleNote")),
      row("ทรง", firstValue(visit.shapeDesign, displayField(raw, "shapeDesign"), raw.prevShapeDesign)),
      row("โน้ตทรง", displayField(raw, "shapeDesignNote")),
      row("บราวการ์ด", firstValue(visit.browGuard, displayField(raw, "browGuard"))),
      row("อัตราส่วนสี", firstValue(visit.mixRatio, formatMixRatioParts(raw.mixRatioParts))),
      row("ผิวแดง", firstValue(visit.redness, displayField(raw, "redness"))),
      row("สีติด", firstValue(visit.adherence, displayField(raw, "adherence"))),
      row("ความพึงพอใจ", firstValue(visit.satisfaction, displayField(raw, "satisfaction"))),
      row("สีติดอยู่", firstValue(visit.colorRetention, displayField(raw, "colorRetention"))),
      row("อยากปรับเพิ่ม", firstValue(visit.wantsMoreChange, displayField(raw, "wantsMoreChange"))),
      row("สิ่งที่อยากปรับ", firstValue(visit.changeItems, displayField(raw, "changeItems"))),
      row("วิเคราะห์ช่าง", visit.analysis),
      row("โน้ต", visit.note)
    ].join("");

    const formSections = DETAIL_SECTIONS.map((section) =>
      sectionHtml(section.title, sectionRows(raw, section.fields))
    ).join("");

    const knownKeys = new Set(DETAIL_SECTIONS.flatMap((s) => s.fields.map(([k]) => k)));
    const extraRows = Object.keys(raw)
      .filter((key) =>
        !SKIP_RAW_KEYS.has(key) &&
        !knownKeys.has(key) &&
        !key.endsWith("Other") &&
        !/photo|signature|Signature/i.test(key)
      )
      .filter((key) => hasValue(raw[key]))
      .map((key) => row(key, displayField(raw, key)))
      .join("");

    const beforeUrl = visit.beforePhotoUrl || raw.existingBeforePhotoUrl;
    const afterUrl = visit.afterPhotoUrl || raw.existingAfterPhotoUrl;
    const sigUrl = visit.signatureCustomerUrl || raw.existingSignatureCustomerUrl;
    const hasPhotos = Boolean(beforeUrl || afterUrl);
    const hasSig = Boolean(sigUrl);

    body.innerHTML = `
      <div class="box-quiet">
        <b>${escapeHtml(visit.serviceType || formTypeLabel(visit.formType) || "คิว")}</b>
        ${formTypeLabel(visit.formType) ? ` &nbsp;·&nbsp; ${escapeHtml(formTypeLabel(visit.formType))}` : ""}
        &nbsp;·&nbsp; ${escapeHtml(formatDate(visit.visitDate))}
      </div>

      ${sectionHtml("ข้อมูลคิว", metaRows)}
      ${sectionHtml("สรุปงาน", summaryRows)}

      ${formSections}
      ${extraRows ? sectionHtml("คำตอบอื่น ๆ", extraRows) : ""}

      ${hasPhotos ? `
      <div class="step-group">
        <div class="step-group-title">รูปก่อน / หลัง</div>
        <div class="photo-row">
          ${photoBox(beforeUrl, "ยังไม่มีรูปก่อน")}
          ${photoBox(afterUrl, "ยังไม่มีรูปหลัง")}
        </div>
      </div>` : ""}

      ${hasSig || hasPhotos ? `
      <div class="step-group">
        <div class="step-group-title">ลายเซ็น</div>
        <div class="photo-row">
          <div class="photo-slot photo-slot-sig">${sigUrl
            ? `<img src="${escapeHtml(sigUrl)}" alt="ลายเซ็นลูกค้า">`
            : `<span class="muted small">ยังไม่มีลายเซ็นลูกค้า</span>`}</div>
          <div class="photo-slot photo-slot-sig"><span class="muted small">(ชนิสตา ศุภสุข)</span></div>
        </div>
      </div>` : ""}
    `;

    if (exportBtn && isCompletedVisitStatus(visit.status)) {
      exportBtn.hidden = false;
      exportBtn.onclick = () => handleExportPdf(visit, exportBtn);
    }
  });
}
