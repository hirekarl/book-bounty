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
  Badge,
  ProgressBar,
} from 'react-bootstrap';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Link, useNavigate } from 'react-router-dom';
import {
  getBookMetadata,
  createCatalogEntry,
  getRecommendation,
  getCullingGoals,
} from '../services/api';

const STATUS_CONFIG = {
  KEEP: { label: 'Keep', variant: 'success', icon: 'bi-journal-check' },
  DONATE: { label: 'Donate', variant: 'info', icon: 'bi-gift' },
  SELL: { label: 'Sell', variant: 'primary', icon: 'bi-cash-coin' },
  DISCARD: { label: 'Discard', variant: 'danger', icon: 'bi-trash3' },
};

const CONDITION_GRADES = ['MINT', 'GOOD', 'FAIR', 'POOR'];
const CONDITION_FLAGS = ['Water Damage', 'Torn Pages', 'Spine Damage', 'Annotated', 'Yellowing'];
const flagKey = (f) => f.toUpperCase().replace(' ', '_');

const GoalPill = ({ goal }) =>
  goal ? (
    <div className="text-center mb-4">
      <Badge bg="warning" text="dark" className="px-3 py-2 fs-6 fw-normal">
        <i className="bi bi-bullseye me-2"></i>
        Goal: {goal.name}
      </Badge>
    </div>
  ) : null;

const TriageWizard = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Scan, 2: Triage, 3: Outcome

  // Goal state — fetched once on mount, persists across scans
  const [activeGoal, setActiveGoal] = useState(null);
  const [goalCheckDone, setGoalCheckDone] = useState(false);

  // Camera toggle — off by default so the camera doesn't start unexpectedly
  const [cameraEnabled, setCameraEnabled] = useState(false);

  // Book state
  const [isbn, setIsbn] = useState('');
  const [book, setBook] = useState(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState(null);

  // Condition state
  const [conditionGrade, setConditionGrade] = useState('GOOD');
  const [conditionFlags, setConditionFlags] = useState([]);

  // AI recommendation state
  const [aiRec, setAiRec] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [overriding, setOverriding] = useState(false);

  // Final form state
  const [status, setStatus] = useState('KEEP');
  const [notes, setNotes] = useState('');
  const [askingPrice, setAskingPrice] = useState('');
  const [donationDest, setDonationDest] = useState('');
  const [submitError, setSubmitError] = useState(null);

  // Fetch active goal on mount
  useEffect(() => {
    getCullingGoals()
      .then((res) => {
        setActiveGoal(res.data.find((g) => g.is_active) || null);
        setGoalCheckDone(true);
      })
      .catch(() => setGoalCheckDone(true));
  }, []);

  const fetchAiRecommendation = (bookIsbn, grade, flags) => {
    setAiLoading(true);
    setAiError(null);
    setAiRec(null);
    getRecommendation({ isbn: bookIsbn, condition_grade: grade, condition_flags: flags })
      .then((res) => {
        setAiRec(res.data);
        setStatus(res.data.status);
        setAiLoading(false);
      })
      .catch((err) => {
        const msg = err.response?.data?.error || 'AI recommendation failed.';
        setAiError(msg);
        setAiLoading(false);
      });
  };

  const handleLookup = (lookupIsbn) => {
    setLookupLoading(true);
    setLookupError(null);
    getBookMetadata(lookupIsbn)
      .then((res) => {
        setBook(res.data);
        setIsbn(lookupIsbn);
        setStep(2);
        setLookupLoading(false);
        fetchAiRecommendation(lookupIsbn, 'GOOD', []);
      })
      .catch(() => {
        setLookupError('Could not find book metadata.');
        setLookupLoading(false);
      });
  };

  // Only initialise the scanner when an active goal exists and camera is enabled.
  // The setTimeout(fn, 0) defers init by one tick so React Strict Mode's
  // synchronous cleanup can cancel the timer before it fires — preventing
  // the double-scanner that occurs when effects run twice in development.
  useEffect(() => {
    if (step !== 1 || !activeGoal || !cameraEnabled) return;

    let qr = null;
    let cancelled = false;

    // startPromise lets cleanup chain stop() after start() resolves,
    // preventing "scanner is not running" errors when cleanup fires mid-init.
    let startPromise = null;

    const timer = setTimeout(() => {
      if (cancelled) return;
      const readerEl = document.getElementById('reader');
      if (readerEl) readerEl.innerHTML = '';

      // EAN_13 only — book ISBNs are EAN-13. Excluding other formats (especially
      // the EAN-5 price add-on that sits beside ISBN barcodes) prevents the scanner
      // locking onto the wrong code and speeds up each decode attempt.
      qr = new Html5Qrcode('reader', {
        formatsToSupport: [Html5QrcodeSupportedFormats.EAN_13],
      });
      startPromise = qr
        .start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: 250 },
          (decodedText) => {
            if (cancelled) return;
            const instance = qr;
            qr = null;
            instance.stop().catch(() => {});
            handleLookup(decodedText);
          },
          () => {},
        )
        .then(() => {
          // Post-start: request full resolution and continuous AF on the live track.
          // getUserMedia defaults to 640x480; bumping to 1080p gives the decoder
          // far more pixels per barcode stripe, which is the main reason EAN-13
          // barcodes fail to decode on capable cameras like the Logitech C920.
          // focusMode: continuous keeps the AF hunting rather than locking at
          // whatever distance it happened to be at when the stream opened.
          if (cancelled) return;
          const track = document.querySelector('#reader video')?.srcObject?.getVideoTracks?.()[0];
          track
            ?.applyConstraints({
              width: { ideal: 1920 },
              height: { ideal: 1080 },
              advanced: [{ focusMode: 'continuous' }],
            })
            .catch(() => {});
        })
        .catch((err) => {
          if (!cancelled) setLookupError(`Camera error: ${err?.message || err}`);
          qr = null;
        });
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (qr) {
        // Chain stop() so it only runs after start() has resolved
        const instance = qr;
        qr = null;
        (startPromise || Promise.resolve()).then(() => instance.stop().catch(() => {}));
      }
    };
  }, [step, activeGoal, cameraEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleConditionToggle = (flag) => {
    setConditionFlags((prev) =>
      prev.includes(flag) ? prev.filter((f) => f !== flag) : [...prev, flag],
    );
  };

  const handleAcceptSuggestion = () => {
    setStatus(aiRec.status);
    if (aiRec.suggested_price) setAskingPrice(String(aiRec.suggested_price));
    setOverriding(false);
  };

  const handleFinalSubmit = () => {
    setSubmitError(null);
    const data = {
      book_id: book.id,
      status,
      condition_grade: conditionGrade,
      condition_flags: conditionFlags,
      notes,
      asking_price: status === 'SELL' ? askingPrice : null,
      donation_dest: status === 'DONATE' ? donationDest : '',
      ai_recommendation: aiRec || {},
    };

    createCatalogEntry(data)
      .then(() => setStep(3))
      .catch(() => setSubmitError('Failed to save entry.'));
  };

  const resetAll = () => {
    setStep(1);
    setBook(null);
    setIsbn('');
    setConditionGrade('GOOD');
    setConditionFlags([]);
    setAiRec(null);
    setAiError(null);
    setAiLoading(false);
    setOverriding(false);
    setStatus('KEEP');
    setNotes('');
    setAskingPrice('');
    setDonationDest('');
    setSubmitError(null);
    setCameraEnabled(true);
    // activeGoal intentionally preserved — goal persists across scans in a session
  };

  const getEbayLink = () =>
    `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(book.isbn || book.title)}`;
  const getAmazonLink = () =>
    `https://www.amazon.com/s?k=${encodeURIComponent(book.isbn || book.title)}&i=stripbooks`;

  // ── Step 1: Scan ────────────────────────────────────────────────────────────
  if (step === 1) {
    // Still checking for a goal
    if (!goalCheckDone) {
      return (
        <Container className="py-5 text-center">
          <Spinner animation="border" variant="warning" />
        </Container>
      );
    }

    // No active goal — block scanning with a clear prompt
    if (!activeGoal) {
      return (
        <Container className="py-5">
          <Row className="justify-content-center">
            <Col md={6}>
              <Alert variant="warning" className="text-center shadow-sm">
                <i className="bi bi-bullseye display-4 d-block mb-3"></i>
                <h5 className="fw-bold">No Culling Goal Set</h5>
                <p className="mb-4">
                  You need an active culling goal before scanning. It gives the AI the context it
                  needs to make useful recommendations.
                </p>
                <Button as={Link} to="/" variant="warning" className="fw-bold px-4">
                  <i className="bi bi-arrow-left me-2"></i>Go to Dashboard
                </Button>
              </Alert>
            </Col>
          </Row>
        </Container>
      );
    }

    return (
      <Container className="py-4">
        <div className="text-center mb-4">
          <i className="bi bi-upc-scan display-4 text-warning"></i>
          <h2 className="fw-bold mt-2">Scan or Enter ISBN</h2>
        </div>

        <GoalPill goal={activeGoal} />

        <Row className="justify-content-center">
          <Col md={6}>
            <Card className="shadow-sm border-0">
              <Card.Body className="p-4">
                {cameraEnabled ? (
                  <div id="reader" className="mb-2 rounded overflow-hidden" />
                ) : (
                  <div
                    className="mb-2 rounded d-flex flex-column align-items-center justify-content-center"
                    style={{ height: '220px', background: '#111' }}
                  >
                    <i
                      className="bi bi-upc-scan text-white opacity-25"
                      style={{ fontSize: '5rem' }}
                    ></i>
                    <div className="text-white opacity-25 small mt-1">Camera off</div>
                  </div>
                )}
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <span className="text-muted small">
                    <i className="bi bi-lightbulb me-1"></i>
                    Center the barcode in the box and hold steady.
                    <br />
                    If focus is slow, try manual ISBN entry below.
                  </span>
                  <Button
                    variant={cameraEnabled ? 'outline-secondary' : 'outline-warning'}
                    size="sm"
                    onClick={() => setCameraEnabled((v) => !v)}
                  >
                    <i
                      className={`bi ${cameraEnabled ? 'bi-camera-video-off' : 'bi-camera-video'} me-1`}
                    ></i>
                    {cameraEnabled ? 'Stop Camera' : 'Start Camera'}
                  </Button>
                </div>
                <Form.Group>
                  <Form.Label className="fw-bold text-muted small text-uppercase">
                    Manual Entry
                  </Form.Label>
                  <InputGroup size="lg">
                    <Form.Control
                      placeholder="Enter ISBN..."
                      value={isbn}
                      onChange={(e) => setIsbn(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && isbn && handleLookup(isbn)}
                    />
                    <Button variant="warning" onClick={() => isbn && handleLookup(isbn)}>
                      Lookup
                    </Button>
                  </InputGroup>
                </Form.Group>
                {lookupLoading && (
                  <div className="text-center mt-4">
                    <Spinner animation="grow" variant="warning" />
                  </div>
                )}
                {lookupError && (
                  <Alert variant="danger" className="mt-4">
                    {lookupError}
                  </Alert>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    );
  }

  // ── Step 2: Triage ──────────────────────────────────────────────────────────
  if (step === 2) {
    const effectiveStatus = overriding ? status : aiRec?.status || status;
    const statusConfig = STATUS_CONFIG[effectiveStatus] || STATUS_CONFIG.KEEP;
    const isUncertain = aiRec && aiRec.confidence < 0.5;
    const metadataMissing = book.metadata_found === false;

    return (
      <Container className="py-4">
        <GoalPill goal={activeGoal} />

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

          {/* Main: Triage */}
          <Col lg={8}>
            {/* Metadata warning */}
            {metadataMissing && (
              <Alert variant="warning" className="mb-4 d-flex align-items-start gap-2">
                <i className="bi bi-exclamation-triangle-fill flex-shrink-0 mt-1"></i>
                <div>
                  <strong>Book not found in Open Library.</strong> The AI will attempt a
                  recommendation based on the ISBN alone, but accuracy will be limited. Consider
                  verifying the outcome manually.
                </div>
              </Alert>
            )}

            {/* AI Recommendation Card */}
            <Card className="shadow-sm border-0 mb-4">
              <Card.Header className="bg-white fw-bold py-3 d-flex justify-content-between align-items-center">
                <span>
                  <i className="bi bi-stars me-2 text-warning"></i>AI Recommendation
                </span>
                {aiRec && isUncertain && (
                  <Badge bg="warning" text="dark">
                    <i className="bi bi-exclamation-triangle me-1"></i>AI Uncertain
                  </Badge>
                )}
              </Card.Header>
              <Card.Body className="p-4">
                {aiLoading && (
                  <div className="text-center py-3">
                    <Spinner animation="border" variant="warning" size="sm" className="me-2" />
                    <span className="text-muted">Analyzing book...</span>
                  </div>
                )}

                {aiError && (
                  <Alert variant="warning" className="mb-0">
                    <i className="bi bi-exclamation-circle me-2"></i>
                    {aiError}
                    <div className="mt-2">
                      <Button
                        variant="outline-warning"
                        size="sm"
                        onClick={() => fetchAiRecommendation(isbn, conditionGrade, conditionFlags)}
                      >
                        Retry
                      </Button>
                    </div>
                  </Alert>
                )}

                {aiRec && !aiLoading && (
                  <>
                    <div className="d-flex align-items-start gap-3 mb-3">
                      <div
                        className={`rounded-3 p-3 bg-${statusConfig.variant} bg-opacity-10 text-center`}
                        style={{ minWidth: '90px' }}
                      >
                        <i
                          className={`bi ${statusConfig.icon} fs-2 text-${statusConfig.variant}`}
                        ></i>
                        <div className={`fw-bold small text-${statusConfig.variant} mt-1`}>
                          {statusConfig.label}
                        </div>
                      </div>
                      <div className="flex-grow-1">
                        <p className="mb-2">{aiRec.reasoning}</p>
                        {aiRec.suggested_price && (
                          <p className="text-primary fw-bold mb-2">
                            Suggested price: ${aiRec.suggested_price}
                          </p>
                        )}
                        {aiRec.notable_tags?.length > 0 && (
                          <div className="d-flex flex-wrap gap-1">
                            {aiRec.notable_tags.map((tag) => (
                              <Badge key={tag} bg="light" text="dark" className="border fw-normal">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mb-3">
                      <div className="d-flex justify-content-between small text-muted mb-1">
                        <span>Confidence</span>
                        <span>{Math.round(aiRec.confidence * 100)}%</span>
                      </div>
                      <ProgressBar
                        now={aiRec.confidence * 100}
                        variant={isUncertain ? 'warning' : 'success'}
                        style={{ height: '6px' }}
                      />
                    </div>

                    {!overriding ? (
                      <div className="d-flex gap-2">
                        <Button
                          variant={statusConfig.variant}
                          onClick={handleAcceptSuggestion}
                          className="fw-bold"
                        >
                          <i className="bi bi-check-lg me-1"></i>Accept — {statusConfig.label}
                        </Button>
                        <Button variant="outline-secondary" onClick={() => setOverriding(true)}>
                          Override
                        </Button>
                      </div>
                    ) : (
                      <Alert
                        variant="light"
                        className="mb-0 d-flex align-items-center justify-content-between py-2"
                      >
                        <span className="small text-muted">
                          Override mode — choose your own status below.
                        </span>
                        <Button
                          variant="link"
                          size="sm"
                          className="p-0 text-muted"
                          onClick={() => {
                            setOverriding(false);
                            setStatus(aiRec.status);
                          }}
                        >
                          Use AI suggestion
                        </Button>
                      </Alert>
                    )}
                  </>
                )}
              </Card.Body>
            </Card>

            {/* Manual Status Picker — only shown when overriding or no AI rec */}
            {(overriding || (!aiRec && !aiLoading)) && (
              <Card className="shadow-sm border-0 mb-4">
                <Card.Header className="bg-white fw-bold py-3">Select Status</Card.Header>
                <Card.Body className="p-4">
                  <Row className="g-3">
                    {Object.entries(STATUS_CONFIG).map(([id, cfg]) => (
                      <Col key={id} xs={6} md={3}>
                        <Card
                          className={`text-center h-100 border-2 ${status === id ? `border-${cfg.variant} bg-light` : 'border-light'}`}
                          onClick={() => setStatus(id)}
                          style={{ cursor: 'pointer' }}
                        >
                          <Card.Body className="p-3">
                            <i className={`bi ${cfg.icon} fs-2 text-${cfg.variant}`}></i>
                            <div className={`fw-bold mt-2 small text-${cfg.variant}`}>
                              {cfg.label}
                            </div>
                          </Card.Body>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                </Card.Body>
              </Card>
            )}

            {/* Condition & Details */}
            <Card className="shadow-sm border-0 mb-4">
              <Card.Header className="bg-white fw-bold py-3 d-flex justify-content-between align-items-center">
                <span>Condition & Details</span>
                {aiRec && (
                  <Button
                    variant="outline-warning"
                    size="sm"
                    onClick={() => fetchAiRecommendation(isbn, conditionGrade, conditionFlags)}
                  >
                    <i className="bi bi-arrow-clockwise me-1"></i>Re-analyze
                  </Button>
                )}
              </Card.Header>
              <Card.Body className="p-4">
                <Form.Group className="mb-4">
                  <Form.Label className="fw-bold text-muted small text-uppercase">
                    Overall Grade
                  </Form.Label>
                  <div className="d-flex gap-2">
                    {CONDITION_GRADES.map((g) => (
                      <Button
                        key={g}
                        variant={conditionGrade === g ? 'warning' : 'outline-secondary'}
                        onClick={() => setConditionGrade(g)}
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
                        checked={conditionFlags.includes(flagKey(flag))}
                        onChange={() => handleConditionToggle(flagKey(flag))}
                      />
                    ))}
                  </div>
                </Form.Group>

                <hr className="my-4" />

                {(overriding ? status : aiRec?.status || status) === 'SELL' && (
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

                {(overriding ? status : aiRec?.status || status) === 'DONATE' && (
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

            {submitError && <Alert variant="danger">{submitError}</Alert>}

            <div className="d-grid">
              <Button
                variant="warning"
                size="lg"
                className="fw-bold py-3 shadow-sm"
                onClick={handleFinalSubmit}
                disabled={aiLoading}
              >
                COMPLETE TRIAGE
              </Button>
            </div>
          </Col>
        </Row>
      </Container>
    );
  }

  // ── Step 3: Outcome ─────────────────────────────────────────────────────────
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
          <Button variant="warning" size="lg" className="px-5 fw-bold" onClick={resetAll}>
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
