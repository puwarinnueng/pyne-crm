// mockApi.js — จำลองฟังก์ชันฝั่งเซิร์ฟเวอร์ (Apps Script) ด้วย Promise
// ชื่อฟังก์ชันตั้งให้ตรงกับ implementation-plan-phase1.md ทุกตัว
// เมื่อจะต่อ Google Sheets/Drive จริง: เขียน Code.gs/Customers.gs/ServiceHistory.gs/DriveStorage.gs
// ตามชื่อฟังก์ชันเดียวกันนี้ แล้วเปลี่ยนจุดเรียกใช้ในหน้าจอ js/screens/*.js จาก import ที่นี่
// เป็น wrapper ที่เรียก google.script.run แทน (โครงสร้างพารามิเตอร์/ผลลัพธ์ไม่ต้องเปลี่ยน)

import { db } from "./data/mockData.js";
import { AUTH_CONFIG } from "./data/authConfig.js";
import { getToken, sessionExpired } from "./session.js";

const DELAY = 250; // จำลอง network latency ให้เห็น loading state จริง

function wait(ms = DELAY) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// เก็บ username/password ที่เปลี่ยนผ่านหน้า Reset password ไว้ใน localStorage (เฉพาะ local/dev)
// ของจริง (gas/) จะเขียนทับค่าในแท็บ Config ของ Sheet แทน — ดู gas/Code.gs: changePassword()
const AUTH_OVERRIDE_KEY = "pyneCrmAuthOverride";

// จำลอง session ที่ "เซิร์ฟเวอร์" เก็บไว้ (คนละคีย์กับ cookie ฝั่ง client ใน js/session.js) เทียบเท่า
// PropertiesService.getScriptProperties() ของจริง — ดู gas/Utils.gs: getSessionToken_()/setSessionToken_()
const SERVER_SESSION_KEY = "pyneCrmMockServerSession";

function getAuthCreds() {
  try {
    const stored = JSON.parse(localStorage.getItem(AUTH_OVERRIDE_KEY) || "null");
    if (stored && stored.username && stored.password) return stored;
  } catch (e) {
    // ค่าที่เก็บไว้พังหรืออ่านไม่ได้ — ใช้ค่า default แทน
  }
  return AUTH_CONFIG;
}

function getServerSession() {
  return localStorage.getItem(SERVER_SESSION_KEY) || "";
}

function setServerSession(token) {
  localStorage.setItem(SERVER_SESSION_KEY, token);
}

function clearServerSession() {
  localStorage.removeItem(SERVER_SESSION_KEY);
}

// เทียบเท่า requireSession_() ฝั่งเซิร์ฟเวอร์จริง — เรียกต้นทุกฟังก์ชันที่ต้อง login ก่อนถึงจะใช้ได้
// ถ้า token ไม่ตรง จะเคลียร์ cookie ฝั่ง client แล้วเด้งกลับหน้า login ทันที เหมือนพฤติกรรม production
function requireSession(token) {
  const stored = getServerSession();
  if (!stored || !token || token !== stored) {
    sessionExpired();
    throw new Error("UNAUTHORIZED");
  }
}

export async function login(username, password) {
  await wait();
  const creds = getAuthCreds();
  const success = String(username || "").trim() === creds.username && String(password || "") === creds.password;
  if (!success) return { success: false };
  const token = Date.now().toString(36) + Math.random().toString(36).slice(2);
  setServerSession(token);
  return { success: true, token };
}

export async function checkSession(token) {
  await wait(100);
  const stored = getServerSession();
  return { valid: !!stored && !!token && token === stored };
}

export async function logout(token) {
  await wait(100);
  clearServerSession();
  return { success: true };
}

export async function changePassword(oldPassword, newPassword) {
  await wait();
  const creds = getAuthCreds();
  if (String(oldPassword || "") !== creds.password) {
    return { success: false, error: "wrong_password" };
  }
  localStorage.setItem(AUTH_OVERRIDE_KEY, JSON.stringify({ username: creds.username, password: newPassword }));
  clearServerSession();
  return { success: true };
}

export function normalizePhone(phone) {
  if (!phone) return "";
  let p = String(phone).replace(/[^\d+]/g, "");
  if (p.startsWith("+66")) p = "0" + p.slice(3);
  else if (p.startsWith("66") && p.length > 9) p = "0" + p.slice(2);
  return p;
}

export async function searchCustomers(query) {
  await wait();
  requireSession(getToken());
  const q = (query || "").trim().toLowerCase();
  if (!q) return [];
  const qPhone = normalizePhone(query);
  const { customers } = db.get();
  return customers.filter((c) => {
    const nameHit = `${c.fullName || ""} ${c.nickname || ""}`.toLowerCase().includes(q);
    const lineHit = (c.line || "").toLowerCase().includes(q);
    const phoneHit = qPhone.length >= 3 && c.phoneNormalized.includes(qPhone);
    return nameHit || lineHit || phoneHit;
  });
}

export async function listRecentCustomers(limit) {
  await wait();
  requireSession(getToken());
  const { customers } = db.get();
  return [...customers].sort((a, b) => b.createdAt - a.createdAt).slice(0, limit || 10);
}

export async function debugCustomerSearch(query) {
  await wait(100);
  requireSession(getToken());
  const { customers } = db.get();
  const qPhone = normalizePhone(query);
  return {
    query,
    qPhone,
    sheetName: "mock",
    lastRow: customers.length + 1,
    headers: ["CustomerID", "PhoneNormalized", "PhoneDisplay"],
    rowCount: customers.length,
    sample: customers.slice(0, 3).map((c, idx) => ({
      rowIndex: idx + 2,
      customerId: c.customerId,
      phoneNormalized: c.phoneNormalized,
      phoneDisplay: c.phoneDisplay,
      normalizedMatch: c.phoneNormalized.includes(qPhone),
      displayMatch: c.phoneDisplay.includes(qPhone)
    }))
  };
}

// รายชื่อลูกค้าทั้งหมด พร้อมสถิติที่คำนวณจาก serviceHistory (จำนวนครั้ง, วันที่ล่าสุด, เทคนิคล่าสุด)
// ใช้แสดงในตาราง Customers — ของจริง (gas/) จะ join ฝั่งเซิร์ฟเวอร์แบบเดียวกันแล้วคืนรูปแบบนี้เหมือนกัน
export async function listCustomersWithStats() {
  await wait();
  requireSession(getToken());
  const { customers, serviceHistory } = db.get();
  return customers
    .map((c) => {
      const visits = serviceHistory
        .filter((v) => v.customerId === c.customerId)
        .sort((a, b) => b.visitDate - a.visitDate);
      const lastVisit = visits[0] || null;
      return {
        ...c,
        visitsCount: visits.length,
        lastVisitDate: lastVisit ? lastVisit.visitDate : null,
        lastTechnique: lastVisit ? (lastVisit.technique || lastVisit.serviceType || "-") : "-"
      };
    })
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function findCustomerByPhone(phone) {
  await wait();
  requireSession(getToken());
  const normalized = normalizePhone(phone);
  const { customers } = db.get();
  return customers.find((c) => c.phoneNormalized === normalized) || null;
}

// รูปแบบ Customer ID ตามสเปก: PYN-000123 (prefix คงที่ + เลขรัน 6 หลัก)
function formatCustomerId(seq) {
  return "PYN-" + String(seq).padStart(6, "0");
}

export async function createCustomer(data) {
  await wait();
  requireSession(getToken());
  const database = db.get();
  const normalized = normalizePhone(data.phone);
  const existing = database.customers.find((c) => c.phoneNormalized === normalized);
  if (existing) {
    return { success: false, error: "duplicate", existing };
  }
  const customerId = formatCustomerId(database.seq.customer);
  const customer = {
    customerId,
    fullName: data.fullName,
    nickname: data.nickname,
    dob: data.dob || null,
    phoneNormalized: normalized,
    phoneDisplay: data.phone,
    line: data.line || "",
    profileConfirmedAt: null,
    skinProfile: {
      skinType: null, hairLook: null, hairDensity: null,
      browShape: [], muscle: null, muscleNote: "", muscleEvaluatedAt: null
    },
    createdAt: Date.now()
  };
  database.customers.push(customer);
  database.seq.customer += 1;
  db.set(database);
  return { success: true, customer };
}

// บันทึกว่าลูกค้ายืนยันข้อมูลส่วนตัวถูกต้องแล้ว พร้อมวันเวลา (ตามสเปก Step 2)
export async function confirmCustomerProfile(customerId) {
  await wait(150);
  requireSession(getToken());
  const database = db.get();
  const customer = database.customers.find((c) => c.customerId === customerId);
  if (!customer) return { success: false };
  customer.profileConfirmedAt = Date.now();
  db.set(database);
  return { success: true, customer };
}

// บันทึกประวัติผิวและคิ้วของลูกค้า (ข้อมูลระดับลูกค้า แก้ไขได้ ใช้ซ้ำได้ทุก Visit)
export async function saveSkinProfile(customerId, skinProfile) {
  await wait(150);
  requireSession(getToken());
  const database = db.get();
  const customer = database.customers.find((c) => c.customerId === customerId);
  if (!customer) return { success: false };
  customer.skinProfile = { ...customer.skinProfile, ...skinProfile };
  db.set(database);
  return { success: true, customer };
}

// อัปเดตผลประเมินกล้ามเนื้อคิ้วล่าสุด (กรอกในฟอร์ม 1/2 ตอนวัดทรงจริง) กลับไปแสดงใน Customer Profile
export async function updateMuscleEvaluation(customerId, muscle, muscleNote) {
  await wait(150);
  requireSession(getToken());
  const database = db.get();
  const customer = database.customers.find((c) => c.customerId === customerId);
  if (!customer) return { success: false };
  customer.skinProfile = {
    ...customer.skinProfile,
    muscle, muscleNote: muscleNote || "", muscleEvaluatedAt: Date.now()
  };
  db.set(database);
  return { success: true, customer };
}

export async function getCustomer(customerId) {
  await wait();
  requireSession(getToken());
  const { customers } = db.get();
  return customers.find((c) => c.customerId === customerId) || null;
}

export async function getHistoryByCustomer(customerId) {
  await wait();
  requireSession(getToken());
  const { serviceHistory } = db.get();
  return serviceHistory
    .filter((v) => v.customerId === customerId)
    .sort((a, b) => b.visitDate - a.visitDate);
}

// สร้าง Visit ใหม่ตอน Step 3 (ก่อนเปิดฟอร์ม Consultation ใด ๆ) — สถานะเริ่มต้นเสมอคือ "กำลังดำเนินการ"
// คืน visitId (= serviceId) กลับไปให้หน้าฟอร์มถัดไปใช้เป็น payload.serviceId ตอนบันทึกแบบร่าง/ปิด Visit
// เพื่ออัปเดตแถวเดิมแทนการสร้างแถวซ้ำ (ดู saveVisit ด้านล่าง)
export async function createVisit({ customerId, zervaBookingId, visitDate, timeSlot }) {
  await wait(200);
  requireSession(getToken());
  const database = db.get();
  const visitId = "S" + String(database.seq.service).padStart(4, "0");
  const visit = {
    serviceId: visitId,
    customerId,
    zervaBookingId: zervaBookingId || null,
    visitDate: visitDate || Date.now(),
    timeSlot: timeSlot || null,
    status: "กำลังดำเนินการ",
    createdAt: Date.now()
  };
  database.serviceHistory.push(visit);
  database.seq.service += 1;
  db.set(database);
  return { success: true, visitId, visit };
}

// ปิด Visit ด้วยสถานะ "ไม่ได้รับบริการ" — บังคับกรอกเหตุผล ไม่บังคับ Consent/ลายเซ็น/รายละเอียดการทำ/รูป After
export async function closeVisitNotServed(visitId, reason) {
  await wait(200);
  requireSession(getToken());
  const database = db.get();
  const idx = database.serviceHistory.findIndex((v) => v.serviceId === visitId);
  if (idx < 0) return { success: false };
  database.serviceHistory[idx] = {
    ...database.serviceHistory[idx],
    status: "ไม่ได้รับบริการ",
    notServedReason: reason,
    updatedAt: Date.now()
  };
  db.set(database);
  return { success: true };
}

// ถ้า payload.serviceId ตรงกับ Visit ที่เคย "บันทึกแบบร่าง" ไว้แล้ว จะอัปเดตแถวเดิมแทนการสร้างแถวใหม่
// (กันไม่ให้กด "บันทึกแบบร่าง" ซ้ำหลายครั้งแล้วได้ Visit ซ้อนกันหลายแถว) — ของจริง (gas/) ทำแบบเดียวกันด้วย
// LockService + หา row เดิมจาก serviceId ก่อนตัดสินใจ update/append
export async function saveVisit(payload) {
  await wait(400);
  requireSession(getToken());
  const database = db.get();

  // agreedAt ถูกฝังอยู่ใน rawAnswers (ตั้งตอนกด "ยินยอม" ในฟอร์ม) ดึงออกมาเป็นฟิลด์แยก consentAgreedAt
  // ให้ตรงกับคอลัมน์ ConsentAgreedAt ฝั่ง production (gas/ServiceHistory.gs)
  const consentAgreedAt = payload.rawAnswers && payload.rawAnswers.agreedAt !== undefined
    ? payload.rawAnswers.agreedAt
    : undefined;

  if (payload.serviceId) {
    const idx = database.serviceHistory.findIndex((v) => v.serviceId === payload.serviceId);
    if (idx >= 0) {
      database.serviceHistory[idx] = {
        ...database.serviceHistory[idx],
        ...payload,
        ...(consentAgreedAt !== undefined ? { consentAgreedAt } : {}),
        updatedAt: Date.now()
      };
      db.set(database);
      return { success: true, serviceId: payload.serviceId };
    }
  }

  const serviceId = "S" + String(database.seq.service).padStart(4, "0");
  const visit = {
    createdAt: Date.now(),
    visitDate: Date.now(),
    ...payload,
    ...(consentAgreedAt !== undefined ? { consentAgreedAt } : {}),
    serviceId
  };
  database.serviceHistory.push(visit);
  database.seq.service += 1;
  db.set(database);
  return { success: true, serviceId };
}

export async function ensureVisitFolder(meta) {
  // mock: ของจริง (gas/DriveStorage.gs) จะหา/สร้าง visit folder ใน Google Drive แล้วคืน folderId จริง
  await wait(150);
  requireSession(getToken());
  return { success: true, folderId: "mock-folder" };
}

export async function uploadImage(dataUrl, meta) {
  // mock: ของจริง (gas/DriveStorage.gs) จะใช้ meta.folderId เขียนไฟล์ลง Google Drive แล้วคืน fileUrl จริง
  // ที่นี่แค่ส่ง dataUrl กลับเพื่อ preview
  await wait(150);
  requireSession(getToken());
  return { success: true, url: dataUrl };
}

export async function exportConsentPdf(serviceId) {
  await wait(500);
  requireSession(getToken());
  return { success: true, note: "mock: ของจริงจะสร้างไฟล์ PDF ใน Google Drive แล้วคืนลิงก์" };
}
