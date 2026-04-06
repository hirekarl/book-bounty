import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Button, Spinner, Alert } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { getDashboardStats } from '../services/api';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getDashboardStats()
      .then((res) => {
        setStats(res.data);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to fetch stats. Is the backend running?');
        setLoading(false);
      });
  }, []);

  const statCards = [
    { label: 'Keep', variant: 'success', icon: 'bi-journal-check', countKey: 'KEEP' },
    { label: 'Donate', variant: 'info', icon: 'bi-gift', countKey: 'DONATE' },
    { label: 'Sell', variant: 'primary', icon: 'bi-cash-coin', countKey: 'SELL' },
    { label: 'Discard', variant: 'danger', icon: 'bi-trash3', countKey: 'DISCARD' },
  ];

  if (loading) {
    return (
      <Container className="text-center mt-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </Container>
    );
  }

  return (
    <Container>
      <header className="mb-5 text-center bg-light p-5 rounded-3 shadow-sm">
        <i className="bi bi-bookmark-star-fill display-1 text-warning mb-3"></i>
        <h1 className="display-4 fw-bold">Welcome to BookBounty</h1>
        <p className="lead text-muted">Turn your library into a garage sale goldmine.</p>
        <Button as={Link} to="/scan" variant="warning" size="lg" className="mt-3 px-5 py-3 fw-bold">
          <i className="bi bi-upc-scan me-2"></i> Start Scanning
        </Button>
      </header>

      {error && <Alert variant="danger">{error}</Alert>}

      <Row className="g-4 mb-5">
        {statCards.map((card) => (
          <Col key={card.label} xs={12} md={6} lg={3}>
            <Card className={`text-center border-${card.variant} h-100 shadow-sm`}>
              <Card.Header className={`bg-${card.variant} text-white py-3`}>
                <i className={`bi ${card.icon} fs-2`}></i>
              </Card.Header>
              <Card.Body>
                <Card.Title className="text-muted text-uppercase small fw-bold">
                  {card.label}
                </Card.Title>
                <Card.Text className="display-5 fw-bold text-dark">
                  {stats ? stats[card.countKey] : 0}
                </Card.Text>
              </Card.Body>
              <Card.Footer className="bg-transparent border-0 pb-3">
                <Button
                  as={Link}
                  to={`/collection?status=${card.countKey}`}
                  variant={`outline-${card.variant}`}
                  size="sm"
                >
                  View Collection
                </Button>
              </Card.Footer>
            </Card>
          </Col>
        ))}
      </Row>
    </Container>
  );
};

export default Dashboard;
