// signaturePad.js — canvas เซ็นชื่อแบบง่าย รองรับ touch/pen บน iPad Safari

export function createSignaturePad(canvas) {
  const ctx = canvas.getContext("2d");
  let drawing = false;
  let hasInk = false;
  let last = null;

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const newWidth = Math.round(rect.width * ratio);
    const newHeight = Math.round(rect.height * ratio);
    // ตั้ง canvas.width/height ล้างรูปที่วาดไว้เสมอ (พฤติกรรมมาตรฐานของ canvas) — ถ้าขนาดจริงไม่ได้เปลี่ยน
    // (เช่น resize event หลอกจากแถบเครื่องมือ Safari บน iOS ที่ย่อ/ขยายตอนเลื่อนหน้าจอ) ให้ข้ามไปเลย
    // กันลายเซ็นลูกค้าหายเงียบ ๆ ทั้งที่ hasInk ยังเป็น true อยู่ (isEmpty() จะโกหกว่ามีลายเซ็น)
    if (newWidth === canvas.width && newHeight === canvas.height) return;
    const snapshot = hasInk ? canvas.toDataURL("image/png") : null;
    canvas.width = newWidth;
    canvas.height = newHeight;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = (getComputedStyle(document.documentElement).getPropertyValue("--espresso-ink").trim()) || "#261F1C";
    if (snapshot) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, rect.width, rect.height);
      img.src = snapshot;
    }
  }
  resize();
  window.addEventListener("resize", resize);

  function pos(e) {
    const rect = canvas.getBoundingClientRect();
    const point = e.touches ? e.touches[0] : e;
    return { x: point.clientX - rect.left, y: point.clientY - rect.top };
  }

  function start(e) {
    e.preventDefault();
    drawing = true;
    last = pos(e);
  }
  function move(e) {
    if (!drawing) return;
    e.preventDefault();
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last = p;
    hasInk = true;
  }
  function end() { drawing = false; }

  canvas.addEventListener("mousedown", start);
  canvas.addEventListener("mousemove", move);
  window.addEventListener("mouseup", end);
  canvas.addEventListener("touchstart", start, { passive: false });
  canvas.addEventListener("touchmove", move, { passive: false });
  canvas.addEventListener("touchend", end);

  return {
    clear() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      hasInk = false;
    },
    isEmpty() { return !hasInk; },
    toDataURL() { return canvas.toDataURL("image/png"); }
  };
}
