import React, { useState, useEffect } from 'react';
import {
  Container,
  Row,
  Col,
  Card,
  Form,
  Button,
  Alert,
  ListGroup,
  InputGroup,
  Spinner,
} from 'react-bootstrap';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { getBookMetadata, createCatalogEntry } from '../services/api';
import { useNavigate } from 'react-router-dom';

const TriageWizard = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Scan, 2: Metadata/Condition, 3: Decision, 4: Outcome
  const [isbn, setIsbn] = useState('');
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Form State
  const [conditionFlags, setConditionFlags] = useState([]);
  const [status, setStatus] = useState('KEEP');
  const [notes, setNotes] = useState('');
  const [askingPrice, setAskingPrice] = useState('');
  const [donationDest, setDonationDest] = useState('');

  const handleLookup = (lookupIsbn) => {
    setLoading(true);
    setError(null);
    getBookMetadata(lookupIsbn)
      .then((res) => {
        setBook(res.data);
        setIsbn(lookupIsbn);
        setStep(2);
        setLoading(false);
      })
      .catch(() => {
        setError('Could not find book metadata.');
        setLoading(false);
      });
  };

  const handleConditionToggle = (flag) => {
    setConditionFlags((prev) =>
      prev.includes(flag) ? prev.filter((f) => f !== flag) : [...prev, flag],
    );
  };

  useEffect(() => {
    if (step === 1) {
      const scanner = new Html5QrcodeScanner('reader', { fps: 10, qrbox: 250 });
      scanner.render(
        (decodedText) => {
          handleLookup(decodedText);
          scanner.clear();
        },
        () => {
          // console.warn(err);
        },
      );
      return () => scanner.clear();
    }
  }, [step]);

  const handleFinalSubmit = () => {
    const data = {
      book_id: book.id,
      status: status,
      condition_flags: conditionFlags,
      notes: notes,
      asking_price: status === 'SELL' ? askingPrice : null,
      donation_dest: status === 'DONATE' ? donationDest : '',
    };

    createCatalogEntry(data)
      .then(() => setStep(4))
      .catch(() => setError('Failed to save entry.'));
  };

  // Step 1: Scan / Manual Entry
  if (step === 1) {
    return (
      <Container className="py-4">
        <h2 className="mb-4 text-center fw-bold">Step 1: Scan Book</h2>
        <Row className="justify-content-center">
          <Col md={6}>
            <Card className="shadow-sm">
              <Card.Body>
                <div
                  id="reader"
                  className="mb-4 border rounded"
                  style={{ overflow: 'hidden' }}
                ></div>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold">Or Enter ISBN Manually</Form.Label>
                  <InputGroup>
                    <Form.Control
                      placeholder="e.g. 9780143127550"
                      value={isbn}
                      onChange={(e) => setIsbn(e.target.value)}
                    />
                    <Button variant="warning" onClick={() => handleLookup(isbn)}>
                      Lookup
                    </Button>
                  </InputGroup>
                </Form.Group>
                {loading && (
                  <div className="text-center mt-3">
                    <Spinner animation="border" />
                  </div>
                )}
                {error && (
                  <Alert variant="danger" className="mt-3">
                    {error}
                  </Alert>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    );
  }

  // Step 2: Metadata Confirmation & Condition
  if (step === 2) {
    return (
      <Container className="py-4">
        <h2 className="mb-4 text-center fw-bold">Step 2: Check Condition</h2>
        <Row className="justify-content-center">
          <Col md={8}>
            <Card className="shadow-sm mb-4">
              <Card.Header className="bg-light fw-bold">Book Metadata</Card.Header>
              <Card.Body>
                <Row>
                  <Col sm={8}>
                    <h4>{book.title}</h4>
                    <p className="text-muted mb-1">by {book.author}</p>
                    <p className="small text-muted mb-0">Published: {book.publish_year || 'N/A'}</p>
                  </Col>
                  <Col sm={4} className="text-end">
                    <span className="badge bg-warning text-dark p-2">ISBN: {book.isbn}</span>
                  </Col>
                </Row>
              </Card.Body>
            </Card>

            <Card className="shadow-sm mb-4">
              <Card.Header className="bg-light fw-bold">Physical Condition Issues</Card.Header>
              <Card.Body>
                <Row>
                  <Col sm={6}>
                    <Form.Check
                      type="checkbox"
                      label="Water Damage"
                      className="mb-2"
                      onChange={() => handleConditionToggle('WATER_DAMAGE')}
                    />
                    <Form.Check
                      type="checkbox"
                      label="Torn Pages"
                      className="mb-2"
                      onChange={() => handleConditionToggle('TORN_PAGES')}
                    />
                    <Form.Check
                      type="checkbox"
                      label="Spine Damage"
                      className="mb-2"
                      onChange={() => handleConditionToggle('SPINE_DAMAGE')}
                    />
                  </Col>
                  <Col sm={6}>
                    <Form.Check
                      type="checkbox"
                      label="Annotated / Highlighted"
                      className="mb-2"
                      onChange={() => handleConditionToggle('ANNOTATED')}
                    />
                    <Form.Check
                      type="checkbox"
                      label="Yellowing"
                      className="mb-2"
                      onChange={() => handleConditionToggle('YELLOWING')}
                    />
                    <Form.Check
                      type="checkbox"
                      label="Other Damage"
                      className="mb-2"
                      onChange={() => handleConditionToggle('OTHER')}
                    />
                  </Col>
                </Row>
                {conditionFlags.length > 0 && (
                  <Alert variant="danger" className="mt-3 py-2">
                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                    Issues detected. Suggestion: <strong>DISCARD</strong>.
                  </Alert>
                )}
              </Card.Body>
            </Card>

            <div className="d-flex justify-content-between">
              <Button variant="secondary" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button variant="warning" onClick={() => setStep(3)}>
                Next Step
              </Button>
            </div>
          </Col>
        </Row>
      </Container>
    );
  }

  // Step 3: Decision
  if (step === 3) {
    const statuses = [
      { id: 'KEEP', label: 'Keep', variant: 'success', icon: 'bi-journal-check' },
      { id: 'DONATE', label: 'Donate', variant: 'info', icon: 'bi-gift' },
      { id: 'SELL', label: 'Sell', variant: 'primary', icon: 'bi-cash-coin' },
      { id: 'DISCARD', label: 'Discard', variant: 'danger', icon: 'bi-trash3' },
    ];

    return (
      <Container className="py-4">
        <h2 className="mb-4 text-center fw-bold">Step 3: Decide Fate</h2>
        <Row className="justify-content-center">
          <Col md={8}>
            <Row className="g-3 mb-4">
              {statuses.map((s) => (
                <Col key={s.id} sm={6} lg={3}>
                  <Card
                    className={`text-center h-100 cursor-pointer shadow-sm border-${status === s.id ? s.variant : 'light'} ${status === s.id ? 'bg-light' : ''}`}
                    onClick={() => setStatus(s.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <Card.Body>
                      <i className={`bi ${s.icon} fs-3 text-${s.variant}`}></i>
                      <div className={`fw-bold mt-2 text-${s.variant}`}>{s.label}</div>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>

            <Card className="shadow-sm mb-4">
              <Card.Body>
                {status === 'SELL' && (
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold">Asking Price ($)</Form.Label>
                    <Form.Control
                      type="number"
                      step="0.01"
                      value={askingPrice}
                      onChange={(e) => setAskingPrice(e.target.value)}
                    />
                  </Form.Group>
                )}
                {status === 'DONATE' && (
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold">Donation Destination</Form.Label>
                    <Form.Control
                      placeholder="e.g. Goodwill, Local Library"
                      value={donationDest}
                      onChange={(e) => setDonationDest(e.target.value)}
                    />
                  </Form.Group>
                )}
                <Form.Group>
                  <Form.Label className="fw-bold">Notes</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </Form.Group>
              </Card.Body>
            </Card>

            <div className="d-flex justify-content-between">
              <Button variant="secondary" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button variant="warning" className="px-5 fw-bold" onClick={handleFinalSubmit}>
                Finish Triage
              </Button>
            </div>
          </Col>
        </Row>
      </Container>
    );
  }

  // Step 4: Outcome
  if (step === 4) {
    return (
      <Container className="py-5 text-center">
        <i className="bi bi-check-circle-fill display-1 text-success mb-4"></i>
        <h2 className="fw-bold">Triage Complete!</h2>
        <p className="lead mb-5">
          <strong>{book.title}</strong> has been marked as <strong>{status}</strong>.
        </p>
        <div className="d-flex justify-content-center gap-3">
          <Button
            variant="warning"
            size="lg"
            onClick={() => {
              setStep(1);
              setBook(null);
              setIsbn('');
              setConditionFlags([]);
              setStatus('KEEP');
              setNotes('');
              setAskingPrice('');
              setDonationDest('');
            }}
          >
            Scan Another
          </Button>
          <Button variant="outline-dark" size="lg" onClick={() => navigate('/collection')}>
            View Collection
          </Button>
        </div>
      </Container>
    );
  }
};

export default TriageWizard;
