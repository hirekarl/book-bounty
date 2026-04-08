import React, { useState, useEffect, useCallback, useRef } from 'react';
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
} from 'react-bootstrap';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Link, useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import { catalogSchema, validateWithZod } from '../schemas/catalogSchema';
import {
  getBookMetadata,
  createCatalogEntry,
  getRecommendation,
  getCullingGoals,
  searchBooks,
} from '../services/api';
import RecommendationCard from './TriageWizard/RecommendationCard';
import ConditionForm from './TriageWizard/ConditionForm';

const STATUS_CONFIG = {
  KEEP: { label: 'Keep', variant: 'success', icon: 'bi-journal-check' },
  DONATE: { label: 'Donate', variant: 'info', icon: 'bi-gift' },
  SELL: { label: 'Sell', variant: 'primary', icon: 'bi-cash-coin' },
  DISCARD: { label: 'Discard', variant: 'danger', icon: 'bi-trash3' },
};

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
  // Stable ref to the active Html5Qrcode instance so cleanup can always reach it
  const qrRef = useRef(null);
  // Incremented on every fetchAiRecommendation call; stale responses are discarded
  const reqVersionRef = useRef(0);
  // Debounce timer for condition-change auto-retrigger
  const conditionDebounceRef = useRef(null);

  // Book state
  const [isbn, setIsbn] = useState('');
  const [book, setBook] = useState(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState(null);

  // Title/author search state
  const [searchTitle, setSearchTitle] = useState('');
  const [searchAuthor, setSearchAuthor] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);

  // AI recommendation state
  const [aiRec, setAiRec] = useState(null);
  const [aiValuationData, setAiValuationData] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [overriding, setOverriding] = useState(false);

  const [submitError, setSubmitError] = useState(null);

  const formik = useFormik({
    initialValues: {
      status: 'KEEP',
      condition_grade: 'GOOD',
      condition_flags: [],
      notes: '',
      marketplace_description: '',
      asking_price: '',
      donation_dest: '',
    },
    validate: validateWithZod(catalogSchema),
    onSubmit: (values) => {
      handleFinalSubmit(values);
    },
  });

  // Fetch active goal on mount
  useEffect(() => {
    getCullingGoals()
      .then((res) => {
        setActiveGoal(res.data.find((g) => g.is_active) || null);
        setGoalCheckDone(true);
      })
      .catch(() => setGoalCheckDone(true));
  }, []);

  const fetchAiRecommendation = useCallback(
    (bookIsbn, grade, flags, { applyStatus = true } = {}) => {
      // Stamp this request; any response with a stale version will be discarded
      const version = ++reqVersionRef.current;
      setAiLoading(true);
      setAiError(null);
      setAiRec(null);
      setAiValuationData(null);
      getRecommendation({ isbn: bookIsbn, condition_grade: grade, condition_flags: flags })
        .then((res) => {
          if (version !== reqVersionRef.current) return; // stale — a newer request is in flight
          const { valuation_data, ...rec } = res.data;
          setAiRec(rec);
          setAiValuationData(valuation_data || null);
          // Only apply the AI's status when the user hasn't manually overridden it
          if (applyStatus) {
            formik.setFieldValue('status', rec.status);
          }
          if (rec.suggested_price) {
            formik.setFieldValue('asking_price', String(rec.suggested_price));
          }
          if (rec.marketplace_description) {
            formik.setFieldValue('marketplace_description', rec.marketplace_description);
          }
          setAiLoading(false);
        })
        .catch((err) => {
          if (version !== reqVersionRef.current) return;
          const msg = err.response?.data?.error || 'AI recommendation failed.';
          setAiError(msg);
          setAiLoading(false);
        });
    },
    [formik],
  );

  const handleLookup = useCallback(
    (lookupIsbn) => {
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
    },
    [fetchAiRecommendation],
  );

  const handleSearch = useCallback(() => {
    if (!searchTitle.trim() && !searchAuthor.trim()) return;
    setSearchLoading(true);
    setSearchError(null);
    setSearchResults(null);
    searchBooks({ title: searchTitle.trim(), author: searchAuthor.trim() })
      .then((res) => {
        setSearchResults(res.data);
        setSearchLoading(false);
      })
      .catch(() => {
        setSearchError('Search failed. Please try again.');
        setSearchLoading(false);
      });
  }, [searchTitle, searchAuthor]);

  useEffect(() => {
    if (step !== 1 || !activeGoal || !cameraEnabled) return;

    let qr = null;
    let cancelled = false;
    let startPromise = null;

    const timer = setTimeout(() => {
      if (cancelled) return;
      const readerEl = document.getElementById('reader');
      if (readerEl) readerEl.innerHTML = '';

      qr = new Html5Qrcode('reader', {
        formatsToSupport: [Html5QrcodeSupportedFormats.EAN_13],
      });
      qrRef.current = qr;
      startPromise = qr
        .start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: 250 },
          (decodedText) => {
            if (cancelled) return;
            const instance = qr;
            qr = null;
            qrRef.current = null;
            instance.stop().catch(() => {});
            handleLookup(decodedText);
          },
          () => {},
        )
        .then(() => {
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
          qrRef.current = null;
        });
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      const instance = qr || qrRef.current;
      if (instance) {
        qr = null;
        qrRef.current = null;
        (startPromise || Promise.resolve()).then(() => instance.stop().catch(() => {}));
      }
    };
  }, [step, activeGoal, cameraEnabled, handleLookup]);

  const handleConditionToggle = (flag) => {
    const currentFlags = formik.values.condition_flags;
    const nextFlags = currentFlags.includes(flag)
      ? currentFlags.filter((f) => f !== flag)
      : [...currentFlags, flag];
    formik.setFieldValue('condition_flags', nextFlags);
  };

  // Auto-retrigger AI recommendation when condition changes on step 2.
  // Debounced 800ms so rapid flag toggles batch into a single request.
  // Uses the current value of `overriding` captured at fire time: if the user
  // has manually chosen their own status, we refresh price/copy/valuation only
  // (applyStatus: false); otherwise we let the AI update everything.
  useEffect(() => {
    if (!isbn || !book || step !== 2) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: disables Accept immediately so user can't save stale data during debounce window
    setAiLoading(true);
    clearTimeout(conditionDebounceRef.current);
    conditionDebounceRef.current = setTimeout(() => {
      fetchAiRecommendation(isbn, formik.values.condition_grade, formik.values.condition_flags, {
        applyStatus: !overriding,
      });
    }, 800);
    return () => clearTimeout(conditionDebounceRef.current);
  }, [formik.values.condition_grade, formik.values.condition_flags]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAcceptSuggestion = () => {
    formik.setFieldValue('status', aiRec.status);
    if (aiRec.suggested_price) {
      formik.setFieldValue('asking_price', String(aiRec.suggested_price));
    }
    if (aiRec.marketplace_description) {
      formik.setFieldValue('marketplace_description', aiRec.marketplace_description);
    }
    setOverriding(false);
  };

  const handleFinalSubmit = (values) => {
    setSubmitError(null);
    const data = {
      book_id: book.id,
      status: values.status,
      condition_grade: values.condition_grade,
      condition_flags: values.condition_flags,
      notes: values.notes,
      marketplace_description: values.status === 'SELL' ? values.marketplace_description : '',
      asking_price: values.status === 'SELL' ? values.asking_price : null,
      donation_dest: values.status === 'DONATE' ? values.donation_dest : '',
      ai_recommendation: aiRec || {},
      valuation_data: aiValuationData || {},
    };

    createCatalogEntry(data)
      .then(() => setStep(3))
      .catch(() => setSubmitError('Failed to save entry.'));
  };

  const resetAll = () => {
    setStep(1);
    setBook(null);
    setIsbn('');
    reqVersionRef.current = 0;
    clearTimeout(conditionDebounceRef.current);
    formik.resetForm();
    setAiRec(null);
    setAiValuationData(null);
    setAiError(null);
    setAiLoading(false);
    setOverriding(false);
    setSubmitError(null);
    setCameraEnabled(true);
    setSearchTitle('');
    setSearchAuthor('');
    setSearchResults(null);
    setSearchError(null);
  };

  const getEbayLink = () =>
    `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(book.isbn || book.title)}`;
  const getAmazonLink = () =>
    `https://www.amazon.com/s?k=${encodeURIComponent(book.isbn || book.title)}&i=stripbooks`;

  if (step === 1) {
    if (!goalCheckDone) {
      return (
        <Container className="py-5 text-center">
          <Spinner animation="border" variant="warning" />
        </Container>
      );
    }

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
          <div className="text-muted small mb-2">Step 1 of 3</div>
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

                <hr className="my-4" />

                <p className="text-muted small text-uppercase fw-bold mb-3">
                  <i className="bi bi-search me-1"></i>Search by Title or Author
                </p>
                <p className="text-muted small mb-3">
                  No barcode? Search by title or author to find and select the correct edition.
                </p>
                <Form.Group className="mb-2">
                  <Form.Control
                    placeholder="Title..."
                    value={searchTitle}
                    onChange={(e) => setSearchTitle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Control
                    placeholder="Author (optional)..."
                    value={searchAuthor}
                    onChange={(e) => setSearchAuthor(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </Form.Group>
                <Button
                  variant="outline-warning"
                  className="w-100"
                  onClick={handleSearch}
                  disabled={searchLoading || (!searchTitle.trim() && !searchAuthor.trim())}
                >
                  {searchLoading ? (
                    <Spinner animation="border" size="sm" className="me-2" />
                  ) : (
                    <i className="bi bi-search me-2"></i>
                  )}
                  Search
                </Button>

                {searchError && (
                  <Alert variant="danger" className="mt-3">
                    {searchError}
                  </Alert>
                )}

                {searchResults !== null && (
                  <div className="mt-3">
                    {searchResults.length === 0 ? (
                      <Alert variant="warning" className="mb-0">
                        No results found. Try different search terms.
                      </Alert>
                    ) : (
                      <div className="list-group">
                        {searchResults.map((result, idx) => (
                          <div
                            key={idx}
                            className="list-group-item list-group-item-action d-flex align-items-center gap-3 py-3"
                          >
                            {result.cover_url ? (
                              <img
                                src={result.cover_url}
                                alt={result.title}
                                style={{ width: '40px', height: '56px', objectFit: 'cover' }}
                                className="rounded flex-shrink-0"
                                loading="lazy"
                              />
                            ) : (
                              <div
                                className="bg-light rounded d-flex align-items-center justify-content-center flex-shrink-0"
                                style={{ width: '40px', height: '56px' }}
                              >
                                <i className="bi bi-book text-muted small"></i>
                              </div>
                            )}
                            <div className="flex-grow-1 min-width-0">
                              <div className="fw-bold text-truncate small">{result.title}</div>
                              <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                                {result.author}
                                {result.publish_year && ` · ${result.publish_year}`}
                              </div>
                              {!result.isbn && (
                                <span
                                  className="badge bg-secondary mt-1"
                                  style={{ fontSize: '0.65rem' }}
                                >
                                  No ISBN
                                </span>
                              )}
                            </div>
                            <Button
                              variant={result.isbn ? 'outline-warning' : 'outline-secondary'}
                              size="sm"
                              className="flex-shrink-0"
                              disabled={!result.isbn}
                              onClick={() => result.isbn && handleLookup(result.isbn)}
                              title={
                                result.isbn
                                  ? `Look up ISBN ${result.isbn}`
                                  : 'No ISBN available for this edition'
                              }
                            >
                              Select
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    );
  }

  if (step === 2) {
    const metadataMissing = book.metadata_found === false;

    return (
      <Container className="py-4">
        <div className="text-center mb-2">
          <div className="text-muted small">Step 2 of 3</div>
        </div>
        <GoalPill goal={activeGoal} />

        <Row>
          <Col lg={4} className="mb-4">
            <Card className="shadow-sm border-0 sticky-top" style={{ top: '2rem' }}>
              <Card.Body className="text-center p-4">
                {book.cover_url || book.cover_image ? (
                  <img
                    src={book.cover_url || book.cover_image}
                    alt={book.title}
                    className="img-fluid rounded shadow mb-4"
                    style={{ maxHeight: '300px' }}
                    loading="lazy"
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

          <Col lg={8}>
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

            <Form noValidate onSubmit={formik.handleSubmit}>
              <RecommendationCard
                aiRec={aiRec}
                aiLoading={aiLoading}
                aiError={aiError}
                overriding={overriding}
                setOverriding={setOverriding}
                status={formik.values.status}
                setStatus={(val) => formik.setFieldValue('status', val)}
                handleAcceptSuggestion={handleAcceptSuggestion}
                fetchAiRecommendation={() =>
                  fetchAiRecommendation(
                    isbn,
                    formik.values.condition_grade,
                    formik.values.condition_flags,
                    { applyStatus: !overriding },
                  )
                }
                valuationData={aiValuationData}
              />

              {(overriding || (!aiRec && !aiLoading)) && (
                <Card className="shadow-sm border-0 mb-4">
                  <Card.Header className="bg-white fw-bold py-3">Select Status</Card.Header>
                  <Card.Body className="p-4">
                    <Row className="g-3">
                      {Object.entries(STATUS_CONFIG).map(([id, cfg]) => (
                        <Col key={id} xs={6} md={3}>
                          <Card
                            className={`text-center h-100 border-2 ${formik.values.status === id ? `border-${cfg.variant} bg-light` : 'border-light shadow-sm'}`}
                            onClick={() => formik.setFieldValue('status', id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                formik.setFieldValue('status', id);
                              }
                            }}
                            role="button"
                            tabIndex="0"
                            aria-pressed={formik.values.status === id}
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

              <ConditionForm
                formik={formik}
                handleConditionToggle={handleConditionToggle}
                fetchAiRecommendation={() =>
                  fetchAiRecommendation(
                    isbn,
                    formik.values.condition_grade,
                    formik.values.condition_flags,
                    { applyStatus: !overriding },
                  )
                }
                aiRec={aiRec}
                getEbayLink={getEbayLink}
                getAmazonLink={getAmazonLink}
              />

              {submitError && <Alert variant="danger">{submitError}</Alert>}

              {formik.submitCount > 0 && !formik.isValid && (
                <Alert variant="danger" className="mb-3 shadow-sm">
                  <div className="fw-bold mb-1">
                    <i className="bi bi-exclamation-octagon-fill me-2"></i>
                    Please correct the following errors:
                  </div>
                  <ul className="mb-0 ps-3 small">
                    {Object.values(formik.errors).map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </Alert>
              )}

              <div className="d-grid">
                <Button
                  variant="warning"
                  size="lg"
                  className="fw-bold py-3 shadow-sm"
                  type="submit"
                  disabled={aiLoading}
                >
                  Save & Scan Next
                </Button>
              </div>
            </Form>
          </Col>
        </Row>
      </Container>
    );
  }

  if (step === 3) {
    return (
      <Container className="py-5 text-center">
        <div className="text-muted small mb-4">Step 3 of 3</div>
        <div className="mb-4">
          <i className="bi bi-check-circle-fill display-1 text-success"></i>
        </div>
        <h2 className="fw-bold">Saved!</h2>
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
            Collection
          </Button>
        </div>
      </Container>
    );
  }
};

export default TriageWizard;
