// consentPdfHtml.js — เลย์เอาต์ใบยินยอมแบบเดียวกับ gas/PdfExport.gs / ตัวอย่าง Consent — S*.pdf
// Local: เปิด HTML แล้วพิมพ์เป็น PDF (เลย์เอาต์ถูกต้อง) — ไม่ใช้ html2pdf เพราะเพี้ยน
import { formTypeLabel, visitStatusLabel } from "./utils.js?v=20260808ao";

const CONSENT_TH =
  "ข้าพเจ้าขอยืนยันว่าได้อ่านและเข้าใจข้อมูลทั้งหมดที่ระบุในแบบฟอร์มนี้อย่างครบถ้วนแล้ว " +
  "และยินยอมให้ทาง Pyne Studio ดำเนินการบริการตามที่ระบุข้างต้น โดยได้รับคำอธิบายจากช่างผู้ให้บริการเป็นที่เรียบร้อย";

const CONSENT_EN =
  "I confirm that I have read and understood all information stated in this form and consent to the service as described above, " +
  "having received full explanation from the technician.";

function esc(value) {
  return String(value === undefined || value === null ? "" : value).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
  );
}

function val(value) {
  if (Array.isArray(value)) return value.length ? value.join(", ") : "-";
  if (value === undefined || value === null || value === "") return "-";
  if (value === "agreed") return "Agreed";
  if (value === true) return "ใช่";
  if (value === false) return "ไม่";
  return String(value);
}

function pick(...args) {
  for (const v of args) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v) && !v.length) continue;
    return v;
  }
  return "";
}

function fmtDate(value, withTime) {
  if (!value) return "-";
  const d = value instanceof Date ? value : new Date(Number(value) || value);
  if (!d || Number.isNaN(d.getTime())) return String(value);
  const opts = withTime
    ? { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }
    : { day: "numeric", month: "short", year: "numeric" };
  try {
    return new Intl.DateTimeFormat("th-TH", opts).format(d);
  } catch {
    return d.toLocaleString("th-TH");
  }
}

function kvRow(label, value, isLast) {
  const display = val(value);
  if (display === "-") return "";
  return (
    `<tr class="kv${isLast ? " last" : ""}">` +
      `<td class="k">${esc(label)}</td>` +
      `<td class="v">${esc(display)}</td>` +
    "</tr>"
  );
}

function card(rows) {
  const kept = rows.filter((r) => val(r[1]) !== "-");
  if (!kept.length) return '<div class="card"><div class="empty">—</div></div>';
  let html = "";
  kept.forEach((r, i) => {
    html += kvRow(r[0], r[1], i === kept.length - 1);
  });
  return `<div class="card"><table class="kv-table">${html}</table></div>`;
}

function sectionTitle(th, en) {
  return (
    '<div class="sec-title">' +
      '<span class="bar"></span>' +
      `<span class="sec-text">${esc(th)}` +
        (en ? ` <span class="en">· ${esc(en)}</span>` : "") +
      "</span>" +
    "</div>"
  );
}

function photoCell(url, label) {
  const src = url && String(url).indexOf("data:") === 0 ? url : (url || "");
  const inner = src
    ? `<img class="photo" src="${esc(src)}" alt="${esc(label)}">`
    : '<div class="photo-empty">ไม่มีรูป</div>';
  return (
    `<td class="photo-cell"><div class="photo-frame">${inner}` +
      `<div class="photo-tag">${esc(label)}</div></div></td>`
  );
}

function sigCell(url, caption, sub) {
  const src = url && String(url).indexOf("data:") === 0 ? url : (url || "");
  const inner = src
    ? `<img class="sig-img" src="${esc(src)}" alt="signature">`
    : '<div class="sig-empty">ยังไม่มีลายเซ็น</div>';
  return (
    `<td class="sig-cell"><div class="sig-frame">${inner}</div>` +
      '<div class="sig-line"></div>' +
      `<div class="sig-cap">${esc(caption)}</div>` +
      (sub ? `<div class="sig-sub">${esc(sub)}</div>` : "") +
    "</td>"
  );
}

function band(logoSrc) {
  return (
    '<div class="band"><table class="band-table"><tr>' +
      '<td class="logo-wrap">' +
      (logoSrc
        ? `<img class="logo" src="${esc(logoSrc)}" alt="pyne studio">`
        : '<div class="logo-fallback">pyne<span class="studio">studio</span></div>') +
      "</td>" +
      '<td class="band-title"><div class="h">CONSENT FORM</div>' +
      '<div class="s">Permanent Makeup &amp; Tattoo Studio</div></td>' +
    "</tr></table></div>"
  );
}

function metaBar(customerId, visit) {
  return (
    '<div class="meta"><table><tr>' +
      `<td><b>ID:</b> ${esc(customerId)}</td>` +
      `<td><b>Service:</b> ${esc(visit.serviceId || "-")}</td>` +
      `<td><b>Visit:</b> ${esc(fmtDate(visit.visitDate))}</td>` +
      `<td><b>Booking:</b> ${esc(visit.zervaBookingId || "-")}</td>` +
    "</tr></table></div>"
  );
}

/** สร้าง HTML ใบยินยอมเต็มเลย์เอาต์ (2 หน้า) */
export function buildConsentPdfHtml(customer, visit, options = {}) {
  const raw = visit.rawAnswers || {};
  const formLabel = formTypeLabel(visit.formType);
  const customerId = (customer && customer.customerId) || "-";
  const agreedAt = visit.consentAgreedAt || raw.agreedAt;
  const finalAgree = raw.finalAgree || raw.consentAgree;
  const exportedAt = fmtDate(Date.now(), true);
  const logoSrc = options.logoSrc || "";
  const autoPrint = options.autoPrint !== false;

  const patientCard = card([
    ["Customer ID", customerId],
    ["ชื่อ-นามสกุล", customer && customer.fullName],
    ["ชื่อเล่น", customer && customer.nickname],
    ["วันเกิด", customer && customer.dob],
    ["โทรศัพท์", customer && (customer.phoneDisplay || customer.phoneNormalized)]
  ]);

  const visitCard = card([
    ["ประเภทบริการ", visit.serviceType],
    ["ฟอร์ม", formLabel],
    ["วันนัด", fmtDate(visit.visitDate)],
    ["เวลานัด", visit.timeSlot],
    ["สถานะ", visitStatusLabel(visit.status)]
  ]);

  const consultLeft = card([
    ["ลักษณะรอยเก่าปัจจุบัน", pick(raw.oldMarkLook)],
    ["สีรอยเก่า", pick(raw.oldMarkTone)],
    ["จุดที่ต้องการแก้ไข", pick(raw.fixPoints, raw.changeItems)],
    ["แผลเป็น", pick(raw.hasScar, raw.scarCause)],
    ["จุดที่ต้องการ", pick(raw.desiredArea, raw.concerns)]
  ]);

  const consultRight = card([
    ["แพ้ / ข้อมูลสำคัญ", pick(raw.allergyInfo, raw.allergyDetail)],
    ["ภาพรวมที่ต้องการ", pick(raw.desiredOverview, raw.desiredFeel)],
    ["สิ่งที่ไม่อยากได้", pick(raw.notWanted, raw.dontWant)],
    ["สีที่เลือก", pick(visit.colorUsed, raw.colorChoice)]
  ]);

  const rxLeft = card([
    ["Technique", pick(visit.technique, raw.technique)],
    ["Color", pick(visit.colorUsed, raw.colorChoice)],
    ["Intensity", pick(visit.intensity, raw.intensity)],
    ["Muscle", pick(visit.muscle, raw.muscle)],
    ["Shape Design", pick(visit.shapeDesign, raw.shapeDesign)]
  ]);

  const rxRight = card([
    ["Brow Guard", pick(visit.browGuard, raw.browGuard)],
    ["Change Items", pick(visit.changeItems, raw.changeItems)],
    ["Mix Ratio", pick(visit.mixRatio, raw.mixRatio)],
    ["Redness", pick(visit.redness, raw.redness)],
    ["Adherence", pick(visit.adherence, raw.adherence)]
  ]);

  const custName = (customer && (customer.nickname || customer.fullName)) || "";
  const techName = "ชนิสตา ศุภสุข";
  const agreedLabel = finalAgree ? val(finalAgree) : (visit.signatureCustomerUrl ? "Agreed" : "-");

  return [
    "<!doctype html><html><head><meta charset=\"utf-8\">",
    "<title>Consent — ", esc(visit.serviceId || customerId), "</title>",
    "<style>",
    "#pyne-consent-pdf{width:794px;margin:0;padding:0;color:#261F1C;font-family:Arial,'Noto Sans Thai',sans-serif;font-size:11px;line-height:1.45;background:#fff;}",
    "#pyne-consent-pdf *,#pyne-consent-pdf *::before,#pyne-consent-pdf *::after{box-sizing:border-box;}",
    "#pyne-consent-pdf .page{padding:0 0 18px;width:794px;background:#fff;}",
    "#pyne-consent-pdf .band{background:#5E4737;color:#fff;padding:18px 28px;}",
    "#pyne-consent-pdf .band-table{width:100%;border-collapse:collapse;table-layout:fixed;}",
    "#pyne-consent-pdf .band-table td{vertical-align:middle;padding:0;}",
    "#pyne-consent-pdf .logo-wrap{width:42%;}",
    "#pyne-consent-pdf .logo{height:42px;width:auto;display:block;}",
    "#pyne-consent-pdf .logo-fallback{font-size:28px;font-weight:600;letter-spacing:.02em;}",
    "#pyne-consent-pdf .logo-fallback .studio{display:block;font-size:14px;font-style:italic;font-weight:400;margin-top:2px;opacity:.92;}",
    "#pyne-consent-pdf .band-title{text-align:right;}",
    "#pyne-consent-pdf .band-title .h{font-size:22px;font-weight:700;letter-spacing:.06em;line-height:1.1;}",
    "#pyne-consent-pdf .band-title .s{font-size:11px;opacity:.92;margin-top:4px;}",
    "#pyne-consent-pdf .meta{background:#F0ECE4;padding:10px 28px;color:#5E4737;font-size:11px;}",
    "#pyne-consent-pdf .meta table{width:100%;border-collapse:collapse;table-layout:fixed;}",
    "#pyne-consent-pdf .meta td{padding:0;}",
    "#pyne-consent-pdf .meta b{font-weight:700;}",
    "#pyne-consent-pdf .content{padding:18px 28px 8px;}",
    "#pyne-consent-pdf .sec-title{margin:16px 0 8px;}",
    "#pyne-consent-pdf .sec-title .bar{display:inline-block;width:4px;height:14px;background:#5E4737;vertical-align:middle;margin-right:8px;border-radius:1px;}",
    "#pyne-consent-pdf .sec-title .sec-text{font-size:12px;font-weight:700;color:#5E4737;vertical-align:middle;}",
    "#pyne-consent-pdf .sec-title .en{font-weight:600;color:#866957;}",
    "#pyne-consent-pdf .cols{width:100%;border-collapse:separate;border-spacing:12px 0;margin:0 0 4px;table-layout:fixed;}",
    "#pyne-consent-pdf .cols>tbody>tr>td,#pyne-consent-pdf .cols>tr>td{width:50%;vertical-align:top;}",
    "#pyne-consent-pdf .card{background:#F7F4EF;border:1px solid #E6E0D6;border-radius:10px;padding:4px 0;min-height:72px;}",
    "#pyne-consent-pdf .kv-table{width:100%;border-collapse:collapse;table-layout:fixed;}",
    "#pyne-consent-pdf .kv td{padding:8px 14px;border-bottom:1px solid #E6E0D6;vertical-align:top;}",
    "#pyne-consent-pdf .kv.last td{border-bottom:none;}",
    "#pyne-consent-pdf .k{width:42%;color:#866957;font-weight:500;text-align:left;}",
    "#pyne-consent-pdf .v{text-align:right;color:#261F1C;font-weight:600;}",
    "#pyne-consent-pdf .empty{padding:16px;color:#866957;text-align:center;}",
    "#pyne-consent-pdf .photo-frame{background:#F7F4EF;border:1px solid #E6E0D6;border-radius:12px;height:210px;overflow:hidden;text-align:center;}",
    "#pyne-consent-pdf .photo{max-width:100%;max-height:180px;}",
    "#pyne-consent-pdf .photo-empty{padding-top:70px;color:#866957;}",
    "#pyne-consent-pdf .photo-tag{display:inline-block;margin-top:8px;background:#5E4737;color:#fff;font-size:10px;font-weight:700;letter-spacing:.04em;padding:4px 14px;border-radius:999px;}",
    "#pyne-consent-pdf .agree-box{background:#F7F4EF;border:1px solid #E6E0D6;border-radius:10px;padding:14px 16px;color:#261F1C;}",
    "#pyne-consent-pdf .agree-box .en{margin-top:8px;color:#866957;font-size:10px;}",
    "#pyne-consent-pdf .status-grid{width:100%;border-collapse:collapse;margin-top:10px;border:1px solid #E6E0D6;border-radius:8px;table-layout:fixed;}",
    "#pyne-consent-pdf .status-grid th,#pyne-consent-pdf .status-grid td{border:1px solid #E6E0D6;padding:8px 10px;text-align:center;}",
    "#pyne-consent-pdf .status-grid th{background:#F0ECE4;color:#866957;font-weight:600;font-size:10px;}",
    "#pyne-consent-pdf .status-grid td{font-weight:600;}",
    "#pyne-consent-pdf .sig-frame{border:1.5px dashed #C9BFB2;border-radius:10px;height:110px;background:#fff;text-align:center;overflow:hidden;}",
    "#pyne-consent-pdf .sig-img{max-height:110px;max-width:100%;}",
    "#pyne-consent-pdf .sig-empty{padding-top:44px;color:#866957;}",
    "#pyne-consent-pdf .sig-line{border-top:1px solid #C9BFB2;margin:10px 8px 6px;}",
    "#pyne-consent-pdf .sig-cap{text-align:center;font-weight:600;color:#5E4737;}",
    "#pyne-consent-pdf .sig-sub{text-align:center;color:#866957;font-size:10px;margin-top:2px;}",
    "#pyne-consent-pdf .confidential{background:#F0ECE4;color:#866957;font-size:10px;padding:10px 28px;margin-top:18px;}",
    "#pyne-consent-pdf .footer{padding:8px 28px 0;color:#A3988C;font-size:10px;}",
    "#pyne-consent-pdf .footer table{width:100%;border-collapse:collapse;}",
    "#pyne-consent-pdf .pagebreak{page-break-before:always;}",
    "@page{size:A4;margin:8mm;}",
    "@media print{body{margin:0;}#pyne-consent-pdf .pagebreak{break-before:page;page-break-before:always;}}",
    "</style></head><body>",

    '<div id="pyne-consent-pdf">',

    '<div class="page">',
    band(logoSrc),
    metaBar(customerId, visit),
    '<div class="content">',
    '<table class="cols"><tr>',
    "<td>" + sectionTitle("ข้อมูลลูกค้า", "PATIENT") + patientCard + "</td>",
    "<td>" + sectionTitle("ข้อมูลการนัด", "VISIT") + visitCard + "</td>",
    "</tr></table>",
    sectionTitle("ข้อมูลประกอบ", "CONSULTATION NOTES"),
    '<table class="cols"><tr>',
    "<td>" + consultLeft + "</td>",
    "<td>" + consultRight + "</td>",
    "</tr></table>",
    sectionTitle("สรุปบริการ", "SERVICE PRESCRIPTION"),
    '<table class="cols"><tr>',
    "<td>" + rxLeft + "</td>",
    "<td>" + rxRight + "</td>",
    "</tr></table>",
    "</div>",
    '<div class="footer"><table><tr>',
    `<td>Generated by Pyne Studio CRM · ${esc(exportedAt)}</td>`,
    '<td style="text-align:right">หน้า 1 / 2</td>',
    "</tr></table></div>",
    "</div>",

    '<div class="page pagebreak">',
    band(logoSrc),
    metaBar(customerId, visit),
    '<div class="content">',
    sectionTitle("รูปภาพก่อน-หลัง", "BEFORE & AFTER"),
    '<table class="cols"><tr>',
    photoCell(visit.beforePhotoUrl || visit.existingBeforePhotoUrl, "BEFORE"),
    photoCell(visit.afterPhotoUrl || visit.existingAfterPhotoUrl, "AFTER"),
    "</tr></table>",
    sectionTitle("ใบยินยอม", "CONSENT AGREEMENT"),
    '<div class="agree-box">' +
      `<div>${esc(CONSENT_TH)}</div>` +
      `<div class="en">${esc(CONSENT_EN)}</div>` +
    "</div>",
    '<table class="status-grid"><tr>',
    "<th>วันเวลาที่ยินยอม</th><th>ผลการยินยอม</th><th>ลายเซ็นลูกค้า</th><th>ลายเซ็นช่าง</th>",
    "</tr><tr>",
    `<td>${esc(fmtDate(agreedAt, true))}</td>`,
    `<td>${esc(agreedLabel)}</td>`,
    `<td>${visit.signatureCustomerUrl ? "Signed ✓" : "-"}</td>`,
    `<td>${visit.signatureTechUrl ? "Signed ✓" : "-"}</td>`,
    "</tr></table>",
    sectionTitle("ลายเซ็นรับรอง", "AUTHORIZED SIGNATURES"),
    '<table class="cols"><tr>',
    sigCell(
      visit.signatureCustomerUrl || visit.existingSignatureCustomerUrl,
      "ลายเซ็นลูกค้า",
      custName + (agreedAt ? " · " + fmtDate(agreedAt, true) : "")
    ),
    sigCell(visit.signatureTechUrl, "ลายเซ็นช่าง", techName),
    "</tr></table>",
    "</div>",
    '<div class="confidential">เอกสารนี้เป็นความลับและใช้สำหรับบันทึกการให้บริการภายใน Pyne Studio เท่านั้น · This document is confidential and for internal Pyne Studio service records only.</div>',
    '<div class="footer"><table><tr>',
    `<td>Generated by Pyne Studio CRM · ${esc(exportedAt)}</td>`,
    '<td style="text-align:right">หน้า 2 / 2</td>',
    "</tr></table></div>",
    "</div>",

    "</div>",

    autoPrint
      ? '<script>window.addEventListener("load",function(){setTimeout(function(){window.print();},300);});</script>'
      : "",

    "</body></html>"
  ].join("");
}

/** โหลดโลโก้เป็น data URI ให้ฝังใน HTML ใบยินยอมได้แน่นอน */
export async function loadLogoDataUri() {
  try {
    const res = await fetch(new URL("assets/pyne-logo.png", window.location.href).href);
    if (!res.ok) return "";
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return "";
  }
}