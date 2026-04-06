import React, { useState, useEffect } from 'react';
import {
  Modal,
  Button,
  Row,
  Col,
  Form,
  Card,
  Spinner,
  Alert,
  Badge,
  ListGroup,
} from 'react-bootstrap';
import { useFormik } from 'formik';
import { updateCatalogEntry, getBulkRecommendation } from '../../services/api';
import { StatusBadge } from '../../components/common/Badge';

const BulkReviewModal = ({ show, onHide, selectedEntries, onComplete }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const formik = useFormik({
    initialValues: {
      items: {},
    },
    onSubmit: async (values) => {
      setSaving(true);
      setError(null);
      try {
        const promises = Object.keys(values.items).map((id) => {
          const item = values.items[id];
          const payload = {
            status: item.status,
            condition_grade: item.condition_grade,
            condition_flags: item.condition_flags,
            notes: item.notes,
            asking_price: item.status === 'SELL' ? item.asking_price : null,
            donation_dest: item.status === 'DONATE' ? item.donation_dest : '',
            resolved_at: item.is_resolved ? new Date().toISOString() : null,
          };
          return updateCatalogEntry(id, payload);
        });
        await Promise.all(promises);
        onComplete();
      } catch (err) {
        setError('Failed to save some changes. Please try again.');
        console.error(err);
      } finally {
        setSaving(false);
      }
    },
  });

  useEffect(() => {
    if (show && selectedEntries.length > 0) {
      setLoading(true);
      setError(null);
      getBulkRecommendation(selectedEntries.map((e) => e.id))
        .then((res) => {
          const suggestions = res.data;
          const initialItems = {};
          selectedEntries.forEach((entry) => {
            const suggestion = suggestions[entry.id];
            initialItems[entry.id] = {
              status: suggestion?.status || entry.status || 'KEEP',
              condition_grade: entry.condition_grade || 'GOOD',
              condition_flags: [...(entry.condition_flags || [])],
              notes: suggestion?.reasoning || entry.notes || '',
              asking_price: suggestion?.suggested_price || entry.asking_price || '',
              donation_dest: entry.donation_dest || '',
              is_resolved: true,
              ai_status: suggestion?.status,
              ai_reason: suggestion?.reasoning,
              confidence: suggestion?.confidence,
            };
          });
          formik.setValues({ items: initialItems });
          setLoading(false);
        })
        .catch(() => {
          setError('Failed to fetch AI recommendations.');
          setLoading(false);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  const handleApplyAISuggestion = (id) => {
    const item = formik.values.items[id];
    if (item.ai_status) {
      formik.setFieldValue(`items.${id}.status`, item.ai_status);
      if (item.ai_reason) {
        formik.setFieldValue(`items.${id}.notes`, item.ai_reason);
      }
    }
  };

  const handleStatusChange = (id, newStatus) => {
    formik.setFieldValue(`items.${id}.status`, newStatus);
    // Clear price/dest if they don't match status
    if (newStatus !== 'SELL') formik.setFieldValue(`items.${id}.asking_price`, '');
    if (newStatus !== 'DONATE') formik.setFieldValue(`items.${id}.donation_dest`, '');
  };

  return (
    <Modal show={show} onHide={onHide} size="xl" scrollable centered>
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title className="fw-bold">
          <i className="bi bi-magic me-2 text-warning"></i>
          Bulk Triage Review
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="pt-2">
        <p className="text-muted mb-4">
          Review the AI recommendations for the {selectedEntries.length} books you selected. You can
          accept suggestions or manually override them before completing the triage.
        </p>

        {error && <Alert variant="danger">{error}</Alert>}

        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" variant="warning" />
            <p className="mt-2 text-muted">Asking the AI for recommendations...</p>
          </div>
        ) : (
          <ListGroup variant="flush" aria-label="Bulk Triage Recommendations">
            {selectedEntries.map((entry) => {
              const item = formik.values.items[entry.id];
              if (!item) return null;

              const isDifferent = item.status !== item.ai_status;

              return (
                <ListGroup.Item key={entry.id} className="px-0 py-4 border-bottom">
                  <Row className="align-items-start">
                    <Col md={3} lg={2} className="text-center">
                      {entry.book.cover_url ? (
                        <img
                          src={entry.book.cover_url}
                          alt={`Cover for ${entry.book.title}`}
                          className="img-fluid rounded shadow-sm"
                          style={{ maxHeight: '120px' }}
                        />
                      ) : (
                        <div
                          className="bg-light rounded d-flex align-items-center justify-content-center mx-auto"
                          style={{ height: '120px', width: '80px' }}
                          aria-label="No cover available"
                        >
                          <i className="bi bi-book text-muted"></i>
                        </div>
                      )}
                    </Col>
                    <Col md={9} lg={10}>
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <div>
                          <h6 className="fw-bold mb-0">{entry.book.title}</h6>
                          <div className="text-muted small">by {entry.book.author}</div>
                        </div>
                        <div className="text-end">
                          <div className="small text-muted text-uppercase fw-bold mb-1">
                            Current Status
                          </div>
                          <StatusBadge status={entry.status} />
                        </div>
                      </div>

                      <Card
                        className={`border-0 ${isDifferent ? 'bg-light' : 'bg-warning bg-opacity-10'}`}
                      >
                        <Card.Body className="p-3">
                          <Row className="align-items-center">
                            <Col md={6}>
                              <div className="d-flex align-items-center gap-2 mb-2">
                                <span className="small fw-bold text-muted text-uppercase">
                                  AI Recommendation:
                                </span>
                                <Badge
                                  bg={
                                    item.ai_status === 'KEEP'
                                      ? 'success'
                                      : item.ai_status === 'SELL'
                                        ? 'primary'
                                        : 'info'
                                  }
                                  className="text-uppercase"
                                >
                                  {item.ai_status}
                                </Badge>
                                {item.confidence && (
                                  <span className="small text-muted">
                                    ({Math.round(item.confidence * 100)}% confidence)
                                  </span>
                                )}
                              </div>
                              <p className="small mb-0 fst-italic text-secondary">
                                "{item.ai_reason}"
                              </p>
                            </Col>
                            <Col md={6} className="text-md-end mt-3 mt-md-0">
                              <Form.Group
                                controlId={`status-override-${entry.id}`}
                                className="d-inline-block text-start me-2"
                                style={{ width: '150px' }}
                              >
                                <Form.Label className="visually-hidden">Override Status</Form.Label>
                                <Form.Select
                                  size="sm"
                                  value={item.status}
                                  onChange={(e) => handleStatusChange(entry.id, e.target.value)}
                                  aria-label={`Status for ${entry.book.title}`}
                                >
                                  <option value="KEEP">Keep</option>
                                  <option value="DONATE">Donate</option>
                                  <option value="SELL">Sell</option>
                                  <option value="DISCARD">Discard</option>
                                </Form.Select>
                              </Form.Group>
                              <Button
                                variant={isDifferent ? 'outline-warning' : 'warning'}
                                size="sm"
                                onClick={() => handleApplyAISuggestion(entry.id)}
                                disabled={!isDifferent}
                              >
                                {isDifferent ? 'Accept AI' : 'Accepted'}
                              </Button>
                            </Col>
                          </Row>
                        </Card.Body>
                      </Card>

                      <Row className="mt-3 g-2">
                        {item.status === 'SELL' && (
                          <Col md={4}>
                            <Form.Group controlId={`price-${entry.id}`}>
                              <Form.Label className="small fw-bold text-muted text-uppercase">
                                Asking Price ($)
                              </Form.Label>
                              <Form.Control
                                size="sm"
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={item.asking_price}
                                onChange={(e) =>
                                  formik.setFieldValue(
                                    `items.${entry.id}.asking_price`,
                                    e.target.value,
                                  )
                                }
                              />
                            </Form.Group>
                          </Col>
                        )}
                        {item.status === 'DONATE' && (
                          <Col md={4}>
                            <Form.Group controlId={`dest-${entry.id}`}>
                              <Form.Label className="small fw-bold text-muted text-uppercase">
                                Destination
                              </Form.Label>
                              <Form.Control
                                size="sm"
                                placeholder="Where to donate?"
                                value={item.donation_dest}
                                onChange={(e) =>
                                  formik.setFieldValue(
                                    `items.${entry.id}.donation_dest`,
                                    e.target.value,
                                  )
                                }
                              />
                            </Form.Group>
                          </Col>
                        )}
                        <Col md={item.status === 'SELL' || item.status === 'DONATE' ? 8 : 12}>
                          <Form.Group controlId={`notes-${entry.id}`}>
                            <Form.Label className="small fw-bold text-muted text-uppercase">
                              Notes
                            </Form.Label>
                            <Form.Control
                              size="sm"
                              placeholder="Additional notes..."
                              value={item.notes}
                              onChange={(e) =>
                                formik.setFieldValue(`items.${entry.id}.notes`, e.target.value)
                              }
                            />
                          </Form.Group>
                        </Col>
                      </Row>
                    </Col>
                  </Row>
                </ListGroup.Item>
              );
            })}
          </ListGroup>
        )}
      </Modal.Body>
      <Modal.Footer className="border-0 pt-0">
        <Button variant="secondary" onClick={onHide} disabled={saving}>
          Cancel
        </Button>
        <Button
          variant="warning"
          onClick={formik.handleSubmit}
          disabled={loading || saving || selectedEntries.length === 0}
          className="px-4"
        >
          {saving ? (
            <>
              <Spinner
                as="span"
                animation="border"
                size="sm"
                role="status"
                aria-hidden="true"
                className="me-2"
              />
              Completing...
            </>
          ) : (
            `Complete Bulk Triage (${selectedEntries.length} Books)`
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default BulkReviewModal;
