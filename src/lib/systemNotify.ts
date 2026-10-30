export type NoticeKind = 'success' | 'info' | 'warning' | 'error';

export interface SystemToast {
  id: string;
  kind: NoticeKind;
  title: string;
  message?: string;
}

export interface SystemConfirmRequest {
  id: string;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  resolve: (ok: boolean) => void;
}

type ToastListener = (toasts: SystemToast[]) => void;
type ConfirmListener = (request: SystemConfirmRequest | null) => void;

const toasts: SystemToast[] = [];
const toastListeners = new Set<ToastListener>();
const confirmListeners = new Set<ConfirmListener>();
let activeConfirm: SystemConfirmRequest | null = null;

function emitToasts() {
  toastListeners.forEach((listener) => listener([...toasts]));
}

function emitConfirm() {
  confirmListeners.forEach((listener) => listener(activeConfirm));
}

export const notify = {
  subscribeToasts(listener: ToastListener) {
    toastListeners.add(listener);
    listener([...toasts]);
    return () => toastListeners.delete(listener);
  },
  subscribeConfirm(listener: ConfirmListener) {
    confirmListeners.add(listener);
    listener(activeConfirm);
    return () => confirmListeners.delete(listener);
  },
  toast(kind: NoticeKind, title: string, message?: string) {
    const item: SystemToast = {
      id: `NTC-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      kind,
      title,
      message
    };
    toasts.push(item);
    emitToasts();
    window.setTimeout(() => {
      const idx = toasts.findIndex((entry) => entry.id === item.id);
      if (idx >= 0) {
        toasts.splice(idx, 1);
        emitToasts();
      }
    }, 4200);
  },
  success(title: string, message?: string) {
    this.toast('success', title, message);
  },
  info(title: string, message?: string) {
    this.toast('info', title, message);
  },
  warning(title: string, message?: string) {
    this.toast('warning', title, message);
  },
  error(title: string, message?: string) {
    this.toast('error', title, message);
  },
  dismiss(id: string) {
    const idx = toasts.findIndex((entry) => entry.id === id);
    if (idx >= 0) {
      toasts.splice(idx, 1);
      emitToasts();
    }
  },
  confirm(title: string, message: string, confirmLabel = 'Confirm', cancelLabel = 'Cancel'): Promise<boolean> {
    return new Promise((resolve) => {
      if (activeConfirm) activeConfirm.resolve(false);
      activeConfirm = {
        id: `CNF-${Date.now()}`,
        title,
        message,
        confirmLabel,
        cancelLabel,
        resolve: (ok) => {
          activeConfirm = null;
          emitConfirm();
          resolve(ok);
        }
      };
      emitConfirm();
    });
  }
};

export function firstNameOf(fullName?: string, email?: string): string {
  const name = (fullName || '').trim().split(/\s+/)[0];
  return name || email || 'there';
}

export function welcomeUser(fullName?: string, email?: string) {
  const name = firstNameOf(fullName, email);
  notify.success('Hi, welcome', `Hi, welcome ${name}. Your workspace is ready.`);
}

export function goodbyeUser(fullName?: string, email?: string) {
  const name = firstNameOf(fullName, email);
  notify.info('Goodbye', `Goodbye, ${name}. See you next time.`);
}
