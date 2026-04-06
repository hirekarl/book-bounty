import React from 'react';
import { Toast, ToastContainer } from 'react-bootstrap';
import { useNotification } from '../../contexts/NotificationContext';

const GlobalToast = () => {
  const { notifications, removeNotification } = useNotification();

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return 'bi-check-circle-fill';
      case 'info':
        return 'bi-info-circle-fill';
      case 'warning':
        return 'bi-exclamation-triangle-fill';
      case 'danger':
        return 'bi-x-circle-fill';
      default:
        return 'bi-bell-fill';
    }
  };

  return (
    <ToastContainer position="top-end" className="p-3" style={{ zIndex: 1060 }}>
      {notifications.map((notification) => (
        <Toast
          key={notification.id}
          onClose={() => removeNotification(notification.id)}
          bg={notification.type}
          delay={notification.duration}
          autohide={notification.duration > 0}
          role="alert"
          aria-live="polite"
        >
          <Toast.Header closeButton>
            <i className={`bi ${getIcon(notification.type)} me-2`}></i>
            <strong className="me-auto">Notification</strong>
          </Toast.Header>
          <Toast.Body className={notification.type === 'warning' ? 'text-dark' : 'text-white'}>
            {notification.message}
          </Toast.Body>
        </Toast>
      ))}
    </ToastContainer>
  );
};

export default GlobalToast;
