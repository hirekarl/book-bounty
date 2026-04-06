import React from 'react';
import { Badge as RBBadge } from 'react-bootstrap';

export const StatusBadge = ({ status, isResolved, date }) => {
  const STATUS_VARIANTS = { KEEP: 'success', DONATE: 'info', SELL: 'primary', DISCARD: 'danger' };
  const RESOLVE_LABELS = {
    KEEP: 'Kept',
    SELL: 'Sold',
    DONATE: 'Donated',
    DISCARD: 'Discarded',
  };

  return (
    <div className="d-flex flex-column align-items-start">
      <RBBadge bg={STATUS_VARIANTS[status] || 'secondary'}>{status}</RBBadge>
      {isResolved && (
        <RBBadge
          bg="secondary"
          className="fw-normal mt-1"
          style={{ fontSize: '0.7rem' }}
        >
          {RESOLVE_LABELS[status] || 'Resolved'}
          {date && ` · ${new Date(date).toLocaleDateString()}`}
        </RBBadge>
      )}
    </div>
  );
};

export const ConditionBadge = ({ grade, flags = [] }) => {
  const flagLabel = (k) =>
    k
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase());

  return (
    <div>
      <div>
        <RBBadge bg="light" text="dark" className="border">
          {grade}
        </RBBadge>
      </div>
      {flags.length > 0 && (
        <div className="d-flex flex-wrap gap-1 mt-1">
          {flags.map((f) => (
            <RBBadge
              key={f}
              bg="light"
              text="muted"
              className="fw-normal border-0 p-0"
              style={{ fontSize: '0.65rem' }}
            >
              #{flagLabel(f)}
            </RBBadge>
          ))}
        </div>
      )}
    </div>
  );
};
