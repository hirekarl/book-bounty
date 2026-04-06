import React from 'react';
import { Card, ProgressBar } from 'react-bootstrap';

/**
 * SpatialROI Component
 *
 * Visualizes shelf space saved in feet.
 *
 * @param {Object} props
 * @param {number} props.inchesSaved - Total inches of shelf space saved.
 */
const SpatialROI = ({ inchesSaved }) => {
  const feetSaved = (inchesSaved / 12).toFixed(2);
  const displayFeet = parseFloat(feetSaved);

  // For visualization, let's assume a "Goal" of 10 feet of shelf space to show progress.
  // Or just show the absolute number with a nice icon representation.
  const targetFeet = displayFeet > 10 ? Math.ceil(displayFeet / 5) * 5 : 10;
  const progressPercent = (displayFeet / targetFeet) * 100;

  return (
    <Card className="mb-4 border-0 shadow-sm overflow-hidden bg-light">
      <Card.Body className="p-4">
        <div className="d-flex align-items-center mb-3">
          <div className="bg-info bg-opacity-10 p-3 rounded-circle me-3">
            <i className="bi bi-bookshelf text-info fs-3"></i>
          </div>
          <div>
            <h5 className="mb-0 fw-bold">Shelf Space Reclaimed</h5>
            <div className="text-muted small">
              {inchesSaved.toFixed(1)} inches = <strong>{displayFeet} feet</strong>
            </div>
          </div>
        </div>

        <div className="shelf-visualization position-relative mt-4">
          <div className="d-flex justify-content-between small text-muted mb-1 px-1">
            <span>0 ft</span>
            <span>{targetFeet} ft Goal</span>
          </div>
          <ProgressBar
            now={progressPercent}
            variant="info"
            className="rounded-pill shadow-sm"
            style={{ height: '24px' }}
            label={displayFeet > 0 ? `${displayFeet} ft` : ''}
            aria-label={`Progress: ${displayFeet} feet of shelf space reclaimed out of ${targetFeet} feet goal`}
          />
          <div className="d-flex justify-content-center mt-3">
            <div className="text-muted small">
              <i className="bi bi-info-circle me-1"></i>
              Calculated based on average book thickness (approx. 1 inch per 400 pages)
            </div>
          </div>
        </div>
      </Card.Body>
    </Card>
  );
};

export default SpatialROI;
