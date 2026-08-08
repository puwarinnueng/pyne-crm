export function formatDate(ts) {
  if (!ts) return "-";
  const d = new Date(ts);
  const months = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
  const buddhistYear = d.getFullYear() + 543;
  return `${d.getDate()} ${months[d.getMonth()]} ${buddhistYear}`;
}

// วันที่แบบสั้น YYYY-MM-DD ใช้ในตาราง Customers (ตรงตามสไตล์ตัวอย่างที่ร้านส่งมา)
export function formatDateShort(ts) {
  if (!ts) return "-";
  const d = new Date(ts);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

export function normalizeVisitStatus(status) {
  const key = String(status || "").trim();
  if (key === "กำลังดำเนินการ") return "in_progress";
  if (key === "เสร็จสิ้น") return "completed";
  if (key === "ไม่ได้รับบริการ") return "not_served";
  return key;
}

export function visitStatusLabel(status) {
  const key = normalizeVisitStatus(status);
  if (key === "draft") return "แบบร่าง";
  if (key === "in_progress") return "ทำค้างไว้";
  if (key === "completed") return "เสร็จแล้ว";
  if (key === "not_served") return "ไม่ได้รับบริการ";
  return key || "";
}

/** ค่าตัวเลือกที่ต้องเปิดช่องกรอกรายละเอียด (สเปก: อื่น ๆ / จุดอื่น ๆ) */
export function isOtherOption(opt) {
  return opt === "Other" || opt === "จุดอื่นๆ" || opt === "จุดอื่น ๆ" || opt === "อื่นๆ" || opt === "อื่น ๆ";
}

export function selectionIncludesOther(selected) {
  const arr = Array.isArray(selected) ? selected : selected != null ? [selected] : [];
  return arr.some(isOtherOption);
}

export function optionDisplayLabel(opt) {
  if (opt === "Other" || opt === "อื่นๆ") return "อื่น ๆ";
  return opt;
}

/** Form 3 — ค่า sentinel เมื่อเลือกใช้ข้อมูลครั้งเดิม */
export const TOUCHUP_ORIGINAL = {
  technique: "เทคนิคเดิม",
  shape: "ทรงเดิม",
  color: "สีเดิม"
};

export function resolveTouchupTechnique(draft) {
  if (!draft) return null;
  if (draft.technique === TOUCHUP_ORIGINAL.technique) {
    return draft.prevTechnique || null;
  }
  return draft.technique || null;
}

export function resolveTouchupShape(draft) {
  if (!draft) return null;
  if (draft.shapeDesign === "Other" || isOtherOption(draft.shapeDesign)) {
    return draft.shapeDesignOther || "อื่น ๆ";
  }
  if (draft.shapeDesign === TOUCHUP_ORIGINAL.shape) {
    return draft.prevShapeDesign || null;
  }
  return draft.shapeDesign || null;
}

export function resolveTouchupColor(draft) {
  if (!draft) return null;
  if (draft.colorChoice === TOUCHUP_ORIGINAL.color) {
    return draft.prevColorUsed || null;
  }
  return draft.colorChoice || null;
}

export function visitStatusBadgeClass(status) {
  const key = normalizeVisitStatus(status);
  if (key === "completed") return "is-completed";
  if (key === "not_served") return "is-not-served";
  if (key === "draft") return "is-draft";
  if (key === "in_progress") return "is-in-progress";
  return "";
}

export function isResumableVisitStatus(status) {
  return ["draft", "in_progress"].includes(normalizeVisitStatus(status));
}

export function isCompletedVisitStatus(status) {
  return normalizeVisitStatus(status) === "completed";
}

export function isCompletedBrowVisit(visit) {
  return Boolean(
    visit &&
    visit.serviceType === "สักคิ้ว" &&
    isCompletedVisitStatus(visit.status) &&
    (visit.technique || visit.colorUsed || visit.beforePhotoUrl || visit.afterPhotoUrl)
  );
}

/** เปิด/ดาวน์โหลดไฟล์จาก URL (blob หรือ https) — ใช้แทน window.open หลัง await เพื่อกันโดนบล็อก/about:blank */
export function openExportFile(url, filename, opts = {}) {
  if (!url) return false;
  const a = document.createElement("a");
  a.href = url;
  const forceDownload = opts.download === true || (filename && /\.pdf$/i.test(filename) && opts.preview !== true);
  if (forceDownload && filename) {
    a.download = filename;
  } else {
    a.target = "_blank";
    a.rel = "noopener";
  }
  document.body.appendChild(a);
  a.click();
  a.remove();
  return true;
}

// unique key ต่อ visit หนึ่งครั้ง ใช้กันชื่อ Drive folder ชนกันเมื่อลูกค้าคนเดียวกันมีหลาย visit วันเดียวกัน
// สร้างครั้งแรกที่เรียกแล้ว cache ไว้ใน draft — เรียกซ้ำได้ค่าเดิมตลอดวงจรชีวิตของ visit นั้น
export function ensureVisitSessionKey(draft) {
  if (!draft.visitSessionKey) {
    const d = new Date();
    const p = (n) => String(n).padStart(2, "0");
    draft.visitSessionKey = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
  }
  return draft.visitSessionKey;
}

export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function photoKeyName(key) {
  return key ? key.charAt(0).toUpperCase() + key.slice(1) : "";
}

export function existingPhotoKey(key) {
  return `existing${photoKeyName(key)}PhotoUrl`;
}

export function draftPhotoUrl(draft, key) {
  return draft?.[key + "PhotoDataUrl"] || draft?.[existingPhotoKey(key)] || "";
}

export function hasDraftPhoto(draft, key) {
  return Boolean(draftPhotoUrl(draft, key));
}

export function formTypeLabel(formType) {
  const key = String(formType || "").trim();
  if (key === "form1") return "สักคิ้วครั้งแรก";
  if (key === "form2") return "ปิดงานเก่า";
  if (key === "form3") return "เติมสี";
  return "";
}
