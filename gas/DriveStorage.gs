/**
 * DriveStorage.gs — อัปโหลดรูป/ลายเซ็นเข้า Google Drive
 * โครงสร้างโฟลเดอร์: [DRIVE_ROOT]/{เบอร์โทรปกติ}_{ชื่อ}/{visitKey}_{ประเภทบริการ}/{filename}
 *
 * ใช้เบอร์โทร (ไม่ใช่ CustomerID) เป็น key ของ customer folder โดยตั้งใจ — เบอร์โทรรู้ค่าได้ทันที
 * ตั้งแต่หน้ากรอกฟอร์ม (ก่อนสร้างลูกค้าจริงด้วยซ้ำ) ต่างจาก CustomerID ที่ต้องรอสร้างลูกค้าเสร็จก่อน
 * ทำให้ client เรียก createCustomer() พร้อมกับ ensureVisitFolder() ได้เลยโดยไม่ต้องรอกัน (เร็วขึ้น ~1
 * round-trip) แล้วค่อยเรียก uploadImage() ทุกไฟล์แบบขนานเต็มที่โดยใช้ folderId ที่ resolve ไว้แล้ว
 * ผลข้างเคียงที่รู้และยอมรับแล้ว: ลูกค้าเก่าที่มี folder ชื่อ CustomerID (เช่น C0001_...) จากก่อนเปลี่ยนมาใช้
 * scheme นี้ วิสิตใหม่จะไปสร้าง folder ชื่อเบอร์โทรแยกต่างหาก ไม่ต่อเนื่องกับของเก่า
 */

function getOrCreateSubfolder_(parent, name) {
  const existing = parent.getFoldersByName(name);
  if (existing.hasNext()) return { folder: existing.next(), isNew: false };
  return { folder: parent.createFolder(name), isNew: true };
}

function sanitizeFolderName_(name) {
  return String(name || "").replace(/[\\/:*?"<>|]/g, "_").trim() || "unnamed";
}

function todayDateString_() {
  return Utilities.formatDate(new Date(), "Asia/Bangkok", "yyyy-MM-dd");
}

function dataUrlToBlob_(dataUrl, filename) {
  const match = /^data:(.+);base64,(.*)$/.exec(dataUrl);
  if (!match) throw new Error("Invalid data URL");
  const contentType = match[1];
  const base64 = match[2];
  return Utilities.newBlob(Utilities.base64Decode(base64), contentType, filename);
}

/**
 * ensureVisitFolder(meta) — หา/สร้าง visit folder ครั้งเดียว คืน folderId ให้ client เอาไปใช้กับ
 * uploadImage() ทุกไฟล์ในวิสิตเดียวกันได้เลยแบบขนานเต็มที่ (ไม่มี race เพราะ folder ถูก resolve
 * เสร็จสมบูรณ์ก่อนไฟล์ไหนจะเริ่มเขียนด้วยซ้ำ) เรียกพร้อมกับ createCustomer() ได้เลยไม่ต้องรอกัน
 * meta: { customerPhone, customerName, serviceType, visitKey }
 */
function ensureVisitFolder(token, meta) {
  requireSession_(token);
  meta = meta || {};
  const root = getDriveRootFolder_();
  // normalizePhone (มาจาก Customers.gs) กัน format เบอร์ไม่ตรงกันระหว่างที่ส่งมาแบบ raw (ลูกค้าใหม่)
  // กับที่ normalize ไว้แล้ว (ลูกค้าเก่า) ให้ได้ folder เดียวกันเสมอสำหรับเบอร์เดียวกัน
  const customerFolderName = sanitizeFolderName_(
    (normalizePhone(meta.customerPhone) || "unknown") + "_" + (meta.customerName || "")
  );
  // meta.visitKey (ส่งมาจาก client, unique ต่อ visit) กันชื่อ folder ชนกันเมื่อลูกค้าคนเดียวกัน
  // มีหลาย visit วันเดียวกัน + ประเภทบริการเดียวกัน — ถ้าไม่มีส่งมา fallback เป็นวันที่เฉยๆ เหมือนเดิม
  const visitFolderName = sanitizeFolderName_((meta.visitKey || todayDateString_()) + "_" + (meta.serviceType || ""));

  const customerFolder = getOrCreateSubfolder_(root, customerFolderName).folder;
  const visitFolderResult = getOrCreateSubfolder_(customerFolder, visitFolderName);
  const visitFolder = visitFolderResult.folder;

  // แชร์ระดับโฟลเดอร์ครั้งเดียวตอนสร้างใหม่เท่านั้น — ไฟล์ข้างในจะ inherit สิทธิ์ "anyone with link"
  // จากโฟลเดอร์แม่ต่ออัตโนมัติ ไม่ต้องเรียก setSharing() ทีละไฟล์ (Drive API call ที่ค่อนข้างช้า)
  if (visitFolderResult.isNew) {
    visitFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  }

  return { success: true, folderId: visitFolder.getId() };
}

/**
 * uploadImage(dataUrl, meta)
 * meta: { folderId, filename } — folderId มาจาก ensureVisitFolder() เสมอ (resolve มาแล้วครั้งเดียว
 * ก่อนหน้านี้) จึงเขียนไฟล์ตรงๆ ได้เลยแบบขนานหลายไฟล์พร้อมกันโดยไม่มี race เพราะไม่ต้องหา/สร้างโฟลเดอร์ซ้ำ
 */
function uploadImage(token, dataUrl, meta) {
  requireSession_(token);
  meta = meta || {};
  const filename = meta.filename || ("file_" + Date.now());
  const blob = dataUrlToBlob_(dataUrl, filename);

  const visitFolder = DriveApp.getFolderById(meta.folderId);
  const file = visitFolder.createFile(blob);

  // file.getUrl() คืนหน้า viewer HTML (…/file/d/ID/view) ใช้เป็น <img src> ตรงๆ ไม่ได้
  // ต้องใช้ endpoint thumbnail ที่ Google รองรับให้ embed เป็นรูปได้จริง
  return { success: true, url: "https://drive.google.com/thumbnail?id=" + file.getId() + "&sz=w1000" };
}
