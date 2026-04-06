import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { setErrorHandler } from '../services/api';

const NotificationContext = createContext({
  showNotification: () => {},
});

export const useNotification = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const removeNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const showNotification = useCallback(
    ({ message, type = 'info', duration = 3000 }) => {
      const id = Date.now();
      const newNotification = { id, message, type, duration };

      setNotifications((prev) => [...prev, newNotification]);

      if (duration > 0) {
        setTimeout(() => {
          removeNotification(id);
        }, duration);
      }
    },
    [removeNotification],
  );

  useEffect(() => {
    setErrorHandler((message) => {
      showNotification({ message, type: 'danger', duration: 5000 });
    });
    return () => setErrorHandler(null);
  }, [showNotification]);

  return (
    <NotificationContext.Provider value={{ showNotification, notifications, removeNotification }}>
      {children}
    </NotificationContext.Provider>
  );
};
