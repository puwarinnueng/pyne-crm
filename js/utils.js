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

export function isCompletedVisitStatus(status) {
  return ["เสร็จสิ้น", "completed"].includes(String(status || "").trim());
}

export function isCompletedBrowVisit(visit) {
  return Boolean(
    visit &&
    visit.serviceType === "สักคิ้ว" &&
    isCompletedVisitStatus(visit.status) &&
    (visit.technique || visit.colorUsed || visit.beforePhotoUrl || visit.afterPhotoUrl)
  );
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
