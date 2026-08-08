// mockApi.js — จำลองฟังก์ชันฝั่งเซิร์ฟเวอร์ (Apps Script) ด้วย Promise
// ชื่อฟังก์ชันตั้งให้ตรงกับ implementation-plan-phase1.md ทุกตัว
// เมื่อจะต่อ Google Sheets/Drive จริง: เขียน Code.gs/Customers.gs/ServiceHistory.gs/DriveStorage.gs
// ตามชื่อฟังก์ชันเดียวกันนี้ แล้วเปลี่ยนจุดเรียกใช้ในหน้าจอ js/screens/*.js จาก import ที่นี่
// เป็น wrapper ที่เรียก google.script.run แทน (โครงสร้างพารามิเตอร์/ผลลัพธ์ไม่ต้องเปลี่ยน)

import { db } from "./data/mockData.js?v=20260808ag";
import { AUTH_CONFIG } from "./data/authConfig.js?v=20260808ag";
import { getToken, sessionExpired } from "./session.js?v=20260808ag";
import { isResumableVisitStatus, normalizeVisitStatus } from "./utils.js?v=20260808ag";
import { buildConsentPdfHtml, loadLogoDataUri } from "./consentPdfHtml.js?v=20260808ao";

const DELAY = 250; // จำลอง network latency ให้เห็น loading state จริง

function wait(ms = DELAY) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function visitActivityAt(visit) {
  return Number(visit?.updatedAt || visit?.createdAt || visit?.visitDate) || 0;
}

function withCustomerVisitStats(customer, visits) {
  const sorted = [...(visits || [])].sort((a, b) => visitActivityAt(b) - visitActivityAt(a));
  const lastVisit = sorted[0] || null;
  const openVisit = sorted.find((v) => isResumableVisitStatus(v.status)) || null;
  return {
    ...customer,
    visitsCount: sorted.length,
    lastVisitDate: lastVisit ? lastVisit.visitDate : null,
    lastTechnique: lastVisit ? (lastVisit.technique || lastVisit.serviceType || "-") : "-",
    lastVisitStatus: lastVisit ? normalizeVisitStatus(lastVisit.status) : null,
    openVisitStatus: openVisit ? normalizeVisitStatus(openVisit.status) : null
  };
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
  const { customers, serviceHistory } = db.get();
  return customers
    .filter((c) => {
      const nameHit = `${c.fullName || ""} ${c.nickname || ""}`.toLowerCase().includes(q);
      const lineHit = (c.line || "").toLowerCase().includes(q);
      const phoneHit = qPhone.length >= 3 && c.phoneNormalized.includes(qPhone);
      return nameHit || lineHit || phoneHit;
    })
    .map((c) => withCustomerVisitStats(
      c,
      serviceHistory.filter((v) => v.customerId === c.customerId)
    ));
}

export async function listRecentCustomers(limit) {
  await wait();
  requireSession(getToken());
  const max = limit || 10;
  const { customers, serviceHistory } = db.get();
  const visitsByCustomerId = {};

  serviceHistory.forEach((visit) => {
    const customerId = visit.customerId;
    if (!customerId) return;
    if (!visitsByCustomerId[customerId]) visitsByCustomerId[customerId] = [];
    visitsByCustomerId[customerId].push(visit);
  });

  return customers
    .map((c) => {
      const visits = visitsByCustomerId[c.customerId] || [];
      const enriched = withCustomerVisitStats(c, visits);
      return {
        ...enriched,
        lastActivityAt: visits.length
          ? Math.max(...visits.map(visitActivityAt))
          : (Number(c.createdAt) || 0)
      };
    })
    .sort((a, b) => (b.lastActivityAt || 0) - (a.lastActivityAt || 0))
    .slice(0, max)
    .map(({ lastActivityAt, ...c }) => c);
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
    .map((c) => withCustomerVisitStats(
      c,
      serviceHistory.filter((v) => v.customerId === c.customerId)
    ))
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

function compareVisitsForHistory(a, b) {
  const resumable = (visit) => ["draft", "in_progress"].includes(normalizeVisitStatus(visit?.status)) ? 1 : 0;
  const activityTime = (visit) => Number(visit?.updatedAt || visit?.createdAt || visit?.visitDate) || 0;
  const visitTime = (visit) => Number(visit?.visitDate) || 0;
  return (
    resumable(b) - resumable(a) ||
    activityTime(b) - activityTime(a) ||
    visitTime(b) - visitTime(a)
  );
}

export async function getHistoryByCustomer(customerId) {
  await wait();
  requireSession(getToken());
  const { serviceHistory } = db.get();
  return serviceHistory
    .filter((v) => v.customerId === customerId)
    .sort(compareVisitsForHistory);
}

// สร้าง Visit ใหม่หลังเลือก Form 1/2/3 แล้ว — สถานะเริ่มต้นเสมอคือ "in_progress"
// คืน visitId (= serviceId) กลับไปให้หน้าฟอร์มถัดไปใช้เป็น payload.serviceId ตอนบันทึกแบบร่าง/ปิด Visit
// เพื่ออัปเดตแถวเดิมแทนการสร้างแถวซ้ำ (ดู saveVisit ด้านล่าง)
export async function createVisit({ customerId, zervaBookingId, visitDate, timeSlot, serviceType, formType }) {
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
    status: "in_progress",
    serviceType: serviceType || null,
    formType: formType || null,
    createdAt: Date.now()
  };
  database.serviceHistory.push(visit);
  database.seq.service += 1;
  db.set(database);
  return { success: true, visitId, visit };
}

// ปิด Visit ด้วยสถานะ "not_served" — บังคับกรอกเหตุผล ไม่บังคับ Consent/ลายเซ็น/รายละเอียดการทำ/รูปหลังทำ
export async function closeVisitNotServed(visitId, reason) {
  await wait(200);
  requireSession(getToken());
  const database = db.get();
  const idx = database.serviceHistory.findIndex((v) => v.serviceId === visitId);
  if (idx < 0) return { success: false };
  database.serviceHistory[idx] = {
    ...database.serviceHistory[idx],
    status: "not_served",
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
  await wait(300);
  requireSession(getToken());
  if (!serviceId) {
    return { success: false, error: "missing_service_id", note: "ไม่พบ Service ID สำหรับ export PDF" };
  }

  const database = db.get();
  const visit = (database.serviceHistory || []).find((v) => String(v.serviceId) === String(serviceId));
  if (!visit) {
    return { success: false, error: "visit_not_found", note: "ไม่พบข้อมูล Visit นี้" };
  }
  const customer = (database.customers || []).find((c) => String(c.customerId) === String(visit.customerId)) || null;

  // Local: เปิด HTML เลย์เอาต์เต็ม (เหมือนตัวอย่าง Consent — S0007.pdf) แล้วพิมพ์เป็น PDF
  // ไม่ใช้ html2pdf.js — แปลง client-side แล้วเลย์เอาต์เพี้ยน
  const logoSrc = await loadLogoDataUri();
  const html = buildConsentPdfHtml(customer, visit, { logoSrc, autoPrint: true });
  const filename = `Consent — ${serviceId || "export"}.pdf`;
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  return {
    success: true,
    note: "เปิดหน้าต่างพิมพ์แล้ว — เลือก Save as PDF",
    filename,
    url,
    downloadUrl: url,
    preview: true
  };
}
