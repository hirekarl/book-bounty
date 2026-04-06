import React, { useEffect } from 'react';
import { Modal, Button, Row, Col, Form, Badge } from 'react-bootstrap';
import { useFormik } from 'formik';
import { catalogSchema, validateWithZod } from '../../schemas/catalogSchema';

const CONDITION_GRADES = ['MINT', 'GOOD', 'FAIR', 'POOR'];
const CONDITION_FLAGS = ['Water Damage', 'Torn Pages', 'Spine Damage', 'Annotated', 'Yellowing'];
const flagKey = (f) => f.toUpperCase().replace(' ', '_');

const EditRecordModal = ({ show, onHide, entry, onSave, onDelete, saving }) => {
  const formik = useFormik({
    initialValues: {
      status: 'KEEP',
      condition_grade: 'GOOD',
      condition_flags: [],
      notes: '',
      asking_price: '',
      donation_dest: '',
      is_resolved: false,
    },
    validate: validateWithZod(catalogSchema),
    onSubmit: (values) => {
      onSave(values);
    },
  });

  // Sync Formik with entry when modal opens or entry changes
  useEffect(() => {
    if (show && entry) {
      formik.setValues({
        status: entry.status || 'KEEP',
        condition_grade: entry.condition_grade || 'GOOD',
        condition_flags: [...(entry.condition_flags || [])],
        notes: entry.notes || '',
        asking_price: entry.asking_price || '',
        donation_dest: entry.donation_dest || '',
        is_resolved: !!entry.resolved_at,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, entry]);

  if (!entry) return null;

  const handleToggleFlag = (key) => {
    const currentFlags = formik.values.condition_flags;
    const nextFlags = currentFlags.includes(key)
      ? currentFlags.filter((f) => f !== key)
      : [...currentFlags, key];
    formik.setFieldValue('condition_flags', nextFlags);
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title className="fw-bold">Edit Record</Modal.Title>
      </Modal.Header>
      <Modal.Body className="pt-2">
        <Row>
          <Col md={4} className="text-center mb-3">
            {entry.book.cover_image || entry.book.cover_url ? (
              <img
                src={entry.book.cover_image || entry.book.cover_url}
                alt=""
                className="img-fluid rounded shadow-sm"
                style={{ maxHeight: '200px' }}
                loading="lazy"
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

            <Form noValidate onSubmit={formik.handleSubmit}>
              <Row className="g-3 mb-3">
                <Col md={6}>
                  <Form.Group controlId="edit-status">
                    <Form.Label className="small fw-bold text-muted text-uppercase">
                      Status
                    </Form.Label>
                    <Form.Select
                      name="status"
                      value={formik.values.status}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
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
                      name="condition_grade"
                      value={formik.values.condition_grade}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
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
                    const isActive = formik.values.condition_flags.includes(key);
                    return (
                      <Badge
                        key={flag}
                        bg={isActive ? 'warning' : 'light'}
                        text={isActive ? 'dark' : 'muted'}
                        className={`border cursor-pointer px-2 py-1 ${isActive ? '' : 'opacity-75'}`}
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleToggleFlag(key)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleToggleFlag(key);
                          }
                        }}
                        role="button"
                        tabIndex="0"
                        aria-pressed={isActive}
                      >
                        {flag}
                      </Badge>
                    );
                  })}
                </div>
              </Form.Group>

              {formik.values.status === 'SELL' && (
                <Form.Group className="mb-3" controlId="edit-asking-price">
                  <Form.Label className="small fw-bold text-muted text-uppercase">
                    Asking Price ($)
                  </Form.Label>
                  <Form.Control
                    name="asking_price"
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={formik.values.asking_price}
                    isInvalid={formik.touched.asking_price && !!formik.errors.asking_price}
                    aria-invalid={formik.touched.asking_price && !!formik.errors.asking_price}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    aria-describedby="asking-price-feedback"
                  />
                  <Form.Control.Feedback type="invalid" id="asking-price-feedback">
                    {formik.errors.asking_price}
                  </Form.Control.Feedback>
                </Form.Group>
              )}

              {formik.values.status === 'DONATE' && (
                <Form.Group className="mb-3" controlId="edit-donation-dest">
                  <Form.Label className="small fw-bold text-muted text-uppercase">
                    Donation Destination
                  </Form.Label>
                  <Form.Control
                    name="donation_dest"
                    required
                    value={formik.values.donation_dest}
                    isInvalid={formik.touched.donation_dest && !!formik.errors.donation_dest}
                    aria-invalid={formik.touched.donation_dest && !!formik.errors.donation_dest}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    aria-describedby="donation-dest-feedback"
                  />
                  <Form.Control.Feedback type="invalid" id="donation-dest-feedback">
                    {formik.errors.donation_dest}
                  </Form.Control.Feedback>
                </Form.Group>
              )}

              <Form.Group className="mb-3" controlId="edit-notes">
                <Form.Label className="small fw-bold text-muted text-uppercase">Notes</Form.Label>
                <Form.Control
                  name="notes"
                  as="textarea"
                  rows={2}
                  value={formik.values.notes}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Check
                  name="is_resolved"
                  type="switch"
                  id="resolved-switch"
                  label="Mark as Resolved"
                  checked={formik.values.is_resolved}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                />
                <Form.Text className="text-muted">
                  {formik.values.is_resolved
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
          <Button variant="warning" onClick={formik.handleSubmit} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  );
};

export default EditRecordModal;
