/**
 * Config.gs — ค่าที่ต้องแก้เองก่อนใช้งาน
 *
 * ตอนทดสอบด้วยบัญชีตัวเอง: ใส่ Sheet ID / Drive Folder ID ของบัญชีทดสอบ
 * ตอนส่งมอบร้านจริง: เปลี่ยนแค่ 2 ค่านี้เป็นของบัญชีร้าน แล้ว clasp push + deploy ใหม่
 * ไม่ต้องแก้โค้ดไฟล์อื่นเลย
 *
 * วิธีหา ID จาก URL:
 *   Sheet:  https://docs.google.com/spreadsheets/d/[SHEET_ID]/edit
 *   Drive:  https://drive.google.com/drive/folders/[DRIVE_ROOT_FOLDER_ID]
 */

// TODO: ใส่ Sheet ID ของ Google Sheet ที่จะใช้เป็นฐานข้อมูล (สร้างไฟล์เปล่า ๆ ไว้ก่อน)
const SHEET_ID = "PUT_YOUR_TEST_SHEET_ID_HERE";

// TODO: ใส่ Folder ID ของ Google Drive ที่จะใช้เก็บรูป/ลายเซ็น (สร้างโฟลเดอร์เปล่า ๆ ไว้ก่อน)
const DRIVE_ROOT_FOLDER_ID = "PUT_YOUR_TEST_DRIVE_FOLDER_ID_HERE";

// รหัสผ่านหน้าแรกเริ่มต้น — เปลี่ยนได้ทีหลังผ่านแท็บ Config ใน Sheet โดยตรง ไม่ต้องแก้ที่นี่/deploy ใหม่
const DEFAULT_PASSCODE = "1234";

const SHEET_NAMES = {
  CUSTOMERS: "Customers",
  SERVICE_HISTORY: "ServiceHistory",
  CONFIG: "Config"
};

function getSpreadsheet_() {
  return SpreadsheetApp.openById(SHEET_ID);
}

function getDriveRootFolder_() {
  return DriveApp.getFolderById(DRIVE_ROOT_FOLDER_ID);
}
