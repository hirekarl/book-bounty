import React, { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/api';

const Login = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    login({ username, password })
      .then(() => navigate('/'))
      .catch(() => {
        setError('Invalid username or password.');
        setLoading(false);
      });
  };

  return (
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col md={5}>
          <div className="text-center mb-4">
            <i className="bi bi-bookmark-star-fill display-3 text-warning"></i>
            <h2 className="fw-bold mt-2">BookBounty</h2>
            <p className="text-muted">Sign in to manage your collection.</p>
          </div>
          <Card className="shadow-sm border-0">
            <Card.Body className="p-4">
              {error && <Alert variant="danger">{error}</Alert>}
              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold text-muted small text-uppercase">
                    Username
                  </Form.Label>
                  <Form.Control
                    size="lg"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </Form.Group>
                <Form.Group className="mb-4">
                  <Form.Label className="fw-bold text-muted small text-uppercase">
                    Password
                  </Form.Label>
                  <Form.Control
                    size="lg"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </Form.Group>
                <div className="d-grid">
                  <Button
                    type="submit"
                    variant="warning"
                    size="lg"
                    className="fw-bold"
                    disabled={loading}
                  >
                    {loading ? <Spinner animation="border" size="sm" /> : 'Sign In'}
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Login;
