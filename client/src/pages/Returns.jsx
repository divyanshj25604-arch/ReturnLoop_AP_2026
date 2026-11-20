import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api, { getApiErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { formatDateOnly } from '../utils/format';
import { statusLabel } from '../utils/status';

// Wait this long after the last keystroke before searching.
const SEARCH_DEBOUNCE_MS = 300;

const STATUS_OPTIONS = [
  { label: 'All statuses', value: '' },
  { label: 'Received', value: 'RECEIVED' },
  { label: 'Under inspection', value: 'UNDER_INSPECTION' },
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
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const latestRequest = useRef(0);
  const [warehouseId, setWarehouseId] = useState('');
  const [warehouses, setWarehouses] = useState([]);
  const [page, setPage] = useState(1);

  // Load warehouses: the filter dropdown for supervisors and admins, and the
  // warehouse code shown to inspectors. On failure the list stays empty
  // (never fall back to made-up warehouses).
  useEffect(() => {
    let isMounted = true;
    api
      .get('/warehouses')
      .then((res) => {
        if (isMounted && res.data?.data) {
          setWarehouses(res.data.data);
        }
      })
      .catch(() => {
        if (isMounted) setWarehouses([]);
      });

    return () => {
      isMounted = false;
    };
  }, [isInspector]);

  // What the user is typing. `search` (used for the request) follows it after
  // a short pause, so we don't send a request for every keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch((current) => {
        if (current !== searchInput) setPage(1);
        return searchInput;
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fetch returns list. Each request gets a number; only the newest one's
  // response is used, so a slow older search can't overwrite newer results.
  const fetchReturns = useCallback(() => {
    const requestId = ++latestRequest.current;
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
        if (requestId !== latestRequest.current) return;
        setReturns(res.data?.data || []);
        if (res.data?.meta) {
          setMeta(res.data.meta);
        }
      })
      .catch((err) => {
        if (requestId !== latestRequest.current) return;
        setError(getApiErrorMessage(err));
      })
      .finally(() => {
        if (requestId === latestRequest.current) setLoading(false);
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
    setSearchInput(e.target.value);
  };

  const handleWarehouseChange = (e) => {
    setWarehouseId(e.target.value);
    setPage(1);
  };

  const handleClearFilters = () => {
    setStatus('');
    setSearchInput('');
    setSearch('');
    setWarehouseId('');
    setPage(1);
  };

  const hasActiveFilters = Boolean(status || searchInput.trim() || warehouseId);
  const totalPages = Math.max(1, Math.ceil((meta.total || 0) / (meta.limit || 10)));

  return (
    <div className="page-returns">
      <div className="page-head">
        <div className="page-head-text">
          <h1>Returns</h1>
          <p className="page-sub">
            {isInspector
              ? `Returns at your warehouse, ${
                  warehouses.find((w) => w.warehouse_id === user?.warehouse_id)?.warehouse_code ||
                  `warehouse #${user?.warehouse_id}`
                }.`
              : 'Every return across all warehouses. Open one to inspect, decide or record its outcome.'}
          </p>
        </div>
        <div className="page-actions">
          <Link to="/returns/new" className="btn-primary">
            New return
          </Link>
        </div>
      </div>

      <div className="filter-bar">
        <div className="filter-group grow">
          <label htmlFor="filter-search">Search</label>
          <input
            id="filter-search"
            type="search"
            className="filter-input"
            placeholder="Tracking number or serial number"
            value={searchInput}
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
              <option value="">All warehouses</option>
              {warehouses.map((wh) => (
                <option key={wh.warehouse_id} value={wh.warehouse_id}>
                  {wh.warehouse_code} - {wh.facility_name}
                </option>
              ))}
            </select>
          </div>
        )}

        {hasActiveFilters && (
          <div className="filter-group">
            <button type="button" onClick={handleClearFilters} className="btn-secondary">
              Clear filters
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="error-banner" role="alert">
          <div>
            <strong>Couldn't load returns.</strong> {error}
          </div>
          <button type="button" className="retry-btn" onClick={fetchReturns}>
            Retry
          </button>
        </div>
      )}

      <div className="table-panel">
        <table className="data-table stack">
          <thead>
            <tr>
              <th>Tracking number</th>
              <th>Product</th>
              <th>Warehouse</th>
              <th>Status</th>
              <th>Return date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className="empty-row">
                <td colSpan="5">
                  <div className="loading-container">
                    <div className="spinner" />
                    <span>Loading returns…</span>
                  </div>
                </td>
              </tr>
            ) : returns.length === 0 ? (
              <tr className="empty-row">
                <td colSpan="5">
                  <div className="empty-state-card">
                    <h3 className="empty-state-title">
                      {hasActiveFilters ? 'No returns match these filters' : 'No returns yet'}
                    </h3>
                    <p className="empty-state-desc">
                      {hasActiveFilters
                        ? 'Clear the filters or try a different search.'
                        : 'Record the first return when a device arrives at the warehouse.'}
                    </p>
                    {hasActiveFilters ? (
                      <button type="button" onClick={handleClearFilters} className="btn-secondary">
                        Clear filters
                      </button>
                    ) : (
                      <Link to="/returns/new" className="btn-primary">
                        New return
                      </Link>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              returns.map((item) => (
                <tr
                  key={item.return_id}
                  className="clickable"
                  onClick={() => navigate(`/returns/${item.return_id}`)}
                  title={`View Return ${item.return_tracking_number}`}
                >
                  <td className="lead tracking" data-label="Tracking number">
                    {item.return_tracking_number}
                  </td>
                  <td data-label="Product">
                    <div>
                      <span className="cell-strong">{item.brand}</span> {item.model_name}
                      <span className="cell-sub">{item.sku}</span>
                    </div>
                  </td>
                  <td data-label="Warehouse">
                    <div>
                      {item.facility_name}
                      <span className="cell-sub">{item.warehouse_code}</span>
                    </div>
                  </td>
                  <td data-label="Status">
                    <div>
                      <span className={`status-tag ${item.status}`}>{statusLabel(item.status)}</span>
                    </div>
                  </td>
                  <td data-label="Return date">{formatDateOnly(item.return_date)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {!loading && returns.length > 0 && (
          <div className="pagination-controls">
            <div>
              Showing {(page - 1) * meta.limit + 1}–
              {Math.min(page * meta.limit, meta.total || 0)} of {meta.total || 0} returns
            </div>

            <div className="pager">
              <button
                type="button"
                className="pagination-btn"
                disabled={page <= 1 || loading}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              >
                Previous
              </button>
              <span className="pager-label">
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
        )}
      </div>
    </div>
  );
}
