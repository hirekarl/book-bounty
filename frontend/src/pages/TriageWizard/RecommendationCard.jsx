import React from 'react';
import { Card, Button, Alert, Spinner, ProgressBar, Badge } from 'react-bootstrap';

const STATUS_CONFIG = {
  KEEP: { label: 'Keep', variant: 'success', icon: 'bi-journal-check' },
  DONATE: { label: 'Donate', variant: 'info', icon: 'bi-gift' },
  SELL: { label: 'Sell', variant: 'primary', icon: 'bi-cash-coin' },
  DISCARD: { label: 'Discard', variant: 'danger', icon: 'bi-trash3' },
};

const RecommendationCard = ({
  aiRec,
  aiLoading,
  aiError,
  overriding,
  setOverriding,
  status,
  setStatus,
  handleAcceptSuggestion,
  fetchAiRecommendation,
}) => {
  const effectiveStatus = overriding ? status : aiRec?.status || status;
  const statusConfig = STATUS_CONFIG[effectiveStatus] || STATUS_CONFIG.KEEP;
  const isUncertain = aiRec && aiRec.confidence < 0.5;

  return (
    <Card className="shadow-sm border-0 mb-4">
      <Card.Header className="bg-white fw-bold py-3 d-flex justify-content-between align-items-center">
        <span>
          <i className="bi bi-stars me-2 text-warning"></i>AI Recommendation
        </span>
        {aiRec && isUncertain && (
          <Badge bg="warning" text="dark">
            <i className="bi bi-exclamation-triangle me-1"></i>AI Uncertain
          </Badge>
        )}
      </Card.Header>
      <Card.Body className="p-4">
        {aiLoading && (
          <div className="text-center py-3">
            <Spinner animation="border" variant="warning" size="sm" className="me-2" />
            <span className="text-muted">Analyzing book...</span>
          </div>
        )}

        {aiError && (
          <Alert variant="warning" className="mb-0">
            <i className="bi bi-exclamation-circle me-2"></i>
            {aiError}
            <div className="mt-2">
              <Button variant="outline-warning" size="sm" onClick={fetchAiRecommendation}>
                Retry
              </Button>
            </div>
          </Alert>
        )}

        {aiRec && !aiLoading && (
          <>
            <div className="d-flex align-items-start gap-3 mb-3">
              <div
                className={`rounded-3 p-3 bg-${statusConfig.variant} bg-opacity-10 text-center`}
                style={{ minWidth: '90px' }}
              >
                <i className={`bi ${statusConfig.icon} fs-2 text-${statusConfig.variant}`}></i>
                <div className={`fw-bold small text-${statusConfig.variant} mt-1`}>
                  {statusConfig.label}
                </div>
              </div>
              <div className="flex-grow-1">
                <p className="mb-2">{aiRec.reasoning}</p>
                {aiRec.suggested_price && (
                  <p className="text-primary fw-bold mb-2">
                    Suggested price: ${aiRec.suggested_price}
                  </p>
                )}
                {aiRec.notable_tags?.length > 0 && (
                  <div className="d-flex flex-wrap gap-1">
                    {aiRec.notable_tags.map((tag) => (
                      <Badge key={tag} bg="light" text="dark" className="border fw-normal">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mb-3">
              <div className="d-flex justify-content-between small text-muted mb-1">
                <span>Confidence</span>
                <span>{Math.round(aiRec.confidence * 100)}%</span>
              </div>
              <ProgressBar
                now={aiRec.confidence * 100}
                variant={isUncertain ? 'warning' : 'success'}
                style={{ height: '6px' }}
              />
            </div>

            {!overriding ? (
              <div className="d-flex gap-2">
                <Button
                  variant={statusConfig.variant}
                  onClick={handleAcceptSuggestion}
                  className="fw-bold"
                >
                  <i className="bi bi-check-lg me-1"></i>Accept — {statusConfig.label}
                </Button>
                <Button variant="outline-secondary" onClick={() => setOverriding(true)}>
                  Override
                </Button>
              </div>
            ) : (
              <Alert
                variant="light"
                className="mb-0 d-flex align-items-center justify-content-between py-2"
              >
                <span className="small text-muted">
                  Override mode — choose your own status below.
                </span>
                <Button
                  variant="link"
                  size="sm"
                  className="p-0 text-muted"
                  onClick={() => {
                    setOverriding(false);
                    setStatus(aiRec.status);
                  }}
                >
                  Use AI suggestion
                </Button>
              </Alert>
            )}
          </>
        )}
      </Card.Body>
    </Card>
  );
};

export default RecommendationCard;
