/**
 * DriveStorage.gs — อัปโหลดรูป/ลายเซ็นเข้า Google Drive
 * โครงสร้างโฟลเดอร์: [DRIVE_ROOT]/{CustomerID}_{ชื่อ}/{วันที่}_{ประเภทบริการ}/{filename}
 */

function getOrCreateSubfolder_(parent, name) {
  const existing = parent.getFoldersByName(name);
  if (existing.hasNext()) return existing.next();
  return parent.createFolder(name);
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
 * uploadImage(dataUrl, meta)
 * meta: { customerId, customerName, serviceType, filename }
 */
function uploadImage(dataUrl, meta) {
  meta = meta || {};
  const filename = meta.filename || ("file_" + Date.now());
  const blob = dataUrlToBlob_(dataUrl, filename);

  const root = getDriveRootFolder_();
  const customerFolderName = sanitizeFolderName_(
    (meta.customerId || "unknown") + "_" + (meta.customerName || "")
  );
  const visitFolderName = sanitizeFolderName_(todayDateString_() + "_" + (meta.serviceType || ""));

  const customerFolder = getOrCreateSubfolder_(root, customerFolderName);
  const visitFolder = getOrCreateSubfolder_(customerFolder, visitFolderName);

  const file = visitFolder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  // file.getUrl() คืนหน้า viewer HTML (…/file/d/ID/view) ใช้เป็น <img src> ตรงๆ ไม่ได้
  // ต้องใช้ endpoint thumbnail ที่ Google รองรับให้ embed เป็นรูปได้จริง
  return { success: true, url: "https://drive.google.com/thumbnail?id=" + file.getId() + "&sz=w1000" };
}
