import React, { useState, useEffect } from 'react';
import {
  Container,
  Row,
  Col,
  Card,
  Form,
  Button,
  Alert,
  InputGroup,
  Spinner,
} from 'react-bootstrap';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { getBookMetadata, createCatalogEntry } from '../services/api';
import { useNavigate } from 'react-router-dom';

const TriageWizard = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Scan, 2: Triage, 3: Outcome
  const [isbn, setIsbn] = useState('');
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Form State
  const [conditionGrade, setConditionGrade] = useState('GOOD');
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

  useEffect(() => {
    if (step === 1) {
      const scanner = new Html5QrcodeScanner('reader', { fps: 10, qrbox: 250 });
      scanner.render(
        (decodedText) => {
          handleLookup(decodedText);
          scanner.clear();
        },
        () => {
          // Scanner error is usually just "no QR code found in frame"
        },
      );
      return () => {
        scanner.clear().catch((error) => console.error('Failed to clear scanner', error));
      };
    }
  }, [step]);

  const handleConditionToggle = (flag) => {
    setConditionFlags((prev) =>
      prev.includes(flag) ? prev.filter((f) => f !== flag) : [...prev, flag],
    );
  };

  const handleFinalSubmit = () => {
    const data = {
      book_id: book.id,
      status: status,
      condition_grade: conditionGrade,
      condition_flags: conditionFlags,
      notes: notes,
      asking_price: status === 'SELL' ? askingPrice : null,
      donation_dest: status === 'DONATE' ? donationDest : '',
    };

    createCatalogEntry(data)
      .then(() => setStep(3))
      .catch(() => setError('Failed to save entry.'));
  };

  const getEbayLink = () =>
    `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(book.isbn || book.title)}`;
  const getAmazonLink = () =>
    `https://www.amazon.com/s?k=${encodeURIComponent(book.isbn || book.title)}&i=stripbooks`;

  // Step 1: Scan
  if (step === 1) {
    return (
      <Container className="py-4">
        <div className="text-center mb-5">
          <i className="bi bi-upc-scan display-4 text-warning"></i>
          <h2 className="fw-bold mt-2">Scan or Enter ISBN</h2>
        </div>
        <Row className="justify-content-center">
          <Col md={6}>
            <Card className="shadow-sm border-0">
              <Card.Body className="p-4">
                <div
                  id="reader"
                  className="mb-4 border rounded bg-dark"
                  style={{ minHeight: '300px', overflow: 'hidden' }}
                ></div>
                <Form.Group>
                  <Form.Label className="fw-bold text-muted small text-uppercase">
                    Manual Entry
                  </Form.Label>
                  <InputGroup size="lg">
                    <Form.Control
                      placeholder="Enter ISBN..."
                      value={isbn}
                      onChange={(e) => setIsbn(e.target.value)}
                    />
                    <Button variant="warning" onClick={() => handleLookup(isbn)}>
                      Lookup
                    </Button>
                  </InputGroup>
                </Form.Group>
                {loading && (
                  <div className="text-center mt-4">
                    <Spinner animation="grow" variant="warning" />
                  </div>
                )}
                {error && (
                  <Alert variant="danger" className="mt-4">
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

  // Step 2: One-Page Triage
  if (step === 2) {
    const statuses = [
      { id: 'KEEP', label: 'Keep', variant: 'success', icon: 'bi-journal-check' },
      { id: 'DONATE', label: 'Donate', variant: 'info', icon: 'bi-gift' },
      { id: 'SELL', label: 'Sell', variant: 'primary', icon: 'bi-cash-coin' },
      { id: 'DISCARD', label: 'Discard', variant: 'danger', icon: 'bi-trash3' },
    ];

    const grades = [
      { id: 'MINT', label: 'Mint' },
      { id: 'GOOD', label: 'Good' },
      { id: 'FAIR', label: 'Fair' },
      { id: 'POOR', label: 'Poor' },
    ];

    return (
      <Container className="py-4">
        <Row>
          {/* Sidebar: Book Info */}
          <Col lg={4} className="mb-4">
            <Card className="shadow-sm border-0 sticky-top" style={{ top: '2rem' }}>
              <Card.Body className="text-center p-4">
                {book.cover_url ? (
                  <img
                    src={book.cover_url}
                    alt={book.title}
                    className="img-fluid rounded shadow mb-4"
                    style={{ maxHeight: '300px' }}
                  />
                ) : (
                  <div
                    className="bg-light rounded d-flex align-items-center justify-content-center mb-4"
                    style={{ height: '300px' }}
                  >
                    <i className="bi bi-book display-1 text-muted"></i>
                  </div>
                )}
                <h3 className="fw-bold">{book.title}</h3>
                <p className="text-muted">by {book.author}</p>
                <div className="d-flex justify-content-center gap-2 mb-3">
                  <Badge bg="warning" text="dark">
                    ISBN: {book.isbn}
                  </Badge>
                  <Badge bg="secondary">{book.publish_year}</Badge>
                </div>
                {book.description && (
                  <p className="small text-start text-muted">
                    {book.description.substring(0, 200)}...
                  </p>
                )}
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => setStep(1)}
                  className="mt-3"
                >
                  <i className="bi bi-arrow-left me-1"></i> Scan Different Book
                </Button>
              </Card.Body>
            </Card>
          </Col>

          {/* Main: Triage Details */}
          <Col lg={8}>
            <Card className="shadow-sm border-0 mb-4">
              <Card.Header className="bg-white fw-bold py-3">1. Select Status</Card.Header>
              <Card.Body className="p-4">
                <Row className="g-3">
                  {statuses.map((s) => (
                    <Col key={s.id} xs={6} md={3}>
                      <Card
                        className={`text-center h-100 cursor-pointer border-2 transition ${status === s.id ? `border-${s.variant} bg-light` : 'border-light'}`}
                        onClick={() => setStatus(s.id)}
                        style={{ cursor: 'pointer' }}
                      >
                        <Card.Body className="p-3">
                          <i className={`bi ${s.icon} fs-2 text-${s.variant}`}></i>
                          <div className={`fw-bold mt-2 small text-${s.variant}`}>{s.label}</div>
                        </Card.Body>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </Card.Body>
            </Card>

            <Card className="shadow-sm border-0 mb-4">
              <Card.Header className="bg-white fw-bold py-3">2. Condition & Details</Card.Header>
              <Card.Body className="p-4">
                <Form.Group className="mb-4">
                  <Form.Label className="fw-bold text-muted small text-uppercase">
                    Overall Grade
                  </Form.Label>
                  <div className="d-flex gap-2">
                    {grades.map((g) => (
                      <Button
                        key={g.id}
                        variant={conditionGrade === g.id ? 'warning' : 'outline-secondary'}
                        onClick={() => setConditionGrade(g.id)}
                        className="flex-grow-1"
                      >
                        {g.label}
                      </Button>
                    ))}
                  </div>
                </Form.Group>

                <Row className="mb-4">
                  <Col md={12}>
                    <Form.Label className="fw-bold text-muted small text-uppercase">
                      Specific Issues
                    </Form.Label>
                    <div className="d-flex flex-wrap gap-3">
                      {['Water Damage', 'Torn Pages', 'Spine Damage', 'Annotated', 'Yellowing'].map(
                        (flag) => (
                          <Form.Check
                            key={flag}
                            type="checkbox"
                            id={`check-${flag}`}
                            label={flag}
                            checked={conditionFlags.includes(flag.toUpperCase().replace(' ', '_'))}
                            onChange={() =>
                              handleConditionToggle(flag.toUpperCase().replace(' ', '_'))
                            }
                          />
                        ),
                      )}
                    </div>
                  </Col>
                </Row>

                <hr className="my-4" />

                {status === 'SELL' && (
                  <Form.Group className="mb-4">
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
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={askingPrice}
                      onChange={(e) => setAskingPrice(e.target.value)}
                      size="lg"
                    />
                  </Form.Group>
                )}

                {status === 'DONATE' && (
                  <Form.Group className="mb-4">
                    <Form.Label className="fw-bold text-muted small text-uppercase">
                      Donation Destination
                    </Form.Label>
                    <Form.Control
                      placeholder="e.g. Goodwill, Library"
                      value={donationDest}
                      onChange={(e) => setDonationDest(e.target.value)}
                    />
                  </Form.Group>
                )}

                <Form.Group>
                  <Form.Label className="fw-bold text-muted small text-uppercase">Notes</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    placeholder="Add any specific details here..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </Form.Group>
              </Card.Body>
            </Card>

            <div className="d-grid">
              <Button
                variant="warning"
                size="lg"
                className="fw-bold py-3 shadow-sm"
                onClick={handleFinalSubmit}
              >
                COMPLETE TRIAGE
              </Button>
            </div>
          </Col>
        </Row>
      </Container>
    );
  }

  // Step 3: Outcome
  if (step === 3) {
    return (
      <Container className="py-5 text-center">
        <div className="mb-4">
          <i className="bi bi-check-circle-fill display-1 text-success"></i>
        </div>
        <h2 className="fw-bold">Triage Complete!</h2>
        <p className="lead text-muted mb-5">
          <strong>{book.title}</strong> has been successfully cataloged.
        </p>
        <div className="d-flex justify-content-center gap-3">
          <Button
            variant="warning"
            size="lg"
            className="px-5 fw-bold"
            onClick={() => {
              setStep(1);
              setBook(null);
              setIsbn('');
              setConditionGrade('GOOD');
              setConditionFlags([]);
              setStatus('KEEP');
              setNotes('');
              setAskingPrice('');
              setDonationDest('');
            }}
          >
            Scan Next Book
          </Button>
          <Button
            variant="outline-dark"
            size="lg"
            className="px-5"
            onClick={() => navigate('/collection')}
          >
            Inventory
          </Button>
        </div>
      </Container>
    );
  }
};

export default TriageWizard;
