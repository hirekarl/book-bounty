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
import api, { getCatalogEntries } from '../services/api';
import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const Inventory = () => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialStatus = queryParams.get('status') || '';

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);

  // Bulk Selection State
  const [selectedIds, setSelectedIds] = useState([]);

  const fetchEntries = useCallback(() => {
    setLoading(true);
    getCatalogEntries({ status: statusFilter, search: searchQuery })
      .then((res) => {
        setEntries(res.data);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to fetch collection.');
        setLoading(false);
      });
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    fetchEntries(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [fetchEntries]);

  const getStatusBadge = (status) => {
    const variants = { KEEP: 'success', DONATE: 'info', SELL: 'primary', DISCARD: 'danger' };
    return <Badge bg={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(entries.map((ent) => ent.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const handleBulkUpdate = (newStatus) => {
    if (selectedIds.length === 0) return;

    api
      .patch('/entries/bulk_update_status/', {
        ids: selectedIds,
        status: newStatus,
      })
      .then(() => {
        setSelectedIds([]);
        fetchEntries();
      })
      .catch(() => setError('Bulk update failed.'));
  };

  const exportToCSV = () => {
    const headers = ['ISBN', 'Title', 'Author', 'Status', 'Asking Price', 'Donation Dest', 'Notes'];
    const rows = entries.map((e) => [
      e.book.isbn,
      e.book.title,
      e.book.author,
      e.status,
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
    const tableColumn = ['Title', 'Author', 'Status', 'Price/Dest'];
    const tableRows = entries.map((e) => [
      e.book.title,
      e.book.author,
      e.status,
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
                Total items: <strong>{entries.length}</strong>
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
                <th>Price/Dest</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-5 text-muted">
                    <i className="bi bi-book fs-1 d-block mb-2 opacity-25"></i>
                    No books found in this collection.
                  </td>
                </tr>
              ) : (
                entries.map((e) => (
                  <tr key={e.id}>
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
                            className="rounded me-3"
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
                          <div className="fw-bold text-dark">{e.book.title}</div>
                          <div className="text-muted small">by {e.book.author}</div>
                        </div>
                      </div>
                    </td>
                    <td>{getStatusBadge(e.status)}</td>
                    <td>
                      <Badge bg="light" text="dark" className="border">
                        {e.condition_grade}
                      </Badge>
                    </td>
                    <td className="small">
                      {e.status === 'SELL' && (
                        <span className="text-primary fw-bold">${e.asking_price}</span>
                      )}
                      {e.status === 'DONATE' && (
                        <span className="text-info">{e.donation_dest}</span>
                      )}
                      {e.status !== 'SELL' && e.status !== 'DONATE' && (
                        <span className="text-muted text-center">-</span>
                      )}
                    </td>
                    <td className="small text-muted" style={{ maxWidth: '200px' }}>
                      <div className="text-truncate" title={e.notes}>
                        {e.notes || '-'}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </div>
      )}
    </Container>
  );
};

export default Inventory;
