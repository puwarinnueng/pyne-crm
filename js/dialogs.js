let overlay;
let dialog;
let titleEl;
let bodyEl;
let fieldEl;
let labelEl;
let inputEl;
let errorEl;
let okBtn;
let cancelBtn;
let closeBtn;
let activeResolver = null;
let activeOptions = null;

function setHidden(el, hidden) {
  if (el) el.hidden = hidden;
}

function closeDialog(value) {
  if (!overlay || !activeResolver) return;
  const resolve = activeResolver;
  activeResolver = null;
  activeOptions = null;
  overlay.hidden = true;
  resolve(value);
}

function openDialog(options) {
  if (!overlay) {
    return Promise.resolve(options.mode === "confirm" ? false : options.mode === "prompt" ? null : undefined);
  }
  if (activeResolver) closeDialog(null);

  activeOptions = options;
  titleEl.textContent = options.title || "แจ้งเตือน";
  bodyEl.textContent = options.message || "";
  okBtn.textContent = options.okText || "OK";
  cancelBtn.textContent = options.cancelText || "Cancel";
  setHidden(cancelBtn, options.mode === "alert");
  setHidden(closeBtn, options.closeButton === false);
  setHidden(errorEl, true);
  errorEl.textContent = "";

  const isPrompt = options.mode === "prompt";
  setHidden(fieldEl, !isPrompt);
  if (isPrompt) {
    labelEl.textContent = options.inputLabel || "";
    inputEl.value = options.defaultValue || "";
    inputEl.placeholder = options.placeholder || "";
  }

  overlay.hidden = false;
  requestAnimationFrame(() => (isPrompt ? inputEl : okBtn).focus());

  return new Promise((resolve) => {
    activeResolver = resolve;
  });
}

export function initDialogs() {
  overlay = document.getElementById("appDialogOverlay");
  dialog = document.getElementById("appDialog");
  titleEl = document.getElementById("appDialogTitle");
  bodyEl = document.getElementById("appDialogBody");
  fieldEl = document.getElementById("appDialogField");
  labelEl = document.getElementById("appDialogInputLabel");
  inputEl = document.getElementById("appDialogInput");
  errorEl = document.getElementById("appDialogError");
  okBtn = document.getElementById("appDialogOk");
  cancelBtn = document.getElementById("appDialogCancel");
  closeBtn = document.getElementById("appDialogClose");
  if (!overlay || !dialog) return;

  dialog.addEventListener("submit", (e) => {
    e.preventDefault();
    if (activeOptions?.mode === "prompt") {
      const value = inputEl.value.trim();
      if (activeOptions.required && !value) {
        errorEl.textContent = activeOptions.requiredMessage || "กรุณากรอกข้อมูล";
        errorEl.hidden = false;
        inputEl.focus();
        return;
      }
      closeDialog(value);
      return;
    }
    closeDialog(activeOptions?.mode === "confirm" ? true : undefined);
  });

  cancelBtn.addEventListener("click", () => closeDialog(activeOptions?.mode === "confirm" ? false : null));
  closeBtn.addEventListener("click", () => closeDialog(activeOptions?.mode === "confirm" ? false : null));
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeDialog(activeOptions?.mode === "confirm" ? false : null);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay && !overlay.hidden) {
      closeDialog(activeOptions?.mode === "confirm" ? false : null);
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
