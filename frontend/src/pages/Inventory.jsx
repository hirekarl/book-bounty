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
import api, { getCatalogEntries, resolveEntry } from '../services/api';
import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const STATUS_VARIANTS = { KEEP: 'success', DONATE: 'info', SELL: 'primary', DISCARD: 'danger' };

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
  const [error, setError] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);

  const fetchEntries = useCallback(() => {
    setLoading(true);
    getCatalogEntries({ status: statusFilter, search: searchQuery, ...viewParams })
      .then((res) => {
        setEntries(res.data);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to fetch collection.');
        setLoading(false);
      });
  }, [statusFilter, searchQuery, viewParams]);

  useEffect(() => {
    fetchEntries(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [fetchEntries]);

  const handleViewChange = (opt) => {
    setActiveView(opt.label);
    setViewParams(opt.params);
    setSelectedIds([]);
  };

  const getStatusBadge = (status) => (
    <Badge bg={STATUS_VARIANTS[status] || 'secondary'}>{status}</Badge>
  );

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
                {entries.length} {entries.length === 1 ? 'book' : 'books'}
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
                        />
                      </td>
                      <td>
                        <div className="d-flex align-items-center">
                          {e.book.cover_url ? (
                            <img
                              src={e.book.cover_url}
                              alt=""
                              className={`rounded me-3 ${isResolved ? 'opacity-50' : ''}`}
                              style={{ width: '40px', height: '60px', objectFit: 'cover' }}
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
                            <div className={`fw-bold ${isResolved ? 'text-muted' : 'text-dark'}`}>
                              {e.book.title}
                            </div>
                            <div className="text-muted small">by {e.book.author}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        {getStatusBadge(e.status)}
                        {isResolved && (
                          <div className="mt-1">
                            <Badge
                              bg="secondary"
                              className="fw-normal"
                              style={{ fontSize: '0.7rem' }}
                            >
                              {RESOLVE_LABELS[e.status]?.replace('Mark as ', '') ?? 'Resolved'}
                              {' · '}
                              {new Date(e.resolved_at).toLocaleDateString()}
                            </Badge>
                          </div>
                        )}
                      </td>
                      <td>
                        <Badge bg="light" text="dark" className="border">
                          {e.condition_grade}
                        </Badge>
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
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </Table>
        </div>
      )}
    </Container>
  );
};

export default Inventory;
