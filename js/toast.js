// toast เบา ๆ มุมล่าง — บอกผลสั้น ๆ โดยไม่บล็อกการทำงาน

let hostEl = null;
let hideTimer = null;

function ensureHost() {
  if (hostEl && document.body.contains(hostEl)) return hostEl;
  hostEl = document.createElement("div");
  hostEl.className = "toast-host";
  hostEl.setAttribute("aria-live", "polite");
  document.body.appendChild(hostEl);
  return hostEl;
}

export function showToast(message, options = {}) {
  const text = String(message || "").trim();
  if (!text) return;
  const host = ensureHost();
  const el = document.createElement("div");
  el.className = `toast${options.tone ? ` toast--${options.tone}` : ""}`;
  el.textContent = text;
  host.appendChild(el);

  requestAnimationFrame(() => el.classList.add("is-in"));

  const ms = Number(options.duration) > 0 ? Number(options.duration) : 2600;
  window.setTimeout(() => {
    el.classList.remove("is-in");
    el.classList.add("is-out");
    window.setTimeout(() => el.remove(), 220);
  }, ms);

  if (hideTimer) clearTimeout(hideTimer);
}
