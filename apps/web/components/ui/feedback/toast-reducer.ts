"use client";

import {
  TOAST_LIMIT,
  type ToastAction,
  type ToastState,
} from "./toast-state";

export const reducer = (state: ToastState, action: ToastAction): ToastState => {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      };

    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((toast) =>
          toast.id === action.toast.id ? { ...toast, ...action.toast } : toast,
        ),
      };

    case "DISMISS_TOAST": {
      const { toastId } = action;

      return {
        ...state,
        toasts: state.toasts.map((toast) =>
          toast.id === toastId || toastId === undefined
            ? { ...toast, open: false }
            : toast,
        ),
      };
    }

    case "REMOVE_TOAST":
      if (action.toastId === undefined) {
        return { ...state, toasts: [] };
      }

      return {
        ...state,
        toasts: state.toasts.filter((toast) => toast.id !== action.toastId),
      };
  }
};
