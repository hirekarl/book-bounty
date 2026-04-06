import React from 'react';
import { Card, Row, Col, ProgressBar, ListGroup, Badge } from 'react-bootstrap';

/**
 * ImpactStats Component
 *
 * Displays high-level impact metrics in a hero-card format.
 *
 * @param {Object} props
 * @param {number} props.totalResolved - Total count of resolved books.
 * @param {number} props.potentialEarnings - Total potential earnings from SELL status.
 * @param {Array} props.topDestinations - List of {donation_dest, count} objects.
 */
const ImpactStats = ({ totalResolved, potentialEarnings, topDestinations }) => {
  return (
    <Row className="g-4 mb-4">
      {/* Hero Card: Total Resolved */}
      <Col md={4}>
        <Card className="h-100 border-0 shadow-sm text-center bg-success text-white">
          <Card.Body className="d-flex flex-column justify-content-center py-4">
            <div className="display-4 fw-bold mb-1">{totalResolved}</div>
            <Card.Title className="text-uppercase tracking-wider small opacity-75">
              Books Resolved
            </Card.Title>
            <div className="mt-3">
              <i className="bi bi-check-circle-fill fs-1"></i>
            </div>
          </Card.Body>
        </Card>
      </Col>

      {/* Hero Card: Potential Earnings */}
      <Col md={4}>
        <Card className="h-100 border-0 shadow-sm text-center bg-primary text-white">
          <Card.Body className="d-flex flex-column justify-content-center py-4">
            <div className="display-4 fw-bold mb-1">
              ${potentialEarnings.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <Card.Title className="text-uppercase tracking-wider small opacity-75">
              Potential Earnings
            </Card.Title>
            <div className="mt-3">
              <i className="bi bi-cash-stack fs-1"></i>
            </div>
          </Card.Body>
        </Card>
      </Col>

      {/* Top Destinations Card */}
      <Col md={4}>
        <Card className="h-100 border-0 shadow-sm">
          <Card.Header className="bg-white border-0 pt-3">
            <h6 className="text-uppercase text-muted mb-0 small fw-bold">Top Destinations</h6>
          </Card.Header>
          <Card.Body>
            {topDestinations && topDestinations.length > 0 ? (
              <ListGroup variant="flush">
                {topDestinations.map((dest, idx) => {
                  const maxCount = topDestinations[0].count;
                  const percentage = (dest.count / maxCount) * 100;
                  return (
                    <ListGroup.Item key={idx} className="border-0 px-0 py-2">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span className="text-truncate" style={{ maxWidth: '70%' }}>
                          {dest.donation_dest}
                        </span>
                        <Badge bg="info" pill>
                          {dest.count}
                        </Badge>
                      </div>
                      <ProgressBar now={percentage} variant="info" style={{ height: '4px' }} />
                    </ListGroup.Item>
                  );
                })}
              </ListGroup>
            ) : (
              <div className="text-center text-muted py-4">
                <p className="small mb-0">No donations recorded yet.</p>
              </div>
            )}
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
};

export default ImpactStats;
