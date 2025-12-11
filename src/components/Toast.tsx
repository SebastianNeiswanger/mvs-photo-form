import { useState, useEffect, useCallback } from 'react';

export type ToastType = 'loading' | 'success' | 'error';

export interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
}

let toastId = 0;
let addToastCallback: ((message: string, type: ToastType) => number) | null = null;
let removeToastCallback: ((id: number) => void) | null = null;
let updateToastCallback: ((id: number, message: string, type: ToastType) => void) | null = null;

// External API for showing toasts
export const toast = {
  loading: (message: string): number => {
    if (addToastCallback) {
      return addToastCallback(message, 'loading');
    }
    return -1;
  },
  success: (message: string): number => {
    if (addToastCallback) {
      return addToastCallback(message, 'success');
    }
    return -1;
  },
  error: (message: string): number => {
    if (addToastCallback) {
      return addToastCallback(message, 'error');
    }
    return -1;
  },
  dismiss: (id: number): void => {
    if (removeToastCallback) {
      removeToastCallback(id);
    }
  },
  update: (id: number, message: string, type: ToastType): void => {
    if (updateToastCallback) {
      updateToastCallback(id, message, type);
    }
  }
};

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((message: string, type: ToastType): number => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, message, type }]);

    // Auto-dismiss success and error toasts after 4 seconds
    if (type !== 'loading') {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 4000);
    }

    return id;
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const updateToast = useCallback((id: number, message: string, type: ToastType) => {
    setToasts(prev => prev.map(t =>
      t.id === id ? { ...t, message, type } : t
    ));

    // Auto-dismiss after update if not loading
    if (type !== 'loading') {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 4000);
    }
  }, []);

  // Register callbacks
  useEffect(() => {
    addToastCallback = addToast;
    removeToastCallback = removeToast;
    updateToastCallback = updateToast;

    return () => {
      addToastCallback = null;
      removeToastCallback = null;
      updateToastCallback = null;
    };
  }, [addToast, removeToast, updateToast]);

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          {t.type === 'loading' && <span className="toast-spinner" />}
          {t.type === 'success' && <span className="toast-icon">&#10003;</span>}
          {t.type === 'error' && <span className="toast-icon">&#10007;</span>}
          <span className="toast-message">{t.message}</span>
        </div>
      ))}
    </div>
  );
}
