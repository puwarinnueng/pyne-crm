// ข้อมูลจำลอง (mock) เก็บใน localStorage เพื่อให้ทดสอบ flow ได้ครบโดยไม่ต้องต่อ Google Sheets/Drive จริง
// เมื่อจะต่อของจริง: แทนที่ไฟล์นี้และ mockApi.js ด้วยการเรียก google.script.run ไปยัง Apps Script แทน

const STORAGE_KEY = "pyneCrmMockDB_v1";

// ไม่มีข้อมูลตัวอย่าง (mock) แล้ว — เริ่มจากฐานข้อมูลเปล่าให้ทดสอบเองทั้งหมด
function seedData() {
  return { customers: [], serviceHistory: [], seq: { customer: 1, service: 1 } };
}

function load() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seeded = seedData();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }
  try {
    return JSON.parse(raw);
  } catch {
    const seeded = seedData();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }
}

function save(db) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

export const db = {
  get() { return load(); },
  set(next) { save(next); },
  reset() { save(seedData()); }
};
