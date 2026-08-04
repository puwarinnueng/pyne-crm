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
      customerId: "PYN-000001",
      fullName: "สมหญิง ใจดี",
      nickname: "สมหญิง",
      dob: "1994-03-12",
      phoneNormalized: "0812345678",
      phoneDisplay: "081-234-5678",
      line: "somying_line",
      profileConfirmedAt: dayMs(200),
      skinProfile: {
        skinType: "ผสม", hairLook: "ปานกลาง", hairDensity: "ปานกลาง",
        browShape: ["หางคิ้วตก"], muscle: null, muscleNote: "", muscleEvaluatedAt: null
      },
      createdAt: dayMs(200)
    },
    {
      customerId: "PYN-000002",
      fullName: "วรรณา สุขใส",
      nickname: "วรรณา",
      dob: "1990-07-22",
      phoneNormalized: "0898765432",
      phoneDisplay: "089-876-5432",
      line: "wanna_bkk",
      profileConfirmedAt: dayMs(120),
      skinProfile: {
        skinType: "แห้ง", hairLook: "เส้นเล็ก", hairDensity: "บาง",
        browShape: ["หัวคิ้วบาง", "หางคิ้วบาง"], muscle: null, muscleNote: "", muscleEvaluatedAt: null
      },
      createdAt: dayMs(120)
    },
    {
      customerId: "PYN-000003",
      fullName: "น้ำฝน ศรีสุข",
      nickname: "น้ำฝน",
      dob: "1997-11-02",
      phoneNormalized: "0861112233",
      phoneDisplay: "086-111-2233",
      line: "namfon88",
      profileConfirmedAt: dayMs(90),
      skinProfile: {
        skinType: "มันขาดน้ำ", hairLook: "เส้นหนา", hairDensity: "หนา",
        browShape: ["คิ้วหนาเป็นกระจุก"], muscle: "คิ้วขวายกสูงกว่า", muscleNote: "", muscleEvaluatedAt: dayMs(85)
      },
      createdAt: dayMs(90)
    },
    {
      customerId: "PYN-000004",
      fullName: "มายด์ วงศ์ทอง",
      nickname: "มายด์",
      dob: "1999-01-30",
      phoneNormalized: "0825556677",
      phoneDisplay: "082-555-6677",
      line: "mind.brow",
      profileConfirmedAt: dayMs(45),
      skinProfile: {
        skinType: "ปกติ", hairLook: "ปานกลาง", hairDensity: "ปานกลาง",
        browShape: ["กลางคิ้วบาง"], muscle: "ใกล้เคียงกัน", muscleNote: "", muscleEvaluatedAt: dayMs(40)
      },
      createdAt: dayMs(45)
    },
    {
      customerId: "PYN-000005",
      fullName: "พลอย มณีรัตน์",
      nickname: "พลอย",
      dob: "1995-05-18",
      phoneNormalized: "0953334455",
      phoneDisplay: "095-333-4455",
      line: "ployy.pmu",
      profileConfirmedAt: dayMs(30),
      skinProfile: {
        skinType: "มัน", hairLook: "เส้นเล็ก", hairDensity: "บางมาก",
        browShape: ["ไม่มีหางคิ้ว"], muscle: null, muscleNote: "", muscleEvaluatedAt: null
      },
      createdAt: dayMs(30)
    }
  ];

  const serviceHistory = [
    {
      serviceId: "S0001",
      customerId: "PYN-000001",
      zervaBookingId: "ZB100001",
      status: "completed",
      timeSlot: "10:30",
      visitDate: dayMs(200),
      serviceType: "สักคิ้ว",
      formType: "form1",
      technique: "Hairstroke",
      colorUsed: "น้ำตาลเข้ม",
      intensity: "เข้มระดับกลาง / ตามที่ช่างเห็นเหมาะสม (2-4 รอบ)",
      note: "ผิวแห้งง่าย ระวังอาการคัน",
      beforePhotoUrl: "",
      afterPhotoUrl: "",
      signatureCustomerUrl: "",
      signatureTechUrl: "",
      createdAt: dayMs(200)
    },
    {
      serviceId: "S0002",
      customerId: "PYN-000001",
      zervaBookingId: "ZB100014",
      status: "completed",
      timeSlot: "13:30",
      visitDate: dayMs(20),
      serviceType: "เติมสี",
      formType: "form3",
      technique: "Hairstroke",
      colorUsed: "น้ำตาลเข้ม",
      intensity: "เข้มระดับกลาง / ตามที่ช่างเห็นเหมาะสม (2-4 รอบ)",
      note: "",
      beforePhotoUrl: "",
      afterPhotoUrl: "",
      signatureCustomerUrl: "",
      signatureTechUrl: "",
      createdAt: dayMs(20)
    },
    {
      serviceId: "S0003",
      customerId: "PYN-000002",
      zervaBookingId: "ZB100002",
      status: "completed",
      timeSlot: "16:00",
      visitDate: dayMs(100),
      serviceType: "สักคิ้ว",
      formType: "form1",
      technique: "Shading Brow",
      colorUsed: "น้ำตาลอ่อน",
      intensity: "อ่อนธรรมชาติ (1-2 รอบ)",
      note: "แพ้ยาชาบางชนิด",
      beforePhotoUrl: "",
      afterPhotoUrl: "",
      signatureCustomerUrl: "",
      signatureTechUrl: "",
      createdAt: dayMs(100)
    },
    {
      serviceId: "S0004",
      customerId: "PYN-000002",
      zervaBookingId: "ZB100015",
      status: "completed",
      timeSlot: "10:30",
      visitDate: dayMs(40),
      serviceType: "เติมสี",
      formType: "form3",
      technique: "Shading Brow",
      colorUsed: "น้ำตาลอ่อน",
      intensity: "อ่อนธรรมชาติ (1-2 รอบ)",
      note: "",
      beforePhotoUrl: "",
      afterPhotoUrl: "",
      signatureCustomerUrl: "",
      signatureTechUrl: "",
      createdAt: dayMs(40)
    },
    {
      serviceId: "S0005",
      customerId: "PYN-000003",
      zervaBookingId: "ZB100003",
      status: "completed",
      timeSlot: "18:30",
      visitDate: dayMs(85),
      serviceType: "สักคิ้ว",
      formType: "form1",
      technique: "Premium Line",
      colorUsed: "น้ำตาลกลาง",
      intensity: "เข้มระดับกลาง / ตามที่ช่างเห็นเหมาะสม (2-4 รอบ)",
      note: "",
      beforePhotoUrl: "",
      afterPhotoUrl: "",
      signatureCustomerUrl: "",
      signatureTechUrl: "",
      createdAt: dayMs(85)
    },
    {
      serviceId: "S0006",
      customerId: "PYN-000004",
      zervaBookingId: "ZB100004",
      status: "completed",
      timeSlot: "13:30",
      visitDate: dayMs(40),
      serviceType: "สักคิ้ว",
      formType: "form1",
      technique: "Hairstroke",
      colorUsed: "น้ำตาลหม่นเทา",
      intensity: "อ่อนธรรมชาติ (1-2 รอบ)",
      note: "คิ้วบางข้างซ้าย",
      beforePhotoUrl: "",
      afterPhotoUrl: "",
      signatureCustomerUrl: "",
      signatureTechUrl: "",
      createdAt: dayMs(40)
    },
    {
      serviceId: "S0007",
      customerId: "PYN-000004",
      zervaBookingId: "ZB100016",
      status: "completed",
      timeSlot: "16:00",
      visitDate: dayMs(10),
      serviceType: "เติมสี",
      formType: "form3",
      technique: "Hairstroke",
      colorUsed: "น้ำตาลหม่นเทา",
      intensity: "อ่อนธรรมชาติ (1-2 รอบ)",
      note: "",
      beforePhotoUrl: "",
      afterPhotoUrl: "",
      signatureCustomerUrl: "",
      signatureTechUrl: "",
      createdAt: dayMs(10)
    },
    {
      serviceId: "S0008",
      customerId: "PYN-000005",
      zervaBookingId: "ZB100005",
      status: "completed",
      timeSlot: "18:30",
      visitDate: dayMs(25),
      serviceType: "สักคิ้ว",
      formType: "form1",
      technique: "Shading Brow",
      colorUsed: "น้ำตาลแดง",
      intensity: "เข้ม แน่น เป๊ะ (4-6 รอบ)",
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
