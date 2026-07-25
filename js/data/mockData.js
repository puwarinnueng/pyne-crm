// ข้อมูลจำลอง (mock) เก็บใน localStorage เพื่อให้ทดสอบ flow ได้ครบโดยไม่ต้องต่อ Google Sheets/Drive จริง
// เมื่อจะต่อของจริง: แทนที่ไฟล์นี้และ mockApi.js ด้วยการเรียก google.script.run ไปยัง Apps Script แทน

const STORAGE_KEY = "pyneCrmMockDB_v1";

function seedData() {
  const now = Date.now();
  const customers = [
    {
      customerId: "C0001",
      name: "สมหญิง",
      phoneNormalized: "0812345678",
      phoneDisplay: "081-234-5678",
      line: "somying_line",
      note: "",
      createdAt: now - 1000 * 60 * 60 * 24 * 200
    },
    {
      customerId: "C0002",
      name: "วรรณา",
      phoneNormalized: "0898765432",
      phoneDisplay: "089-876-5432",
      line: "wanna_bkk",
      note: "แพ้ยาชาบางชนิด",
      createdAt: now - 1000 * 60 * 60 * 24 * 60
    }
  ];

  const serviceHistory = [
    {
      serviceId: "S0001",
      customerId: "C0001",
      visitDate: now - 1000 * 60 * 60 * 24 * 200,
      serviceType: "สักคิ้ว",
      technique: "Hairstroke",
      colorUsed: "น้ำตาลเข้ม",
      intensity: "เข้มระดับกลาง/ตามที่ช่างเห็นเหมาะสม",
      note: "ผิวแห้งง่าย ระวังอาการคัน",
      beforePhotoUrl: "",
      afterPhotoUrl: "",
      signatureCustomerUrl: "",
      signatureTechUrl: "",
      createdAt: now - 1000 * 60 * 60 * 24 * 200
    },
    {
      serviceId: "S0002",
      customerId: "C0001",
      visitDate: now - 1000 * 60 * 60 * 24 * 20,
      serviceType: "เติมสี",
      technique: "Hairstroke",
      colorUsed: "น้ำตาลเข้ม",
      intensity: "เข้มระดับกลาง/ตามที่ช่างเห็นเหมาะสม",
      note: "",
      beforePhotoUrl: "",
      afterPhotoUrl: "",
      signatureCustomerUrl: "",
      signatureTechUrl: "",
      createdAt: now - 1000 * 60 * 60 * 24 * 20
    }
  ];

  return { customers, serviceHistory, seq: { customer: 3, service: 3 } };
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
