import React, { useEffect } from 'react';
import { Container, Row, Col, Button, Navbar, Nav, Card, Badge } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

const COHORTS = [
  {
    icon: 'bi-mortarboard',
    label: 'College Students',
    description:
      'End-of-semester purge or post-graduation move. Quickly decide which textbooks and novels to keep, sell on eBay, or drop at the campus library.',
  },
  {
    icon: 'bi-house-heart',
    label: 'Retirees & Empty Nesters',
    description:
      'Downsizing a home library is emotionally heavy and logistically complex. BookBounty gives you an objective voice for every title on the shelf.',
  },
  {
    icon: 'bi-bookmark-check',
    label: 'Minimalists & Bibliophiles',
    description:
      'Curating a more intentional library. Set a precise goal — "keep only what I\'d reread" — and let the AI hold you to it, book by book.',
  },
  {
    icon: 'bi-briefcase',
    label: 'Estate Executors',
    description:
      "Sorting a loved one's collection under time pressure. BookBounty brings structure and objectivity to an emotionally charged task.",
  },
];

const HOW_IT_WORKS = [
  {
    step: '01',
    icon: 'bi-bullseye',
    title: 'Set a Culling Goal',
    description:
      'Write your intent in plain language — "I\'m moving into a tiny house; keep only essentials and high-value collectibles." The AI reads your goal before evaluating every book.',
  },
  {
    step: '02',
    icon: 'bi-upc-scan',
    title: 'Scan or Search',
    description:
      'Point your camera at a barcode for an instant ISBN lookup, enter the ISBN manually, or search by title and author for older books without scannable barcodes.',
  },
  {
    step: '03',
    icon: 'bi-check2-circle',
    title: 'Accept, Override, Resolve',
    description:
      'The AI returns a recommendation — KEEP, SELL, DONATE, or DISCARD — with a confidence score and one-sentence reasoning. Accept it in one click or override and save your own call.',
  },
];

const FEATURES = [
  {
    icon: 'bi-robot',
    variant: 'primary',
    title: 'Gemini 2.5 Flash AI',
    description:
      'Structured recommendations with confidence scoring, reasoning, suggested pricing, and AI-generated marketplace copy for listings.',
  },
  {
    icon: 'bi-cash-coin',
    variant: 'success',
    title: 'Live Market Valuation',
    description:
      'Real-time eBay sold-listing data surfaces which titles are worth selling before you donate them. Demo mode provides deterministic mock pricing.',
  },
  {
    icon: 'bi-table',
    variant: 'warning',
    title: 'Full Inventory & Export',
    description:
      'Filter by status, resolution state, or search query. Bulk-update decisions. Export your catalog to CSV, Excel, or PDF.',
  },
];

const Landing = () => {
  const navigate = useNavigate();

  useEffect(() => {
    if (localStorage.getItem('token')) {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  return (
    <div className="bg-light min-vh-100 d-flex flex-column">
      {/* Navbar */}
      <Navbar bg="dark" variant="dark" expand="lg" className="py-3 shadow-sm">
        <Container>
          <Navbar.Brand className="d-flex align-items-center fw-bold fs-4">
            <i className="bi bi-bookmark-star-fill me-2" style={{ color: '#ffc107' }}></i>
            BookBounty
          </Navbar.Brand>
          <Nav className="ms-auto align-items-center gap-3">
            <Nav.Link
              href="https://github.com/hirekarl/book-bounty"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white-50 d-flex align-items-center gap-1"
            >
              <i className="bi bi-github"></i>
              <span className="d-none d-sm-inline">GitHub</span>
            </Nav.Link>
            <Button
              variant="outline-warning"
              className="fw-bold px-3"
              onClick={() => navigate('/login')}
            >
              Sign In
            </Button>
            <Button
              variant="warning"
              className="fw-bold px-3"
              onClick={() => navigate('/register')}
            >
              Sign Up
            </Button>
          </Nav>
        </Container>
      </Navbar>

      {/* Hero */}
      <div className="bg-dark text-white py-5">
        <Container className="py-5">
          <Row className="align-items-center justify-content-between">
            <Col lg={7} className="mb-5 mb-lg-0">
              <Badge
                bg="warning"
                text="dark"
                className="mb-4 px-3 py-2 fw-normal"
                style={{ fontSize: '0.8rem' }}
              >
                <i className="bi bi-award me-1"></i>
                MVP · Pursuit AI Native Fellowship
              </Badge>
              <h1 className="display-4 fw-bold mb-4">
                Declutter Your Library
                <br />
                with <span className="text-warning">AI</span>.
              </h1>
              <p className="lead text-white-50 mb-5" style={{ maxWidth: '520px' }}>
                Set a downsizing goal, scan a barcode, and let Gemini 2.5 Flash tell you whether
                each book should be kept, sold, donated, or discarded — with a confidence score and
                plain-language reasoning for every decision.
              </p>
              <div className="d-flex flex-wrap gap-3">
                <Button
                  variant="warning"
                  size="lg"
                  className="fw-bold px-5 py-3 shadow-sm"
                  onClick={() => navigate('/register')}
                >
                  Get Started
                </Button>
                <Button
                  variant="outline-light"
                  size="lg"
                  className="px-5 py-3"
                  onClick={() => navigate('/login')}
                >
                  Sign In
                </Button>
              </div>
            </Col>
            <Col
              lg={4}
              className="text-center d-none d-lg-flex flex-column align-items-center gap-3"
            >
              <i
                className="bi bi-bookmark-star-fill text-warning"
                style={{ fontSize: '9rem', opacity: 0.15 }}
              ></i>
            </Col>
          </Row>
        </Container>
      </div>

      {/* How It Works */}
      <div className="bg-white py-5 border-bottom">
        <Container className="py-4">
          <div className="text-center mb-5">
            <h2 className="fw-bold">How It Works</h2>
            <p className="text-muted">Three steps per book. Repeat until your shelves are clear.</p>
          </div>
          <Row className="g-4">
            {HOW_IT_WORKS.map((step) => (
              <Col md={4} key={step.step}>
                <div className="d-flex gap-4 align-items-start">
                  <div
                    className="fw-bold text-warning flex-shrink-0"
                    style={{
                      fontSize: '2.5rem',
                      lineHeight: 1,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {step.step}
                  </div>
                  <div>
                    <h5 className="fw-bold mb-2">
                      <i className={`bi ${step.icon} me-2 text-warning`}></i>
                      {step.title}
                    </h5>
                    <p className="text-muted mb-0 small">{step.description}</p>
                  </div>
                </div>
              </Col>
            ))}
          </Row>
        </Container>
      </div>

      {/* Who It's For */}
      <div className="bg-light py-5">
        <Container className="py-4">
          <div className="text-center mb-5">
            <h2 className="fw-bold">Who It&rsquo;s For</h2>
            <p className="text-muted">
              BookBounty is a single-user tool built for anyone with more books than shelf space.
            </p>
          </div>
          <Row className="g-4">
            {COHORTS.map((cohort) => (
              <Col md={6} lg={3} key={cohort.label}>
                <Card className="h-100 border-0 shadow-sm rounded-4 bg-white">
                  <Card.Body className="p-4">
                    <div className="mb-3">
                      <i className={`bi ${cohort.icon} fs-2 text-warning`}></i>
                    </div>
                    <h6 className="fw-bold mb-2">{cohort.label}</h6>
                    <p className="text-muted small mb-0">{cohort.description}</p>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </Container>
      </div>

      {/* Capabilities */}
      <div className="bg-white py-5 border-top border-bottom">
        <Container className="py-4">
          <div className="text-center mb-5">
            <h2 className="fw-bold">What It Can Do</h2>
            <p className="text-muted">The full feature set in a deployable MVP.</p>
          </div>
          <Row className="g-4">
            {FEATURES.map((f) => (
              <Col md={4} key={f.title}>
                <Card className="h-100 border-0 shadow-sm rounded-4 text-center bg-light">
                  <Card.Body className="p-4">
                    <div className="mb-3">
                      <i className={`bi ${f.icon} display-5 text-${f.variant}`}></i>
                    </div>
                    <h5 className="fw-bold mb-3">{f.title}</h5>
                    <p className="text-muted small mb-0">{f.description}</p>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
          <Row className="g-3 mt-2">
            {[
              'Camera-based ISBN scanning (EAN-13)',
              'Manual ISBN entry + title/author search',
              'Open Library metadata lookup',
              'Culling goal templates & custom goals',
              'Condition grading & damage flags',
              'Resolution lifecycle (active → resolved)',
              'Bulk status updates',
              'In-Collection view',
              'Progress tracking — pending and resolved counts by decision type',
              'CSV, Excel & PDF export',
              'Token-based single-user auth',
              'Render Blueprint deployment (free tier)',
            ].map((feat) => (
              <Col xs={12} sm={6} lg={4} key={feat}>
                <div className="d-flex align-items-center gap-2 text-muted small">
                  <i className="bi bi-check-circle-fill text-success flex-shrink-0"></i>
                  {feat}
                </div>
              </Col>
            ))}
          </Row>
        </Container>
      </div>

      {/* Genesis / About */}
      <div className="bg-dark text-white py-5">
        <Container className="py-4">
          <Row className="justify-content-center">
            <Col lg={8} className="text-center">
              <Badge bg="warning" text="dark" className="mb-4 px-3 py-2 fw-normal">
                <i className="bi bi-book me-1"></i> Origin Story
              </Badge>
              <h2 className="fw-bold mb-4">Built at Pursuit</h2>
              <p className="text-white-50 mb-4">
                BookBounty grew out of <strong className="text-white">StewardStack</strong> — a
                prototype built to help academic librarians at Pitts Theological Library (Emory
                University) process large influxes of book donations. When the institutional scope
                narrowed, the same core idea — AI-assisted triage against a stated goal — turned out
                to be exactly what individuals needed when clearing out a personal collection.
              </p>
              <p className="text-white-50 mb-5">
                The app was developed as an MVP during the{' '}
                <a
                  href="https://www.pursuit.org/ai-native-program"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-warning"
                >
                  Pursuit AI Native Fellowship
                </a>
                , a program that trains engineers to build production-grade AI applications. The
                build process itself — orchestrating a multi-agent Claude Code team across backend,
                frontend, AI, and QA personas — became its own case study in AI workflow automation.
              </p>
              <div className="d-flex flex-wrap justify-content-center gap-3">
                <Button
                  href="https://github.com/hirekarl/book-bounty"
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="outline-light"
                  size="lg"
                  className="px-5"
                >
                  <i className="bi bi-github me-2"></i>View the Repo
                </Button>
                <Button
                  href="https://www.pursuit.org/ai-native-program"
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="warning"
                  size="lg"
                  className="px-5 fw-bold"
                >
                  Learn About Pursuit
                </Button>
              </div>
            </Col>
          </Row>
        </Container>
      </div>

      {/* Footer */}
      <footer className="bg-black text-white py-4 mt-auto">
        <Container>
          <Row className="align-items-center">
            <Col md={6} className="text-center text-md-start mb-3 mb-md-0">
              <span className="fw-bold text-warning me-2">
                <i className="bi bi-bookmark-star-fill me-1"></i>BookBounty
              </span>
              <span className="text-white-50 small">
                &copy; {new Date().getFullYear()} · Personal AI-powered library triage.
              </span>
            </Col>
            <Col md={6} className="text-center text-md-end">
              <a
                href="https://github.com/hirekarl/book-bounty"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white-50 text-decoration-none me-4 small"
              >
                <i className="bi bi-github me-1"></i>GitHub
              </a>
              <a
                href="https://www.pursuit.org/ai-native-program"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white-50 text-decoration-none small"
              >
                <i className="bi bi-award me-1"></i>Pursuit AI Native
              </a>
            </Col>
          </Row>
        </Container>
      </footer>
    </div>
  );
};

export default Landing;
