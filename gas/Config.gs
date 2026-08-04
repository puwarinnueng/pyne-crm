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

const SHEET_ID = "1SyENEryBoq8EEbNRDyTZjZOgpopTAG88Uh7HB7-T2Yc";

const DRIVE_ROOT_FOLDER_ID = "1lMxxmJeZFXhgOKV4atsZ6qyvjXJAW4Sh";

// username/password เริ่มต้นสำหรับหน้า Sign In — ใช้แค่ตอน setupSpreadsheet() ครั้งแรก (ดู Setup.gs)
// หลังจากนั้น USERNAME แก้ได้ทีหลังผ่านแท็บ Config ใน Sheet โดยตรง แต่ PASSWORD ต้องเปลี่ยนผ่านหน้า
// "Reset password" ในแอปเท่านั้น เพราะแท็บ Config เก็บแค่ salted hash (PASSWORD_HASH/PASSWORD_SALT)
// ไม่เก็บรหัสผ่านตัวเต็ม แก้ในชีตตรงๆ ไม่ได้ — ดู gas/Utils.gs: hashPassword_()
const DEFAULT_USERNAME = "admin@gmail.com";
const DEFAULT_PASSWORD = "pyne1234";

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
