let appDialogOverlayEl;
let appDialogEl;
let appDialogTitleEl;
let appDialogBodyEl;
let appDialogFieldEl;
let appDialogLabelEl;
let appDialogInputEl;
let appDialogErrorEl;
let appDialogOkBtn;
let appDialogCancelBtn;
let appDialogCloseBtn;
let appDialogActiveResolver = null;
let appDialogActiveOptions = null;

function setHidden(el, hidden) {
  if (el) el.hidden = hidden;
}

function closeDialog(value) {
  if (!appDialogOverlayEl || !appDialogActiveResolver) return;
  const resolve = appDialogActiveResolver;
  appDialogActiveResolver = null;
  appDialogActiveOptions = null;
  appDialogOverlayEl.hidden = true;
  resolve(value);
}

function openDialog(options) {
  if (!appDialogOverlayEl) {
    return Promise.resolve(options.mode === "confirm" ? false : options.mode === "prompt" ? null : undefined);
  }
  if (appDialogActiveResolver) closeDialog(null);

  appDialogActiveOptions = options;
  appDialogTitleEl.textContent = options.title || "แจ้งเตือน";
  appDialogBodyEl.textContent = options.message || "";
  appDialogOkBtn.textContent = options.okText || "OK";
  appDialogCancelBtn.textContent = options.cancelText || "Cancel";
  setHidden(appDialogCancelBtn, options.mode === "alert");
  setHidden(appDialogCloseBtn, options.closeButton === false);
  setHidden(appDialogErrorEl, true);
  appDialogErrorEl.textContent = "";

  const isPrompt = options.mode === "prompt";
  setHidden(appDialogFieldEl, !isPrompt);
  if (isPrompt) {
    appDialogLabelEl.textContent = options.inputLabel || "";
    appDialogInputEl.value = options.defaultValue || "";
    appDialogInputEl.placeholder = options.placeholder || "";
  }

  appDialogOverlayEl.hidden = false;
  requestAnimationFrame(() => (isPrompt ? appDialogInputEl : appDialogOkBtn).focus());

  return new Promise((resolve) => {
    appDialogActiveResolver = resolve;
  });
}

export function initDialogs() {
  appDialogOverlayEl = document.getElementById("appDialogOverlay");
  appDialogEl = document.getElementById("appDialog");
  appDialogTitleEl = document.getElementById("appDialogTitle");
  appDialogBodyEl = document.getElementById("appDialogBody");
  appDialogFieldEl = document.getElementById("appDialogField");
  appDialogLabelEl = document.getElementById("appDialogInputLabel");
  appDialogInputEl = document.getElementById("appDialogInput");
  appDialogErrorEl = document.getElementById("appDialogError");
  appDialogOkBtn = document.getElementById("appDialogOk");
  appDialogCancelBtn = document.getElementById("appDialogCancel");
  appDialogCloseBtn = document.getElementById("appDialogClose");
  if (!appDialogOverlayEl || !appDialogEl) return;

  appDialogEl.addEventListener("submit", (e) => {
    e.preventDefault();
    if (appDialogActiveOptions?.mode === "prompt") {
      const value = appDialogInputEl.value.trim();
      if (appDialogActiveOptions.required && !value) {
        appDialogErrorEl.textContent = appDialogActiveOptions.requiredMessage || "กรุณากรอกข้อมูล";
        appDialogErrorEl.hidden = false;
        appDialogInputEl.focus();
        return;
      }
      closeDialog(value);
      return;
    }
    closeDialog(appDialogActiveOptions?.mode === "confirm" ? true : undefined);
  });

  appDialogCancelBtn.addEventListener("click", () => closeDialog(appDialogActiveOptions?.mode === "confirm" ? false : null));
  appDialogCloseBtn.addEventListener("click", () => closeDialog(appDialogActiveOptions?.mode === "confirm" ? false : null));
  appDialogOverlayEl.addEventListener("click", (e) => {
    if (e.target === appDialogOverlayEl) closeDialog(appDialogActiveOptions?.mode === "confirm" ? false : null);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && appDialogOverlayEl && !appDialogOverlayEl.hidden) {
      closeDialog(appDialogActiveOptions?.mode === "confirm" ? false : null);
    }
  });
}

export function appAlert(message, options = {}) {
  return openDialog({ ...options, mode: "alert", message });
}

export function appConfirm(message, options = {}) {
  return openDialog({ ...options, mode: "confirm", message });
}

export function appPrompt(message, options = {}) {
  return openDialog({ ...options, mode: "prompt", message });
}
