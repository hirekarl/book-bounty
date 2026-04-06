import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Table,
  Form,
  Row,
  Col,
  Button,
  Badge,
  Spinner,
  Dropdown,
  ButtonGroup,
} from 'react-bootstrap';
import { useLocation } from 'react-router-dom';
import { getCatalogEntries } from '../services/api';
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

  const fetchEntries = useCallback(() => {
    setLoading(true);
    getCatalogEntries({ status: statusFilter, search: searchQuery })
      .then((res) => {
        setEntries(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    fetchEntries(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [fetchEntries]);

  const getStatusBadge = (status) => {
    const variants = { KEEP: 'success', DONATE: 'info', SELL: 'primary', DISCARD: 'danger' };
    return <Badge bg={variants[status] || 'secondary'}>{status}</Badge>;
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
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold mb-0">My Collection</h2>
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

      <Card className="shadow-sm mb-4">
        <Card.Body>
          <Row className="g-3">
            <Col md={4}>
              <Form.Control
                placeholder="Search title or author..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
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
            <Col md={5} className="text-end">
              <span className="text-muted">Total items: {entries.length}</span>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" />
        </div>
      ) : (
        <div className="table-responsive bg-white rounded shadow-sm">
          <Table striped bordered hover className="mb-0">
            <thead className="table-dark">
              <tr>
                <th>Title</th>
                <th>Author</th>
                <th>Status</th>
                <th>Notes</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-4 text-muted italic">
                    No books found in this collection.
                  </td>
                </tr>
              ) : (
                entries.map((e) => (
                  <tr key={e.id}>
                    <td className="fw-bold">{e.book.title}</td>
                    <td>{e.book.author}</td>
                    <td>{getStatusBadge(e.status)}</td>
                    <td className="small">{e.notes || '-'}</td>
                    <td className="small">
                      {e.status === 'SELL' && (
                        <span className="text-primary fw-bold">${e.asking_price}</span>
                      )}
                      {e.status === 'DONATE' && (
                        <span className="text-info">{e.donation_dest}</span>
                      )}
                      {e.status !== 'SELL' && e.status !== 'DONATE' && (
                        <span className="text-muted">-</span>
                      )}
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
