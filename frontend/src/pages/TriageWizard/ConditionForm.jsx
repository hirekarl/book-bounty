import React from 'react';
import { Card, Button, Form, Row, Col } from 'react-bootstrap';

const CONDITION_GRADES = ['MINT', 'GOOD', 'FAIR', 'POOR'];
const CONDITION_FLAGS = ['Water Damage', 'Torn Pages', 'Spine Damage', 'Annotated', 'Yellowing'];
const flagKey = (f) => f.toUpperCase().replace(' ', '_');

const ConditionForm = ({
  formik,
  handleConditionToggle,
  fetchAiRecommendation,
  aiRec,
  getEbayLink,
  getAmazonLink,
}) => {
  const { values, errors, touched, handleChange, handleBlur, setFieldValue } = formik;

  return (
    <Card className="shadow-sm border-0 mb-4">
      <Card.Header className="bg-white fw-bold py-3 d-flex justify-content-between align-items-center">
        <span>Condition & Details</span>
        {aiRec && (
          <Button variant="outline-warning" size="sm" onClick={fetchAiRecommendation}>
            <i className="bi bi-arrow-clockwise me-1"></i>Re-analyze
          </Button>
        )}
      </Card.Header>
      <Card.Body className="p-4">
        <Form.Group className="mb-4">
          <Form.Label className="fw-bold text-muted small text-uppercase">Overall Grade</Form.Label>
          <div className="d-flex gap-2">
            {CONDITION_GRADES.map((g) => (
              <Button
                key={g}
                variant={values.condition_grade === g ? 'warning' : 'outline-secondary'}
                onClick={() => setFieldValue('condition_grade', g)}
                className="flex-grow-1"
              >
                {g.charAt(0) + g.slice(1).toLowerCase()}
              </Button>
            ))}
          </div>
        </Form.Group>

        <Form.Group className="mb-4">
          <Form.Label className="fw-bold text-muted small text-uppercase">
            Specific Issues
          </Form.Label>
          <div className="d-flex flex-wrap gap-3">
            {CONDITION_FLAGS.map((flag) => (
              <Form.Check
                key={flag}
                type="checkbox"
                id={`check-${flag}`}
                label={flag}
                checked={values.condition_flags.includes(flagKey(flag))}
                onChange={() => handleConditionToggle(flagKey(flag))}
              />
            ))}
          </div>
        </Form.Group>

        <hr className="my-4" />

        {values.status === 'SELL' && (
          <Form.Group className="mb-4" controlId="triage-asking-price">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <Form.Label className="fw-bold text-muted small text-uppercase mb-0">
                Asking Price ($)
              </Form.Label>
              <div className="small">
                <a
                  href={getEbayLink()}
                  target="_blank"
                  rel="noreferrer"
                  className="me-3 text-decoration-none"
                >
                  <i className="bi bi-search me-1"></i>eBay
                </a>
                <a
                  href={getAmazonLink()}
                  target="_blank"
                  rel="noreferrer"
                  className="text-decoration-none"
                >
                  <i className="bi bi-search me-1"></i>Amazon
                </a>
              </div>
            </div>
            <Form.Control
              name="asking_price"
              type="number"
              step="0.01"
              min="0.01"
              required
              placeholder="0.00"
              value={values.asking_price}
              isInvalid={touched.asking_price && !!errors.asking_price}
              aria-invalid={touched.asking_price && !!errors.asking_price}
              onChange={handleChange}
              onBlur={handleBlur}
              size="lg"
              aria-describedby="triage-asking-price-feedback"
            />
            <Form.Control.Feedback type="invalid" id="triage-asking-price-feedback">
              {errors.asking_price}
            </Form.Control.Feedback>
          </Form.Group>
        )}

        {values.status === 'DONATE' && (
          <Form.Group className="mb-4" controlId="triage-donation-dest">
            <Form.Label className="fw-bold text-muted small text-uppercase">
              Donation Destination
            </Form.Label>
            <Form.Control
              name="donation_dest"
              required
              placeholder="e.g. Goodwill, Library"
              value={values.donation_dest}
              isInvalid={touched.donation_dest && !!errors.donation_dest}
              aria-invalid={touched.donation_dest && !!errors.donation_dest}
              onChange={handleChange}
              onBlur={handleBlur}
              aria-describedby="triage-donation-dest-feedback"
            />
            <Form.Control.Feedback type="invalid" id="triage-donation-dest-feedback">
              {errors.donation_dest}
            </Form.Control.Feedback>
          </Form.Group>
        )}

        <Form.Group controlId="triage-notes">
          <Form.Label className="fw-bold text-muted small text-uppercase">Notes</Form.Label>
          <Form.Control
            name="notes"
            as="textarea"
            rows={3}
            placeholder="Add any specific details here..."
            value={values.notes}
            onChange={handleChange}
            onBlur={handleBlur}
          />
        </Form.Group>
      </Card.Body>
    </Card>
  );
};

export default ConditionForm;
