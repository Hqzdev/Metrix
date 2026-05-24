"use client";

import { TOAST_REMOVE_DELAY, type ToastAction, type ToastState } from "./toast-state";
import { reducer } from "./toast-reducer";

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>();
const listeners: Array<(state: ToastState) => void> = [];

let memoryState: ToastState = { toasts: [] };

export function addToastToRemoveQueue(toastId: string) {
  if (toastTimeouts.has(toastId)) {
    return;
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId);
    dispatch({
      type: "REMOVE_TOAST",
      toastId,
    });
  }, TOAST_REMOVE_DELAY);

  toastTimeouts.set(toastId, timeout);
}

export function dispatch(action: ToastAction) {
  if (action.type === "DISMISS_TOAST") {
    if (action.toastId) {
      addToastToRemoveQueue(action.toastId);
    } else {
      memoryState.toasts.forEach((toast) => {
        addToastToRemoveQueue(toast.id);
      });
    }
  }

  memoryState = reducer(memoryState, action);
  listeners.forEach((listener) => {
    listener(memoryState);
  });
}

export function getToastState() {
  return memoryState;
}

export function subscribeToToastState(listener: (state: ToastState) => void) {
  listeners.push(listener);

  return () => {
    const index = listeners.indexOf(listener);

    if (index > -1) {
      listeners.splice(index, 1);
    }
  };
}
