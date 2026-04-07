import React from 'react';
import { Container, Row, Col, Button, Navbar, Nav, Card } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="bg-light min-vh-100 d-flex flex-column">
      {/* Navbar */}
      <Navbar bg="dark" variant="dark" expand="lg" className="py-3 shadow-sm">
        <Container>
          <Navbar.Brand className="d-flex align-items-center fw-bold fs-4">
            <i className="bi bi-bookmark-star-fill me-2" style={{ color: '#ffc107' }}></i>
            BookBounty
          </Navbar.Brand>
          <Nav className="ms-auto">
            <Button variant="warning" className="fw-bold px-4" onClick={() => navigate('/login')}>
              Sign In
            </Button>
          </Nav>
        </Container>
      </Navbar>

      {/* Hero Section */}
      <div className="flex-grow-1 d-flex align-items-center bg-white border-bottom">
        <Container className="py-5 my-5">
          <Row className="align-items-center justify-content-between">
            <Col lg={6} className="mb-5 mb-lg-0">
              <h1 className="display-4 fw-bold text-dark mb-4">
                Declutter Your Library with <span className="text-warning">AI</span>.
              </h1>
              <p className="lead text-secondary mb-5">
                The opinionated triage tool for your personal book collection. Scan a barcode, set a
                downsizing goal, and let AI tell you what to keep, sell, donate, or discard.
              </p>
              <div className="d-flex gap-3">
                <Button
                  variant="warning"
                  size="lg"
                  className="fw-bold px-5 py-3 shadow-sm"
                  onClick={() => navigate('/login')}
                >
                  Get Started
                </Button>
              </div>
            </Col>
            <Col lg={5} className="text-center d-none d-lg-block">
              <i
                className="bi bi-collection display-1 text-muted"
                style={{ fontSize: '12rem', opacity: 0.2 }}
              ></i>
            </Col>
          </Row>
        </Container>
      </div>

      {/* Features Section */}
      <div className="bg-light py-5">
        <Container className="py-4">
          <Row className="g-4 text-center">
            <Col md={4}>
              <Card className="h-100 border-0 shadow-sm p-4 bg-white rounded-4">
                <Card.Body>
                  <div className="mb-4">
                    <i className="bi bi-upc-scan display-4 text-warning"></i>
                  </div>
                  <h4 className="fw-bold mb-3">Fast Scanning</h4>
                  <p className="text-muted mb-0">
                    Use your device's camera to scan ISBN barcodes and instantly fetch metadata from
                    Open Library.
                  </p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="h-100 border-0 shadow-sm p-4 bg-white rounded-4">
                <Card.Body>
                  <div className="mb-4">
                    <i className="bi bi-robot display-4 text-primary"></i>
                  </div>
                  <h4 className="fw-bold mb-3">AI-Powered Decisions</h4>
                  <p className="text-muted mb-0">
                    Gemini 2.5 Flash aligns with your personal culling goal to recommend the best
                    action for every book.
                  </p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="h-100 border-0 shadow-sm p-4 bg-white rounded-4">
                <Card.Body>
                  <div className="mb-4">
                    <i className="bi bi-graph-up-arrow display-4 text-success"></i>
                  </div>
                  <h4 className="fw-bold mb-3">Market Valuation</h4>
                  <p className="text-muted mb-0">
                    Get real-time eBay market data to identify valuable titles worth selling instead
                    of donating.
                  </p>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>

      {/* Footer */}
      <footer className="bg-dark text-white py-4 mt-auto">
        <Container className="text-center">
          <p className="mb-0 text-white-50">
            &copy; {new Date().getFullYear()} BookBounty. An AI workflow automation project.
          </p>
        </Container>
      </footer>
    </div>
  );
};

export default Landing;
