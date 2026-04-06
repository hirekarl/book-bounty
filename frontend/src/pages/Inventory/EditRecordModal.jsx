import React, { useState } from 'react';
import { Modal, Button, Row, Col, Form, Badge } from 'react-bootstrap';

const CONDITION_GRADES = ['MINT', 'GOOD', 'FAIR', 'POOR'];
const CONDITION_FLAGS = ['Water Damage', 'Torn Pages', 'Spine Damage', 'Annotated', 'Yellowing'];
const flagKey = (f) => f.toUpperCase().replace(' ', '_');

const EditRecordModal = ({
  show,
  onHide,
  entry,
  editData,
  setEditData,
  onSave,
  onDelete,
  saving,
}) => {
  const [validated, setValidated] = useState(false);

  // Reset validation when modal opens
  React.useEffect(() => {
    if (show) setValidated(false);
  }, [show]);

  if (!entry) return null;

  const isAskingPriceInvalid =
    editData.status === 'SELL' &&
    (editData.asking_price === '' ||
      isNaN(parseFloat(editData.asking_price)) ||
      parseFloat(editData.asking_price) <= 0);

  const isDonationDestInvalid = editData.status === 'DONATE' && !editData.donation_dest?.trim();

  const handleToggleFlag = (key) => {
    setEditData((prev) => ({
      ...prev,
      condition_flags: prev.condition_flags.includes(key)
        ? prev.condition_flags.filter((f) => f !== key)
        : [...prev.condition_flags, key],
    }));
  };

  const handleSave = (event) => {
    const form = event.currentTarget.closest('.modal-content').querySelector('form');
    const isCustomInvalid = isAskingPriceInvalid || isDonationDestInvalid;

    if (form.checkValidity() === false || isCustomInvalid) {
      event.preventDefault();
      event.stopPropagation();
      setValidated(true);
      return;
    }
    setValidated(true);
    onSave();
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title className="fw-bold">Edit Record</Modal.Title>
      </Modal.Header>
      <Modal.Body className="pt-2">
        <Row>
          <Col md={4} className="text-center mb-3">
            {entry.book.cover_url ? (
              <img
                src={entry.book.cover_url}
                alt=""
                className="img-fluid rounded shadow-sm"
                style={{ maxHeight: '200px' }}
              />
            ) : (
              <div
                className="bg-light rounded d-flex align-items-center justify-content-center mx-auto"
                style={{ height: '200px', width: '140px' }}
              >
                <i className="bi bi-book display-4 text-muted"></i>
              </div>
            )}
            <div className="mt-2 small text-muted">ISBN: {entry.book.isbn}</div>
          </Col>
          <Col md={8}>
            <h5 className="fw-bold mb-1">{entry.book.title}</h5>
            <p className="text-muted mb-3">by {entry.book.author}</p>

            <Form noValidate validated={validated}>
              <Row className="g-3 mb-3">
                <Col md={6}>
                  <Form.Group controlId="edit-status">
                    <Form.Label className="small fw-bold text-muted text-uppercase">
                      Status
                    </Form.Label>
                    <Form.Select
                      value={editData.status}
                      onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                    >
                      <option value="KEEP">Keep</option>
                      <option value="DONATE">Donate</option>
                      <option value="SELL">Sell</option>
                      <option value="DISCARD">Discard</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group controlId="edit-condition">
                    <Form.Label className="small fw-bold text-muted text-uppercase">
                      Condition
                    </Form.Label>
                    <Form.Select
                      value={editData.condition_grade}
                      onChange={(e) =>
                        setEditData({ ...editData, condition_grade: e.target.value })
                      }
                    >
                      {CONDITION_GRADES.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>

              <Form.Group className="mb-3">
                <Form.Label className="small fw-bold text-muted text-uppercase d-block">
                  Condition Flags
                </Form.Label>
                <div className="d-flex flex-wrap gap-2">
                  {CONDITION_FLAGS.map((flag) => {
                    const key = flagKey(flag);
                    const isActive = editData.condition_flags.includes(key);
                    return (
                      <Badge
                        key={flag}
                        bg={isActive ? 'warning' : 'light'}
                        text={isActive ? 'dark' : 'muted'}
                        className={`border cursor-pointer px-2 py-1 ${isActive ? '' : 'opacity-75'}`}
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleToggleFlag(key)}
                      >
                        {flag}
                      </Badge>
                    );
                  })}
                </div>
              </Form.Group>

              {editData.status === 'SELL' && (
                <Form.Group className="mb-3" controlId="edit-asking-price">
                  <Form.Label className="small fw-bold text-muted text-uppercase">
                    Asking Price ($)
                  </Form.Label>
                  <Form.Control
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={editData.asking_price}
                    isInvalid={validated && isAskingPriceInvalid}
                    onChange={(e) => setEditData({ ...editData, asking_price: e.target.value })}
                    aria-describedby="asking-price-feedback"
                  />
                  <Form.Control.Feedback type="invalid" id="asking-price-feedback">
                    Please enter a valid price greater than 0.
                  </Form.Control.Feedback>
                </Form.Group>
              )}

              {editData.status === 'DONATE' && (
                <Form.Group className="mb-3" controlId="edit-donation-dest">
                  <Form.Label className="small fw-bold text-muted text-uppercase">
                    Donation Destination
                  </Form.Label>
                  <Form.Control
                    required
                    value={editData.donation_dest}
                    isInvalid={validated && isDonationDestInvalid}
                    onChange={(e) => setEditData({ ...editData, donation_dest: e.target.value })}
                    aria-describedby="donation-dest-feedback"
                  />
                  <Form.Control.Feedback type="invalid" id="donation-dest-feedback">
                    Please enter a donation destination.
                  </Form.Control.Feedback>
                </Form.Group>
              )}

              <Form.Group className="mb-3" controlId="edit-notes">
                <Form.Label className="small fw-bold text-muted text-uppercase">Notes</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  value={editData.notes}
                  onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Check
                  type="switch"
                  id="resolved-switch"
                  label="Mark as Resolved"
                  checked={editData.is_resolved}
                  onChange={(e) => setEditData({ ...editData, is_resolved: e.target.checked })}
                />
                <Form.Text className="text-muted">
                  {editData.is_resolved
                    ? 'This book will be marked as processed.'
                    : 'This book will remain in your active triage list.'}
                </Form.Text>
              </Form.Group>
            </Form>
          </Col>
        </Row>
      </Modal.Body>
      <Modal.Footer className="border-0 pt-0 justify-content-between">
        <Button variant="outline-danger" onClick={onDelete} size="sm">
          <i className="bi bi-trash3 me-1"></i>Delete Record
        </Button>
        <div className="d-flex gap-2">
          <Button variant="secondary" onClick={onHide}>
            Cancel
          </Button>
          <Button variant="warning" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  );
};

export default EditRecordModal;
