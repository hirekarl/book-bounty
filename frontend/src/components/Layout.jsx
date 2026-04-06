import React from 'react';
import { Container, Navbar, Nav, Button } from 'react-bootstrap';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { logout } from '../services/api';

const Layout = () => {
  const navigate = useNavigate();

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
            <Button variant="outline-light" size="sm" onClick={handleLogout}>
              <i className="bi bi-box-arrow-right me-1"></i>Sign Out
            </Button>
          </Navbar.Collapse>
        </Container>
      </Navbar>
      <main>
        <Outlet />
      </main>
    </>
  );
};

export default Layout;
