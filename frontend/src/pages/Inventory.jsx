import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Table,
  Form,
  Row,
  Col,
  Card,
  Button,
  Badge,
  Spinner,
  Dropdown,
  ButtonGroup,
  InputGroup,
  Alert,
} from 'react-bootstrap';
import { useLocation } from 'react-router-dom';
import api, {
  getCatalogEntries,
  resolveEntry,
  updateCatalogEntry,
  deleteCatalogEntry,
} from '../services/api';
import { StatusBadge, ConditionBadge } from '../components/common/Badge';
import EditRecordModal from './Inventory/EditRecordModal';
import BulkReviewModal from './Inventory/BulkReviewModal';
import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const CONDITION_FLAGS = ['Water Damage', 'Torn Pages', 'Spine Damage', 'Annotated', 'Yellowing'];

const RESOLVE_LABELS = {
  KEEP: 'Mark as Kept',
  SELL: 'Mark as Sold',
  DONATE: 'Mark as Donated',
  DISCARD: 'Mark as Discarded',
};

const VIEW_OPTIONS = [
  { label: 'All', params: {} },
  { label: 'In Collection', params: { in_collection: 'true' } },
  { label: 'Pending', params: { resolved: 'false' } },
  { label: 'Resolved', params: { resolved: 'true' } },
];

const Inventory = () => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);

  // Initialise filters from URL params (Dashboard links pass these in)
  const [statusFilter, setStatusFilter] = useState(queryParams.get('status') || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewParams, setViewParams] = useState(() => {
    const p = {};
    if (queryParams.get('resolved')) p.resolved = queryParams.get('resolved');
    if (queryParams.get('in_collection')) p.in_collection = queryParams.get('in_collection');
    return p;
  });
  const [activeView, setActiveView] = useState(() => {
    if (queryParams.get('in_collection') === 'true') return 'In Collection';
    if (queryParams.get('resolved') === 'true') return 'Resolved';
    if (queryParams.get('resolved') === 'false') return 'Pending';
    return 'All';
  });

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextPageUrl, setNextPageUrl] = useState(null);
  const [totalCount, setTotalCount] = useState(null);
  const [error, setError] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);

  // Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [saving, setSaving] = useState(false);
  const [isRefreshingValuation, setIsRefreshingValuation] = useState(false);

  const fetchEntries = useCallback(() => {
    setLoading(true);
    setNextPageUrl(null);
    setTotalCount(null);
    getCatalogEntries({ status: statusFilter, search: searchQuery, ...viewParams })
      .then((res) => {
        const data = res.data;
        if (data && typeof data === 'object' && 'results' in data) {
          setEntries(data.results);
          setNextPageUrl(data.next ?? null);
          setTotalCount(data.count ?? null);
        } else {
          setEntries(data);
          setNextPageUrl(null);
          setTotalCount(null);
        }
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to fetch collection.');
        setLoading(false);
      });
  }, [statusFilter, searchQuery, viewParams]);

  const handleLoadMore = useCallback(() => {
    if (!nextPageUrl || loadingMore) return;
    setLoadingMore(true);
    api
      .get(nextPageUrl)
      .then((res) => {
        const data = res.data;
        if (data && typeof data === 'object' && 'results' in data) {
          setEntries((prev) => [...prev, ...data.results]);
          setNextPageUrl(data.next ?? null);
        }
        setLoadingMore(false);
      })
      .catch(() => {
        setError('Failed to load more entries.');
        setLoadingMore(false);
      });
  }, [nextPageUrl, loadingMore]);

  useEffect(() => {
    fetchEntries(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [fetchEntries]);

  const handleViewChange = (opt) => {
    setActiveView(opt.label);
    setViewParams(opt.params);
    setSelectedIds([]);
  };

  const handleSelectAll = (e) => {
    setSelectedIds(e.target.checked ? entries.map((ent) => ent.id) : []);
  };

  const handleSelectOne = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const handleBulkUpdate = (newStatus) => {
    if (selectedIds.length === 0) return;
    api
      .patch('/entries/bulk_update_status/', { ids: selectedIds, status: newStatus })
      .then(() => {
        setSelectedIds([]);
        fetchEntries();
      })
      .catch(() => setError('Bulk update failed.'));
  };

  const handleResolve = (id) => {
    resolveEntry(id)
      .then(() => fetchEntries())
      .catch(() => setError('Failed to resolve entry.'));
  };

  const handleEditClick = (entry) => {
    setSelectedEntry(entry);
    setShowEditModal(true);
  };

  const handleSaveEdit = (values) => {
    setSaving(true);
    const payload = {
      status: values.status,
      condition_grade: values.condition_grade,
      condition_flags: values.condition_flags,
      notes: values.notes,
      asking_price: values.status === 'SELL' ? values.asking_price : null,
      donation_dest: values.status === 'DONATE' ? values.donation_dest : '',
    };

    // Handle resolution change manually since we don't have a toggle endpoint,
    // we use the resolved_at field directly via patch if possible, or we call the action.
    if (values.is_resolved && !selectedEntry.resolved_at) {
      payload.resolved_at = new Date().toISOString();
    } else if (!values.is_resolved && selectedEntry.resolved_at) {
      payload.resolved_at = null;
    }

    updateCatalogEntry(selectedEntry.id, payload)
      .then(() => {
        setShowEditModal(false);
        setSaving(false);
        fetchEntries();
      })
      .catch(() => {
        setError('Failed to update entry.');
        setSaving(false);
      });
  };

  const handleRefreshValuation = () => {
    if (!selectedEntry) return;
    setIsRefreshingValuation(true);
    api
      .post(`/entries/${selectedEntry.id}/valuation/`)
      .then((res) => {
        setSelectedEntry((prev) => ({ ...prev, valuation_data: res.data }));
        setIsRefreshingValuation(false);
      })
      .catch(() => {
        setError('Failed to refresh valuation data.');
        setIsRefreshingValuation(false);
      });
  };

  const handleDeleteEntry = () => {
    if (!window.confirm('Are you sure you want to delete this record?')) return;
    deleteCatalogEntry(selectedEntry.id)
      .then(() => {
        setShowEditModal(false);
        fetchEntries();
      })
      .catch(() => setError('Failed to delete entry.'));
  };

  const exportToCSV = () => {
    const headers = [
      'ISBN',
      'Title',
      'Author',
      'Status',
      'Resolved',
      'Asking Price',
      'Donation Dest',
      'Notes',
    ];
    const rows = entries.map((e) => [
      e.book.isbn,
      e.book.title,
      e.book.author,
      e.status,
      e.resolved_at ? new Date(e.resolved_at).toLocaleDateString() : '',
      e.asking_price || '',
      e.donation_dest || '',
      e.notes,
    ]);
    const csvContent = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'bookbounty_inventory.csv';
    link.click();
  };

  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Inventory');
    worksheet.columns = [
      { header: 'ISBN', key: 'isbn', width: 15 },
      { header: 'Title', key: 'title', width: 30 },
      { header: 'Author', key: 'author', width: 20 },
      { header: 'Status', key: 'status', width: 10 },
      { header: 'Resolved', key: 'resolved', width: 15 },
      { header: 'Asking Price', key: 'price', width: 12 },
      { header: 'Donation Dest', key: 'dest', width: 20 },
      { header: 'Notes', key: 'notes', width: 30 },
    ];
    entries.forEach((e) => {
      worksheet.addRow({
        isbn: e.book.isbn,
        title: e.book.title,
        author: e.book.author,
        status: e.status,
        resolved: e.resolved_at ? new Date(e.resolved_at).toLocaleDateString() : '',
        price: e.asking_price,
        dest: e.donation_dest,
        notes: e.notes,
      });
    });
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'bookbounty_inventory.xlsx';
    link.click();
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text('BookBounty Inventory', 14, 15);
    const tableColumn = ['Title', 'Author', 'Status', 'Resolved', 'Price/Dest'];
    const tableRows = entries.map((e) => [
      e.book.title,
      e.book.author,
      e.status,
      e.resolved_at ? new Date(e.resolved_at).toLocaleDateString() : '-',
      e.status === 'SELL' ? `$${e.asking_price}` : e.donation_dest || '-',
    ]);
    doc.autoTable(tableColumn, tableRows, { startY: 20 });
    doc.save('bookbounty_inventory.pdf');
  };

  return (
    <Container className="py-4">
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold mb-0">My Collection</h2>
        <div className="d-flex gap-2">
          {selectedIds.some((id) => !entries.find((e) => e.id === id)?.resolved_at) && (
            <Button variant="warning" onClick={() => setShowBulkModal(true)}>
              <i className="bi bi-magic me-1"></i>Bulk Triage
            </Button>
          )}
          {selectedIds.length > 0 && (
            <Dropdown as={ButtonGroup}>
              <Button variant="primary">Bulk Action ({selectedIds.length})</Button>
              <Dropdown.Toggle split variant="primary" id="dropdown-bulk" />
              <Dropdown.Menu>
                <Dropdown.Header>Change Status To:</Dropdown.Header>
                <Dropdown.Item onClick={() => handleBulkUpdate('KEEP')}>Keep</Dropdown.Item>
                <Dropdown.Item onClick={() => handleBulkUpdate('DONATE')}>Donate</Dropdown.Item>
                <Dropdown.Item onClick={() => handleBulkUpdate('SELL')}>Sell</Dropdown.Item>
                <Dropdown.Item onClick={() => handleBulkUpdate('DISCARD')}>Discard</Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          )}
          <Dropdown as={ButtonGroup}>
            <Button variant="outline-dark">Export As...</Button>
            <Dropdown.Toggle split variant="outline-dark" id="dropdown-split-basic" />
            <Dropdown.Menu>
              <Dropdown.Item onClick={exportToCSV}>CSV</Dropdown.Item>
              <Dropdown.Item onClick={exportToExcel}>Excel (.xlsx)</Dropdown.Item>
              <Dropdown.Item onClick={exportToPDF}>PDF</Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </div>
      </div>

      <Card className="shadow-sm border-0 mb-4">
        <Card.Body>
          {/* View toggle */}
          <div className="d-flex gap-2 mb-3">
            {VIEW_OPTIONS.map((opt) => (
              <Button
                key={opt.label}
                size="sm"
                variant={activeView === opt.label ? 'warning' : 'outline-secondary'}
                onClick={() => handleViewChange(opt)}
              >
                {opt.label}
              </Button>
            ))}
          </div>

          <Row className="g-3">
            <Col md={4}>
              <InputGroup>
                <InputGroup.Text className="bg-transparent border-end-0">
                  <i className="bi bi-search text-muted"></i>
                </InputGroup.Text>
                <Form.Control
                  className="border-start-0 ps-0"
                  placeholder="Search title or author..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </InputGroup>
            </Col>
            <Col md={3}>
              <Form.Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">All Statuses</option>
                <option value="KEEP">Keep</option>
                <option value="DONATE">Donate</option>
                <option value="SELL">Sell</option>
                <option value="DISCARD">Discard</option>
              </Form.Select>
            </Col>
            <Col md={5} className="text-end d-flex align-items-center justify-content-end">
              <span className="text-muted small">
                {totalCount !== null
                  ? `Showing ${entries.length} of ${totalCount} books`
                  : `${entries.length} ${entries.length === 1 ? 'book' : 'books'}`}
              </span>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" variant="warning" />
        </div>
      ) : (
        <div className="table-responsive bg-white rounded shadow-sm">
          <Table hover className="mb-0 align-middle">
            <thead className="table-light">
              <tr>
                <th style={{ width: '40px' }}>
                  <Form.Check
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={selectedIds.length === entries.length && entries.length > 0}
                    aria-label="Select all books in current view"
                  />
                </th>
                <th>Book Details</th>
                <th>Status</th>
                <th>Condition</th>
                <th>Price / Dest</th>
                <th>Notes</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-5 text-muted">
                    <i className="bi bi-book fs-1 d-block mb-2 opacity-25"></i>
                    No books found.
                  </td>
                </tr>
              ) : (
                entries.map((e) => {
                  const isResolved = !!e.resolved_at;
                  return (
                    <tr key={e.id} className={isResolved ? 'text-muted' : ''}>
                      <td>
                        <Form.Check
                          type="checkbox"
                          checked={selectedIds.includes(e.id)}
                          onChange={() => handleSelectOne(e.id)}
                          aria-label={`Select ${e.book.title}`}
                        />
                      </td>
                      <td>
                        <div className="d-flex align-items-center">
                          {(e.book.cover_image ?? e.book.cover_url) ? (
                            <img
                              src={e.book.cover_image ?? e.book.cover_url ?? undefined}
                              alt=""
                              className={`rounded me-3 ${isResolved ? 'opacity-50' : ''}`}
                              style={{ width: '40px', height: '60px', objectFit: 'cover' }}
                              loading="lazy"
                            />
                          ) : (
                            <div
                              className="bg-light rounded me-3 d-flex align-items-center justify-content-center"
                              style={{ width: '40px', height: '60px' }}
                            >
                              <i className="bi bi-book text-muted small"></i>
                            </div>
                          )}
                          <div>
                            <div
                              className={`fw-bold ${isResolved ? 'text-muted' : 'text-dark'}`}
                              style={{ cursor: 'pointer', textDecoration: 'underline' }}
                              role="button"
                              tabIndex={0}
                              onClick={() => handleEditClick(e)}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                  event.preventDefault();
                                  handleEditClick(e);
                                }
                              }}
                            >
                              {e.book.title}
                            </div>
                            <div className="text-muted small">by {e.book.author}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <StatusBadge
                          status={e.status}
                          isResolved={isResolved}
                          date={e.resolved_at}
                        />
                      </td>
                      <td>
                        <ConditionBadge grade={e.condition_grade} flags={e.condition_flags} />
                      </td>
                      <td className="small">
                        {e.status === 'SELL' && e.asking_price && (
                          <span className={isResolved ? 'text-muted' : 'text-primary fw-bold'}>
                            ${e.asking_price}
                          </span>
                        )}
                        {e.status === 'DONATE' && e.donation_dest && (
                          <span className="text-muted">{e.donation_dest}</span>
                        )}
                        {!(
                          (e.status === 'SELL' && e.asking_price) ||
                          (e.status === 'DONATE' && e.donation_dest)
                        ) && <span className="text-muted">-</span>}
                      </td>
                      <td className="small text-muted" style={{ maxWidth: '160px' }}>
                        <div className="text-truncate" title={e.notes}>
                          {e.notes || '-'}
                        </div>
                      </td>
                      <td>
                        <div className="d-flex gap-2 align-items-center">
                          {isResolved ? (
                            <Badge bg="light" text="muted" className="border fw-normal">
                              <i className="bi bi-check2 me-1"></i>Done
                            </Badge>
                          ) : (
                            <Button
                              variant="outline-secondary"
                              size="sm"
                              onClick={() => handleResolve(e.id)}
                            >
                              {RESOLVE_LABELS[e.status] ?? 'Resolve'}
                            </Button>
                          )}
                          <Button
                            variant="link"
                            size="sm"
                            className="text-muted p-0"
                            onClick={() => handleEditClick(e)}
                            title="Edit Record"
                          >
                            <i className="bi bi-pencil-square fs-5"></i>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </Table>
        </div>
      )}

      {nextPageUrl && (
        <div className="text-center mt-3">
          <Button variant="outline-secondary" onClick={handleLoadMore} disabled={loadingMore}>
            {loadingMore ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Loading...
              </>
            ) : (
              'Load More'
            )}
          </Button>
        </div>
      )}

      {/* Edit Record Modal */}
      <EditRecordModal
        show={showEditModal}
        onHide={() => setShowEditModal(false)}
        entry={selectedEntry}
        onSave={handleSaveEdit}
        onDelete={handleDeleteEntry}
        saving={saving}
        onRefreshValuation={handleRefreshValuation}
        isRefreshingValuation={isRefreshingValuation}
      />

      {/* Bulk Review Modal */}
      <BulkReviewModal
        show={showBulkModal}
        onHide={() => setShowBulkModal(false)}
        selectedEntries={entries.filter((e) => selectedIds.includes(e.id) && !e.resolved_at)}
        onComplete={() => {
          setShowBulkModal(false);
          setSelectedIds([]);
          fetchEntries();
        }}
      />
    </Container>
  );
};

export default Inventory;
