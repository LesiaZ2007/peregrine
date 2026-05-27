'use client';
import { useState, useCallback, createContext, useContext, useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 3500) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <div style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        maxWidth: 360,
      }}>
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onRemove }) {
  const icons = {
    success: <CheckCircle size={16} color="var(--green)" />,
    error:   <AlertCircle size={16} color="var(--red)" />,
    info:    <Info size={16} color="var(--blue)" />,
  };
  const borderColors = {
    success: 'var(--green)',
    error:   'var(--red)',
    info:    'var(--blue)',
  };

  return (
    <div style={{
      background: 'var(--surface)',
      border: `1.5px solid var(--border)`,
      borderLeft: `4px solid ${borderColors[toast.type] || borderColors.info}`,
      borderRadius: 'var(--r)',
      boxShadow: 'var(--shadow-md)',
      padding: '12px 14px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: 10,
      animation: 'slide-up .2s var(--ease)',
    }}>
      <span style={{ flexShrink: 0, marginTop: 1 }}>{icons[toast.type] || icons.info}</span>
      <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--text-2)', lineHeight: 1.5 }}>
        {toast.message}
      </span>
      <button
        onClick={() => onRemove(toast.id)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)', padding: 2, flexShrink: 0 }}
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

export default ToastProvider;
