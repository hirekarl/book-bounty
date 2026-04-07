import React, { useState } from 'react';
import { Container, Navbar, Nav, Button } from 'react-bootstrap';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { logout } from '../services/api';
import UserGuideModal from './common/UserGuideModal';

const Layout = () => {
  const navigate = useNavigate();
  const [showGuide, setShowGuide] = useState(false);

  const handleLogout = () => {
    logout().finally(() => navigate('/login'));
  };

  return (
    <>
      <Navbar bg="dark" variant="dark" expand="lg" sticky="top" className="mb-4">
        <Container>
          <Navbar.Brand as={Link} to="/" className="d-flex align-items-center">
            <i className="bi bi-bookmark-star-fill me-2" style={{ color: '#ffc107' }}></i>
            BookBounty
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="me-auto">
              <Nav.Link as={Link} to="/">
                Dashboard
              </Nav.Link>
              <Nav.Link as={Link} to="/scan">
                Triage Wizard
              </Nav.Link>
              <Nav.Link as={Link} to="/collection">
                Inventory
              </Nav.Link>
            </Nav>
            <div className="d-flex gap-2">
              <Button
                variant="outline-light"
                size="sm"
                onClick={() => setShowGuide(true)}
                aria-label="User Guide"
                title="User Guide"
              >
                <i className="bi bi-question-circle"></i>
              </Button>
              <Button variant="outline-light" size="sm" onClick={handleLogout}>
                <i className="bi bi-box-arrow-right me-1"></i>Sign Out
              </Button>
            </div>
          </Navbar.Collapse>
        </Container>
      </Navbar>
      <main>
        <Outlet />
      </main>
      <UserGuideModal show={showGuide} onHide={() => setShowGuide(false)} />
    </>
  );
};

export default Layout;
