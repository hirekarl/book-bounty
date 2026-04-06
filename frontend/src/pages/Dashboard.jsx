import React, { useEffect, useState } from 'react';
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Spinner,
  Alert,
  Badge,
  Form,
  Collapse,
} from 'react-bootstrap';
import { Link } from 'react-router-dom';
import {
  getDashboardStats,
  getCullingGoals,
  createCullingGoal,
  setActiveGoal,
} from '../services/api';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [goals, setGoals] = useState([]);
  const [goalsLoading, setGoalsLoading] = useState(true);
  const [showGoalList, setShowGoalList] = useState(false);
  const [showNewGoalForm, setShowNewGoalForm] = useState(false);
  const [newGoalName, setNewGoalName] = useState('');
  const [newGoalDesc, setNewGoalDesc] = useState('');
  const [goalSaving, setGoalSaving] = useState(false);

  const fetchGoals = () => {
    setGoalsLoading(true);
    getCullingGoals()
      .then((res) => {
        setGoals(res.data);
        setGoalsLoading(false);
      })
      .catch(() => setGoalsLoading(false));
  };

  useEffect(() => {
    getDashboardStats()
      .then((res) => {
        setStats(res.data);
        setStatsLoading(false);
      })
      .catch(() => {
        setError('Failed to fetch stats. Is the backend running?');
        setStatsLoading(false);
      });

    fetchGoals(); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);

  const activeGoal = goals.find((g) => g.is_active) || null;

  const handleSetActive = (id) => {
    setActiveGoal(id)
      .then(() => {
        fetchGoals();
        setShowGoalList(false);
      })
      .catch(() => setError('Failed to update goal.'));
  };

  const handleCreateGoal = (e) => {
    e.preventDefault();
    if (!newGoalName.trim() || !newGoalDesc.trim()) return;
    setGoalSaving(true);
    createCullingGoal({ name: newGoalName, description: newGoalDesc, is_active: true })
      .then(() => {
        setNewGoalName('');
        setNewGoalDesc('');
        setShowNewGoalForm(false);
        fetchGoals();
      })
      .catch(() => setError('Failed to create goal.'))
      .finally(() => setGoalSaving(false));
  };

  const activeCards = [
    {
      label: 'Keeping',
      variant: 'success',
      icon: 'bi-journal-check',
      key: 'KEEP',
      resolvedLabel: 'Kept',
    },
    {
      label: 'To Sell',
      variant: 'primary',
      icon: 'bi-cash-coin',
      key: 'SELL',
      resolvedLabel: 'Sold',
    },
    {
      label: 'To Donate',
      variant: 'info',
      icon: 'bi-gift',
      key: 'DONATE',
      resolvedLabel: 'Donated',
    },
    {
      label: 'To Discard',
      variant: 'danger',
      icon: 'bi-trash3',
      key: 'DISCARD',
      resolvedLabel: 'Discarded',
    },
  ];

  const presetGoals = [
    {
      name: 'The Minimalist Transition',
      description:
        'I am moving into a tiny house. I only want to keep books that are absolute essentials, high-value collectibles, or have deep personal meaning. Reduce collection by 80%.',
    },
    {
      name: 'The Financial Optimizer',
      description:
        'I need to raise money for a move. Recommend selling anything with a market value over $15. Donate the rest unless it is a rare edition.',
    },
    {
      name: 'The Space Maker',
      description:
        'I am clearing out a room. Keep my favorite fiction, but suggest discarding or donating old textbooks and outdated reference materials.',
    },
  ];

  return (
    <Container>
      <header className="mb-5 text-center bg-light p-5 rounded-3 shadow-sm">
        <i className="bi bi-bookmark-star-fill display-1 text-warning mb-3"></i>
        <h1 className="display-4 fw-bold">Welcome to BookBounty</h1>
        <p className="lead text-muted">
          {stats ? (
            <>
              <strong className="text-dark">{stats.in_collection}</strong> books in your collection
            </>
          ) : (
            'Turn your library into a garage sale goldmine.'
          )}
        </p>
        <Button as={Link} to="/scan" variant="warning" size="lg" className="mt-3 px-5 py-3 fw-bold">
          <i className="bi bi-upc-scan me-2"></i> Start Scanning
        </Button>
      </header>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Culling Goal Section */}
      <Card className="shadow-sm border-0 mb-5">
        <Card.Header className="bg-white d-flex justify-content-between align-items-center py-3">
          <span className="fw-bold">
            <i className="bi bi-bullseye me-2 text-warning"></i>Culling Goal
          </span>
          <div className="d-flex gap-2">
            {goals.length > 0 && (
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => {
                  setShowGoalList(!showGoalList);
                  setShowNewGoalForm(false);
                }}
              >
                {showGoalList ? 'Cancel' : 'Change'}
              </Button>
            )}
            <Button
              variant="outline-warning"
              size="sm"
              onClick={() => {
                setShowNewGoalForm(!showNewGoalForm);
                setShowGoalList(false);
              }}
            >
              {showNewGoalForm ? 'Cancel' : '+ New Goal'}
            </Button>
          </div>
        </Card.Header>
        <Card.Body className="p-4">
          {goalsLoading ? (
            <div className="text-center py-2">
              <Spinner animation="border" size="sm" variant="warning" />
            </div>
          ) : activeGoal ? (
            <div>
              <div className="d-flex align-items-center gap-2 mb-1">
                <Badge bg="warning" text="dark">
                  Active
                </Badge>
                <span className="fw-bold fs-5">{activeGoal.name}</span>
              </div>
              <p className="text-muted mb-0 small">{activeGoal.description}</p>
            </div>
          ) : (
            <div className="text-center text-muted py-2">
              <i className="bi bi-exclamation-circle me-2"></i>
              No active culling goal. Set one below before scanning.
            </div>
          )}

          {/* Goal list for switching */}
          <Collapse in={showGoalList}>
            <div className="mt-3">
              <hr className="my-3" />
              <p className="text-muted small text-uppercase fw-bold mb-3">Your Goals</p>
              <Row className="g-2">
                {goals
                  .filter((g) => !g.is_active)
                  .map((g) => (
                    <Col key={g.id} md={6}>
                      <Card className="border h-100">
                        <Card.Body className="p-3 d-flex justify-content-between align-items-start">
                          <div>
                            <div className="fw-bold small">{g.name}</div>
                            <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                              {g.description.substring(0, 80)}...
                            </div>
                          </div>
                          <Button
                            variant="outline-warning"
                            size="sm"
                            className="ms-2 flex-shrink-0"
                            onClick={() => handleSetActive(g.id)}
                          >
                            Set Active
                          </Button>
                        </Card.Body>
                      </Card>
                    </Col>
                  ))}
              </Row>
            </div>
          </Collapse>

          {/* New goal form */}
          <Collapse in={showNewGoalForm}>
            <div className="mt-3">
              <hr className="my-3" />
              <p className="text-muted small text-uppercase fw-bold mb-3">Create a Goal</p>
              <p className="text-muted small mb-3">Start from a preset or write your own:</p>
              <div className="d-flex flex-wrap gap-2 mb-3">
                {presetGoals.map((p) => (
                  <Button
                    key={p.name}
                    variant="outline-secondary"
                    size="sm"
                    onClick={() => {
                      setNewGoalName(p.name);
                      setNewGoalDesc(p.description);
                    }}
                  >
                    {p.name}
                  </Button>
                ))}
              </div>
              <Form onSubmit={handleCreateGoal}>
                <Form.Group className="mb-3">
                  <Form.Label className="small fw-bold text-muted text-uppercase">Name</Form.Label>
                  <Form.Control
                    placeholder="e.g. Minimalist Move"
                    value={newGoalName}
                    onChange={(e) => setNewGoalName(e.target.value)}
                    required
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label className="small fw-bold text-muted text-uppercase">
                    Instructions for the AI
                  </Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    placeholder="Describe your goal in plain language. Be specific about what to keep, sell, or discard."
                    value={newGoalDesc}
                    onChange={(e) => setNewGoalDesc(e.target.value)}
                    required
                  />
                </Form.Group>
                <Button type="submit" variant="warning" disabled={goalSaving}>
                  {goalSaving ? <Spinner animation="border" size="sm" /> : 'Save & Set Active'}
                </Button>
              </Form>
            </div>
          </Collapse>
        </Card.Body>
      </Card>

      {/* Stats */}
      {statsLoading ? (
        <div className="text-center py-4">
          <Spinner animation="border" role="status" variant="warning">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        </div>
      ) : (
        <>
          {/* In-collection summary */}
          <div className="d-flex align-items-center justify-content-between mb-3">
            <h5 className="fw-bold mb-0">
              <i className="bi bi-bookshelf me-2 text-warning"></i>
              Current Collection
              <span className="ms-2 badge bg-warning text-dark fs-6">
                {stats?.in_collection ?? 0} books
              </span>
            </h5>
            <Button
              as={Link}
              to="/collection?in_collection=true"
              variant="outline-warning"
              size="sm"
            >
              View All
            </Button>
          </div>

          {/* Active / pending decisions */}
          <p className="text-muted small text-uppercase fw-bold mb-2">Active Decisions</p>
          <Row className="g-3 mb-4">
            {activeCards.map((card) => (
              <Col key={card.key} xs={6} lg={3}>
                <Card className={`text-center border-${card.variant} h-100 shadow-sm`}>
                  <Card.Header className={`bg-${card.variant} text-white py-3`}>
                    <i className={`bi ${card.icon} fs-2`}></i>
                  </Card.Header>
                  <Card.Body className="py-3">
                    <Card.Title className="text-muted text-uppercase small fw-bold">
                      {card.label}
                    </Card.Title>
                    <Card.Text className="display-5 fw-bold text-dark">
                      {stats?.active?.[card.key] ?? 0}
                    </Card.Text>
                  </Card.Body>
                  <Card.Footer className="bg-transparent border-0 pb-3">
                    <Button
                      as={Link}
                      to={`/collection?status=${card.key}&resolved=false`}
                      variant={`outline-${card.variant}`}
                      size="sm"
                    >
                      View
                    </Button>
                  </Card.Footer>
                </Card>
              </Col>
            ))}
          </Row>

          {/* Resolved / legacy */}
          <p className="text-muted small text-uppercase fw-bold mb-2">Resolved</p>
          <Row className="g-3 mb-5">
            {activeCards.map((card) => (
              <Col key={card.key} xs={6} lg={3}>
                <Card className="text-center border-light h-100 shadow-sm">
                  <Card.Header className="bg-light text-muted py-3">
                    <i className={`bi ${card.icon} fs-2`}></i>
                  </Card.Header>
                  <Card.Body className="py-3">
                    <Card.Title className="text-muted text-uppercase small fw-bold">
                      {card.resolvedLabel}
                    </Card.Title>
                    <Card.Text className="display-5 fw-bold text-muted">
                      {stats?.resolved?.[card.key] ?? 0}
                    </Card.Text>
                  </Card.Body>
                  <Card.Footer className="bg-transparent border-0 pb-3">
                    <Button
                      as={Link}
                      to={`/collection?status=${card.key}&resolved=true`}
                      variant="outline-secondary"
                      size="sm"
                    >
                      View
                    </Button>
                  </Card.Footer>
                </Card>
              </Col>
            ))}
          </Row>
        </>
      )}
    </Container>
  );
};

export default Dashboard;
