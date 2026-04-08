import React, { useState } from 'react';
import { Container, Navbar, Nav, Button } from 'react-bootstrap';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { logout } from '../services/api';
import { useNotification } from '../contexts/NotificationContext';
import UserGuideModal from './common/UserGuideModal';

const Layout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { showNotification } = useNotification();
  const [showGuide, setShowGuide] = useState(false);

  const handleLogout = () => {
    logout().finally(() => {
      showNotification({ message: "You've been signed out.", type: 'info', duration: 3000 });
      navigate('/login');
    });
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
              <Nav.Link as={Link} to="/" active={location.pathname === '/'}>
                Dashboard
              </Nav.Link>
              <Nav.Link as={Link} to="/scan" active={location.pathname === '/scan'}>
                Scan Books
              </Nav.Link>
              <Nav.Link as={Link} to="/collection" active={location.pathname === '/collection'}>
                Collection
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
