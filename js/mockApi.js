// mockApi.js — จำลองฟังก์ชันฝั่งเซิร์ฟเวอร์ (Apps Script) ด้วย Promise
// ชื่อฟังก์ชันตั้งให้ตรงกับ implementation-plan-phase1.md ทุกตัว
// เมื่อจะต่อ Google Sheets/Drive จริง: เขียน Code.gs/Customers.gs/ServiceHistory.gs/DriveStorage.gs
// ตามชื่อฟังก์ชันเดียวกันนี้ แล้วเปลี่ยนจุดเรียกใช้ในหน้าจอ js/screens/*.js จาก import ที่นี่
// เป็น wrapper ที่เรียก google.script.run แทน (โครงสร้างพารามิเตอร์/ผลลัพธ์ไม่ต้องเปลี่ยน)

import { db } from "./data/mockData.js";

const DELAY = 250; // จำลอง network latency ให้เห็น loading state จริง

function wait(ms = DELAY) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const PASSCODE = "1234"; // mock — ของจริงเก็บใน Config sheet

export function normalizePhone(phone) {
  if (!phone) return "";
  let p = String(phone).replace(/[^\d+]/g, "");
  if (p.startsWith("+66")) p = "0" + p.slice(3);
  else if (p.startsWith("66") && p.length > 9) p = "0" + p.slice(2);
  return p;
}

export async function checkPasscode(pin) {
  await wait();
  return { success: pin === PASSCODE };
}

export async function searchCustomers(query) {
  await wait();
  const q = (query || "").trim().toLowerCase();
  if (!q) return [];
  const qPhone = normalizePhone(query);
  const { customers } = db.get();
  return customers.filter((c) => {
    const nameHit = c.name.toLowerCase().includes(q);
    const lineHit = (c.line || "").toLowerCase().includes(q);
    const phoneHit = qPhone.length >= 3 && c.phoneNormalized.includes(qPhone);
    return nameHit || lineHit || phoneHit;
  });
}

export async function listRecentCustomers(limit) {
  await wait();
  const { customers } = db.get();
  return [...customers].sort((a, b) => b.createdAt - a.createdAt).slice(0, limit || 10);
}

export async function findCustomerByPhone(phone) {
  await wait();
  const normalized = normalizePhone(phone);
  const { customers } = db.get();
  return customers.find((c) => c.phoneNormalized === normalized) || null;
}

export async function createCustomer(data) {
  await wait();
  const database = db.get();
  const normalized = normalizePhone(data.phone);
  const existing = database.customers.find((c) => c.phoneNormalized === normalized);
  if (existing) {
    return { success: false, error: "duplicate", existing };
  }
  const customerId = "C" + String(database.seq.customer).padStart(4, "0");
  const customer = {
    customerId,
    name: data.name,
    phoneNormalized: normalized,
    phoneDisplay: data.phone,
    line: data.line || "",
    createdAt: Date.now()
  };
  database.customers.push(customer);
  database.seq.customer += 1;
  db.set(database);
  return { success: true, customer };
}

export async function getCustomer(customerId) {
  await wait();
  const { customers } = db.get();
  return customers.find((c) => c.customerId === customerId) || null;
}

export async function getHistoryByCustomer(customerId) {
  await wait();
  const { serviceHistory } = db.get();
  return serviceHistory
    .filter((v) => v.customerId === customerId)
    .sort((a, b) => b.visitDate - a.visitDate);
}

export async function saveVisit(payload) {
  await wait(400);
  const database = db.get();
  const serviceId = "S" + String(database.seq.service).padStart(4, "0");
  const visit = {
    serviceId,
    createdAt: Date.now(),
    visitDate: Date.now(),
    ...payload
  };
  database.serviceHistory.push(visit);
  database.seq.service += 1;
  db.set(database);
  return { success: true, serviceId };
}

export async function ensureVisitFolder(meta) {
  // mock: ของจริง (gas/DriveStorage.gs) จะหา/สร้าง visit folder ใน Google Drive แล้วคืน folderId จริง
  await wait(150);
  return { success: true, folderId: "mock-folder" };
}

export async function uploadImage(dataUrl, meta) {
  // mock: ของจริง (gas/DriveStorage.gs) จะใช้ meta.folderId เขียนไฟล์ลง Google Drive แล้วคืน fileUrl จริง
  // ที่นี่แค่ส่ง dataUrl กลับเพื่อ preview
  await wait(150);
  return { success: true, url: dataUrl };
}

export async function exportConsentPdf(serviceId) {
  await wait(500);
  return { success: true, note: "mock: ของจริงจะสร้างไฟล์ PDF ใน Google Drive แล้วคืนลิงก์" };
}
