import { checkPasscode } from "../mockApi.js";
import { show, onEnter } from "../router.js";

export function initGate() {
  const input = document.getElementById("passcodeInput");
  const errorEl = document.getElementById("gateError");
  const submitBtn = document.getElementById("gateSubmit");

  async function trySubmit() {
    errorEl.hidden = true;
    submitBtn.disabled = true;
    const res = await checkPasscode(input.value.trim());
    submitBtn.disabled = false;
    if (res.success) {
      input.value = "";
      show("home");
    } else {
      errorEl.hidden = false;
    }
  }

  submitBtn.addEventListener("click", trySubmit);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") trySubmit();
  });

  onEnter("gate", () => {
    input.value = "";
    errorEl.hidden = true;
    input.focus();
  });
}
