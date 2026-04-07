import React from 'react';
import { Modal, Button } from 'react-bootstrap';

/**
 * UserGuideModal component provides a comprehensive guide for users to understand
 * the core functionalities of BookBounty.
 *
 * @param {Object} props - Component props.
 * @param {boolean} props.show - Whether the modal is visible.
 * @param {Function} props.onHide - Callback to close the modal.
 * @returns {JSX.Element} The rendered modal component.
 */
const UserGuideModal = ({ show, onHide }) => {
  return (
    <Modal show={show} onHide={onHide} size="lg" centered scrollable>
      <Modal.Header closeButton className="bg-dark text-white">
        <Modal.Title className="d-flex align-items-center">
          <i className="bi bi-bookmark-star-fill me-2" style={{ color: '#ffc107' }}></i>
          BookBounty User Guide
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-4">
        <section className="mb-4">
          <h5 className="d-flex align-items-center mb-3">
            <i className="bi bi-bullseye text-primary me-2"></i>
            Setting Goals
          </h5>
          <p className="text-muted">
            Start by setting a Culling Goal on your Dashboard. Whether you're moving, downsizing, or
            just organizing, defining your goal helps the AI provide better recommendations tailored
            to your space constraints.
          </p>
        </section>

        <section className="mb-4">
          <h5 className="d-flex align-items-center mb-3">
            <i className="bi bi-upc-scan text-success me-2"></i>
            Scanning Books
          </h5>
          <p className="text-muted">
            Use the Triage Wizard to scan your books. You can use your device's camera to scan the
            ISBN barcode on the back of the book or manually enter the ISBN. BookBounty will
            automatically fetch the book's metadata and cover image.
          </p>
        </section>

        <section className="mb-4">
          <h5 className="d-flex align-items-center mb-3">
            <i className="bi bi-stars text-warning me-2"></i>
            AI Recommendations
          </h5>
          <p className="text-muted">
            Once a book is scanned, our Gemini-powered AI analyzes its value, condition, and your
            current culling goals to recommend an action:{' '}
            <span className="text-success fw-bold">Keep</span>,{' '}
            <span className="text-info fw-bold">Donate</span>,{' '}
            <span className="text-primary fw-bold">Sell</span>, or{' '}
            <span className="text-danger fw-bold">Discard</span>.
          </p>
        </section>

        <section className="mb-4">
          <h5 className="d-flex align-items-center mb-3">
            <i className="bi bi-check2-circle text-info me-2"></i>
            Resolving Records
          </h5>
          <p className="text-muted">
            Track your progress in the Inventory. Once you've physically moved a book to its
            destination (e.g., dropped it off at a donation center), mark the record as "Resolved"
            to keep your active inventory clean.
          </p>
        </section>

        <section>
          <h5 className="d-flex align-items-center mb-3">
            <i className="bi bi-currency-dollar text-primary me-2"></i>
            Selling Books
          </h5>
          <p className="text-muted">
            For books recommended for sale, you can track the asking price and any physical defects.
            BookBounty helps you manage the lifecycle of your collection from scanning to final
            sale.
          </p>
        </section>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Close Guide
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default UserGuideModal;
