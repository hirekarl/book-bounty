import React, { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../services/api';

const Register = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password1, setPassword1] = useState('');
  const [password2, setPassword2] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    register({ username, email, password1, password2 })
      .then(() => {
        setLoading(false);
        navigate('/');
      })
      .catch((err) => {
        const data = err.response?.data;
        if (data && typeof data === 'object') {
          setErrors(data);
        } else {
          setErrors({ non_field: ['Registration failed. Please try again.'] });
        }
        setLoading(false);
      });
  };

  const fieldError = (field) => {
    const msgs = errors[field];
    return msgs ? <Form.Text className="text-danger">{msgs[0]}</Form.Text> : null;
  };

  return (
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col md={5}>
          <div className="text-center mb-4">
            <i className="bi bi-bookmark-star-fill display-3 text-warning"></i>
            <h2 className="fw-bold mt-2">BookBounty</h2>
            <p className="text-muted">Create an account to start managing your collection.</p>
          </div>
          <Card className="shadow-sm border-0">
            <Card.Body className="p-4">
              {errors.non_field && <Alert variant="danger">{errors.non_field[0]}</Alert>}
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
                    isInvalid={!!errors.username}
                    required
                  />
                  {fieldError('username')}
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold text-muted small text-uppercase">
                    Email <span className="fw-normal text-muted">(optional)</span>
                  </Form.Label>
                  <Form.Control
                    size="lg"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold text-muted small text-uppercase">
                    Password
                  </Form.Label>
                  <Form.Control
                    size="lg"
                    type="password"
                    value={password1}
                    onChange={(e) => setPassword1(e.target.value)}
                    isInvalid={!!errors.password1}
                    required
                  />
                  {fieldError('password1')}
                </Form.Group>
                <Form.Group className="mb-4">
                  <Form.Label className="fw-bold text-muted small text-uppercase">
                    Confirm Password
                  </Form.Label>
                  <Form.Control
                    size="lg"
                    type="password"
                    value={password2}
                    onChange={(e) => setPassword2(e.target.value)}
                    isInvalid={!!errors.password2}
                    required
                  />
                  {fieldError('password2')}
                </Form.Group>
                <div className="d-grid">
                  <Button
                    type="submit"
                    variant="warning"
                    size="lg"
                    className="fw-bold"
                    disabled={loading}
                  >
                    {loading ? <Spinner animation="border" size="sm" /> : 'Create Account'}
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
          <p className="text-center text-muted mt-3 small">
            Already have an account?{' '}
            <Link to="/login" className="text-warning fw-bold">
              Sign in
            </Link>
          </p>
        </Col>
      </Row>
    </Container>
  );
};

export default Register;
