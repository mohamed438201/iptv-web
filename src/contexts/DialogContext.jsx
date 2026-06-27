import React, { createContext, useContext, useState, useCallback } from 'react';
import './Dialog.css';

const DialogContext = createContext(null);

export const useDialog = () => useContext(DialogContext);

export const DialogProvider = ({ children }) => {
  const [dialogs, setDialogs] = useState([]);

  const confirm = useCallback((message) => {
    return new Promise((resolve) => {
      const id = Date.now().toString() + Math.random().toString();
      setDialogs(prev => [...prev, {
        id,
        type: 'confirm',
        message,
        onConfirm: () => {
          setDialogs(prev => prev.filter(d => d.id !== id));
          resolve(true);
        },
        onCancel: () => {
          setDialogs(prev => prev.filter(d => d.id !== id));
          resolve(false);
        }
      }]);
    });
  }, []);

  const alert = useCallback((message) => {
    return new Promise((resolve) => {
      const id = Date.now().toString() + Math.random().toString();
      setDialogs(prev => [...prev, {
        id,
        type: 'alert',
        message,
        onConfirm: () => {
          setDialogs(prev => prev.filter(d => d.id !== id));
          resolve(true);
        }
      }]);
    });
  }, []);

  return (
    <DialogContext.Provider value={{ confirm, alert }}>
      {children}
      {dialogs.length > 0 && (
        <div className="custom-dialog-overlay">
          {dialogs.map(dialog => (
            <div key={dialog.id} className="custom-dialog-box fade-in-scale">
              <div className="custom-dialog-content">
                <p>{dialog.message}</p>
              </div>
              <div className="custom-dialog-actions">
                {dialog.type === 'confirm' && (
                  <button className="btn-dialog-cancel" onClick={dialog.onCancel}>Cancel</button>
                )}
                <button className="btn-dialog-confirm" onClick={dialog.onConfirm}>OK</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </DialogContext.Provider>
  );
};
