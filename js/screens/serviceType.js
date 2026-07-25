import { show, onEnter } from "../router.js";
import { state } from "../state.js";

export function initServiceType() {
  document.getElementById("chooseBrowBtn").addEventListener("click", () => {
    state.serviceType = "สักคิ้ว";
    state.resetVisitDraft();
    state.browStepIndex = 0;
    show("formBrow");
  });

  document.getElementById("chooseTouchupBtn").addEventListener("click", () => {
    state.serviceType = "เติมสี";
    state.resetVisitDraft();
    show("formTouchup");
  });

  onEnter("serviceType", () => {});
}
