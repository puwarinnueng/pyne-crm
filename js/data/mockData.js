// ข้อมูลจำลอง (mock) เก็บใน localStorage เพื่อให้ทดสอบ flow ได้ครบโดยไม่ต้องต่อ Google Sheets/Drive จริง
// เมื่อจะต่อของจริง: แทนที่ไฟล์นี้และ mockApi.js ด้วยการเรียก google.script.run ไปยัง Apps Script แทน

const STORAGE_KEY = "pyneCrmMockDB_v1";

function dayMs(daysAgo) {
  return Date.now() - 1000 * 60 * 60 * 24 * daysAgo;
}

// ลูกค้าตัวอย่าง ~5 คน พร้อมประวัติบริการ — ใช้เฉพาะตอน DB ว่างหรือยังไม่มี localStorage
function seedData() {
  const customers = [
    {
      customerId: "C0001",
      name: "สมหญิง",
      phoneNormalized: "0812345678",
      phoneDisplay: "081-234-5678",
      line: "somying_line",
      createdAt: dayMs(200)
    },
    {
      customerId: "C0002",
      name: "วรรณา",
      phoneNormalized: "0898765432",
      phoneDisplay: "089-876-5432",
      line: "wanna_bkk",
      createdAt: dayMs(120)
    },
    {
      customerId: "C0003",
      name: "น้ำฝน",
      phoneNormalized: "0861112233",
      phoneDisplay: "086-111-2233",
      line: "namfon88",
      createdAt: dayMs(90)
    },
    {
      customerId: "C0004",
      name: "มายด์",
      phoneNormalized: "0825556677",
      phoneDisplay: "082-555-6677",
      line: "mind.brow",
      createdAt: dayMs(45)
    },
    {
      customerId: "C0005",
      name: "พลอย",
      phoneNormalized: "0953334455",
      phoneDisplay: "095-333-4455",
      line: "ployy.pmu",
      createdAt: dayMs(30)
    }
  ];

  const serviceHistory = [
    {
      serviceId: "S0001",
      customerId: "C0001",
      visitDate: dayMs(200),
      serviceType: "สักคิ้ว",
      technique: "Hairstroke",
      colorUsed: "น้ำตาลเข้ม",
      intensity: "เข้มระดับกลาง/ตามที่ช่างเห็นเหมาะสม",
      note: "ผิวแห้งง่าย ระวังอาการคัน",
      beforePhotoUrl: "",
      afterPhotoUrl: "",
      signatureCustomerUrl: "",
      signatureTechUrl: "",
      createdAt: dayMs(200)
    },
    {
      serviceId: "S0002",
      customerId: "C0001",
      visitDate: dayMs(20),
      serviceType: "เติมสี",
      technique: "Hairstroke",
      colorUsed: "น้ำตาลเข้ม",
      intensity: "เข้มระดับกลาง/ตามที่ช่างเห็นเหมาะสม",
      note: "",
      beforePhotoUrl: "",
      afterPhotoUrl: "",
      signatureCustomerUrl: "",
      signatureTechUrl: "",
      createdAt: dayMs(20)
    },
    {
      serviceId: "S0003",
      customerId: "C0002",
      visitDate: dayMs(100),
      serviceType: "สักคิ้ว",
      technique: "Ombre",
      colorUsed: "น้ำตาลอ่อน",
      intensity: "อ่อน/ธรรมชาติ",
      note: "แพ้ยาชาบางชนิด",
      beforePhotoUrl: "",
      afterPhotoUrl: "",
      signatureCustomerUrl: "",
      signatureTechUrl: "",
      createdAt: dayMs(100)
    },
    {
      serviceId: "S0004",
      customerId: "C0002",
      visitDate: dayMs(40),
      serviceType: "เติมสี",
      technique: "Ombre",
      colorUsed: "น้ำตาลอ่อน",
      intensity: "อ่อน/ธรรมชาติ",
      note: "",
      beforePhotoUrl: "",
      afterPhotoUrl: "",
      signatureCustomerUrl: "",
      signatureTechUrl: "",
      createdAt: dayMs(40)
    },
    {
      serviceId: "S0005",
      customerId: "C0003",
      visitDate: dayMs(85),
      serviceType: "สักคิ้ว",
      technique: "Combination",
      colorUsed: "น้ำตาลกลาง",
      intensity: "เข้มระดับกลาง/ตามที่ช่างเห็นเหมาะสม",
      note: "",
      beforePhotoUrl: "",
      afterPhotoUrl: "",
      signatureCustomerUrl: "",
      signatureTechUrl: "",
      createdAt: dayMs(85)
    },
    {
      serviceId: "S0006",
      customerId: "C0004",
      visitDate: dayMs(40),
      serviceType: "สักคิ้ว",
      technique: "Hairstroke",
      colorUsed: "เทาน้ำตาล",
      intensity: "อ่อน/ธรรมชาติ",
      note: "คิ้วบางข้างซ้าย",
      beforePhotoUrl: "",
      afterPhotoUrl: "",
      signatureCustomerUrl: "",
      signatureTechUrl: "",
      createdAt: dayMs(40)
    },
    {
      serviceId: "S0007",
      customerId: "C0004",
      visitDate: dayMs(10),
      serviceType: "เติมสี",
      technique: "Hairstroke",
      colorUsed: "เทาน้ำตาล",
      intensity: "อ่อน/ธรรมชาติ",
      note: "",
      beforePhotoUrl: "",
      afterPhotoUrl: "",
      signatureCustomerUrl: "",
      signatureTechUrl: "",
      createdAt: dayMs(10)
    },
    {
      serviceId: "S0008",
      customerId: "C0005",
      visitDate: dayMs(25),
      serviceType: "สักคิ้ว",
      technique: "Ombre",
      colorUsed: "น้ำตาลแดง",
      intensity: "เข้ม/ชัดเจน",
      note: "",
      beforePhotoUrl: "",
      afterPhotoUrl: "",
      signatureCustomerUrl: "",
      signatureTechUrl: "",
      createdAt: dayMs(25)
    }
  ];

  return { customers, serviceHistory, seq: { customer: 6, service: 9 } };
}

function ensureSeeded(db) {
  if (!db || !Array.isArray(db.customers)) return seedData();
  // มีลูกค้าอยู่แล้ว — ไม่ทับข้อมูลที่ผู้ใช้สร้างไว้
  if (db.customers.length > 0) return db;
  // อาร์เรย์ว่าง (เคยเคลียร์หรือ seed เปล่าเก่า) — ใส่ demo
  return seedData();
}

function load() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seeded = seedData();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }
  try {
    const parsed = JSON.parse(raw);
    const ensured = ensureSeeded(parsed);
    if (ensured !== parsed) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ensured));
    }
    return ensured;
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
