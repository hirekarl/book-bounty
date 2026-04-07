import React from 'react';
import { Modal, Button } from 'react-bootstrap';

const ConfirmModal = ({
  show,
  onConfirm,
  onCancel,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  confirmVariant = 'danger',
}) => (
  <Modal show={show} onHide={onCancel} size="sm" centered>
    <Modal.Header closeButton className="border-0 pb-0">
      <Modal.Title className="fs-6 fw-bold">{title}</Modal.Title>
    </Modal.Header>
    {message && <Modal.Body className="pt-1 text-muted small">{message}</Modal.Body>}
    <Modal.Footer className="border-0 pt-0 gap-2">
      <Button variant="secondary" size="sm" onClick={onCancel}>
        Cancel
      </Button>
      <Button variant={confirmVariant} size="sm" onClick={onConfirm}>
        {confirmLabel}
      </Button>
    </Modal.Footer>
  </Modal>
);

export default ConfirmModal;
