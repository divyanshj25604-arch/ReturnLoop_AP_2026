import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { getApiErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';

const STATUS_OPTIONS = [
  { label: 'All Statuses', value: '' },
  { label: 'Received', value: 'RECEIVED' },
  { label: 'Under Inspection', value: 'UNDER_INSPECTION' },
  { label: 'Evaluated', value: 'EVALUATED' },
  { label: 'Decided', value: 'DECIDED' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

export default function Returns() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const isInspector = user?.app_role === 'INSPECTOR';

  const [returns, setReturns] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 10, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter states
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [warehouses, setWarehouses] = useState([]);
  const [page, setPage] = useState(1);

  // Load warehouses for supervisors and admins
  useEffect(() => {
    if (isInspector) return;
    let isMounted = true;
    api
      .get('/warehouses')
      .then((res) => {
        if (isMounted && res.data?.data) {
          setWarehouses(res.data.data);
        }
      })
      .catch(() => {
        // Fallback default warehouses if endpoint not implemented yet
        if (isMounted) {
          setWarehouses([
            { warehouse_id: 1, warehouse_code: 'WH-DEL-01', facility_name: 'Delhi Returns Hub' },
            { warehouse_id: 2, warehouse_code: 'WH-BOM-01', facility_name: 'Mumbai Facility' },
            { warehouse_id: 3, warehouse_code: 'WH-BLR-01', facility_name: 'Bengaluru Logistics Centre' },
          ]);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isInspector]);

  // Fetch returns list
  const fetchReturns = useCallback(() => {
    setLoading(true);
    setError(null);

    const params = {
      page,
      limit: 10,
    };

    if (status) params.status = status;
    if (search.trim()) params.q = search.trim();
    if (!isInspector && warehouseId) params.warehouse_id = warehouseId;

    api
      .get('/returns', { params })
      .then((res) => {
        setReturns(res.data?.data || []);
        if (res.data?.meta) {
          setMeta(res.data.meta);
        }
      })
      .catch((err) => {
        setError(getApiErrorMessage(err));
      })
      .finally(() => {
        setLoading(false);
      });
  }, [page, status, search, warehouseId, isInspector]);

  useEffect(() => {
    fetchReturns();
  }, [fetchReturns]);

  // Handlers for filter adjustments
  const handleStatusChange = (e) => {
    setStatus(e.target.value);
    setPage(1);
  };

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleWarehouseChange = (e) => {
    setWarehouseId(e.target.value);
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil((meta.total || 0) / (meta.limit || 10)));

  return (
    <div className="page-returns">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.25rem',
        }}
      >
        <div>
          <h1>Returns</h1>
          <p style={{ color: '#555', margin: 0 }}>
            {isInspector
              ? `Returns assigned to your warehouse (WH-${user?.warehouse_id})`
              : 'Overview and triage of all return intake items'}
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="returns-filters">
        <div className="filter-group">
          <label htmlFor="filter-search">Search</label>
          <input
            id="filter-search"
            type="text"
            className="filter-input"
            placeholder="Search tracking or serial..."
            value={search}
            onChange={handleSearchChange}
          />
        </div>

        <div className="filter-group">
          <label htmlFor="filter-status">Status</label>
          <select
            id="filter-status"
            className="filter-select"
            value={status}
            onChange={handleStatusChange}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {!isInspector && (
          <div className="filter-group">
            <label htmlFor="filter-warehouse">Warehouse</label>
            <select
              id="filter-warehouse"
              className="filter-select"
              value={warehouseId}
              onChange={handleWarehouseChange}
            >
              <option value="">All Warehouses</option>
              {warehouses.map((wh) => (
                <option key={wh.warehouse_id} value={wh.warehouse_id}>
                  {wh.warehouse_code} - {wh.facility_name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {error && (
        <div
          role="alert"
          style={{
            padding: '1rem',
            background: '#ffebee',
            color: '#c62828',
            borderRadius: '4px',
            marginBottom: '1rem',
          }}
        >
          {error}
        </div>
      )}

      {/* Table container */}
      <div className="returns-table-wrapper">
        <table className="returns-table">
          <thead>
            <tr>
              <th>Tracking Number</th>
              <th>Product</th>
              <th>Warehouse</th>
              <th>Status</th>
              <th>Return Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
                  Loading returns...
                </td>
              </tr>
            ) : returns.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
                  No returns found matching the criteria.
                </td>
              </tr>
            ) : (
              returns.map((item) => (
                <tr
                  key={item.return_id}
                  onClick={() => navigate(`/returns/${item.return_id}`)}
                  title={`View Return ${item.return_tracking_number}`}
                >
                  <td style={{ fontWeight: 600, color: '#1a237e' }}>
                    {item.return_tracking_number}
                  </td>
                  <td>
                    <div>
                      <strong>{item.brand}</strong> {item.model_name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#757575' }}>
                      SKU: {item.sku}
                    </div>
                  </td>
                  <td>
                    <div>{item.facility_name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#757575' }}>
                      {item.warehouse_code}
                    </div>
                  </td>
                  <td>
                    <span className={`status-badge ${item.status}`}>
                      {item.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td>
                    {item.return_date ? new Date(item.return_date).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination bar */}
        <div className="pagination-controls">
          <div style={{ fontSize: '0.85rem', color: '#555' }}>
            Showing {returns.length > 0 ? (page - 1) * meta.limit + 1 : 0}–
            {Math.min(page * meta.limit, meta.total || 0)} of {meta.total || 0} returns
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              type="button"
              className="pagination-btn"
              disabled={page <= 1 || loading}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            >
              Previous
            </button>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, padding: '0 0.5rem' }}>
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              className="pagination-btn"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((prev) => prev + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
