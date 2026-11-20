import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { getApiErrorMessage } from '../api/client';

const STATUS_CONFIG = [
  { key: 'RECEIVED', label: 'Received', color: '#607d8b', bg: '#eceff1' },
  { key: 'UNDER_INSPECTION', label: 'Under Inspection', color: '#e65100', bg: '#fff3e0' },
  { key: 'EVALUATED', label: 'Evaluated', color: '#6a1b9a', bg: '#f3e5f5' },
  { key: 'DECIDED', label: 'Decided', color: '#1565c0', bg: '#e3f2fd' },
  { key: 'COMPLETED', label: 'Completed', color: '#2e7d32', bg: '#e8f5e9' },
  { key: 'CANCELLED', label: 'Cancelled', color: '#c62828', bg: '#ffebee' },
];

const DISPOSITION_CONFIG = [
  { key: 'Resell', color: '#2e7d32' },
  { key: 'Refurbish', color: '#1565c0' },
  { key: 'Exchange', color: '#00838f' },
  { key: 'Donate', color: '#6a1b9a' },
  { key: 'Recycle', color: '#ef6c00' },
  { key: 'Write-off', color: '#757575' },
];

export default function Dashboard() {
  const navigate = useNavigate();

  const [dashboardData, setDashboardData] = useState(null);
  const [warehouses, setWarehouses] = useState([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch warehouses list for dropdown
  useEffect(() => {
    let isMounted = true;
    api
      .get('/warehouses')
      .then((res) => {
        if (isMounted) {
          setWarehouses(res.data?.data || []);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  const fetchDashboard = useCallback(() => {
    setLoading(true);
    setError(null);

    const params = {};
    if (warehouseId) {
      params.warehouse_id = warehouseId;
    }

    api
      .get('/dashboard', { params })
      .then((res) => {
        setDashboardData(res.data?.data || null);
      })
      .catch((err) => {
        setError(getApiErrorMessage(err));
      })
      .finally(() => {
        setLoading(false);
      });
  }, [warehouseId]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const byStatus = dashboardData?.returns_by_status || {};
  const byDisp = dashboardData?.decisions_by_disposition || {};
  const recent = dashboardData?.recent_returns || [];

  const totalReturnsCount = Object.values(byStatus).reduce((a, b) => a + (Number(b) || 0), 0);
  const maxDispCount = Math.max(1, ...Object.values(byDisp).map((v) => Number(v) || 0));

  const expectedRecovery = Number(dashboardData?.total_expected_recovery) || 0;
  const actualRecovery = Number(dashboardData?.total_actual_recovery) || 0;
  const overrideRate = Number(dashboardData?.override_rate) || 0;

  return (
    <div className="page-dashboard">
      <div className="dashboard-header">
        <div>
          <h1 style={{ margin: 0, color: '#1a237e' }}>Executive Dashboard</h1>
          <p style={{ margin: '0.25rem 0 0 0', color: '#555', fontSize: '0.9rem' }}>
            Decision intelligence metrics, recovery performance, and return pipeline.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <label htmlFor="dashboard-wh-select" style={{ fontWeight: 600, fontSize: '0.85rem', color: '#37474f' }}>
            Facility Filter:
          </label>
          <select
            id="dashboard-wh-select"
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
            className="filter-select"
            style={{ minWidth: '220px' }}
          >
            <option value="">All Warehouses (Enterprise)</option>
            {warehouses.map((wh) => (
              <option key={wh.warehouse_id} value={wh.warehouse_id}>
                {wh.warehouse_code} — {wh.facility_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          style={{
            padding: '1rem',
            background: '#ffebee',
            color: '#c62828',
            borderRadius: '4px',
            marginBottom: '1.5rem',
            border: '1px solid #ef9a9a',
          }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#666' }}>
          Loading live dashboard intelligence...
        </div>
      ) : (
        <>
          {/* Top Level Key Metric Summary Tiles */}
          <div className="dashboard-tiles-grid">
            <div className="summary-tile">
              <span className="tile-label">Total Expected Recovery</span>
              <span className="tile-value primary">₹{expectedRecovery.toLocaleString()}</span>
              <span className="tile-desc">Algorithmic recommendation value</span>
            </div>

            <div className="summary-tile">
              <span className="tile-label">Total Actual Realized</span>
              <span className="tile-value success">₹{actualRecovery.toLocaleString()}</span>
              <span className="tile-desc">
                {expectedRecovery > 0
                  ? `${((actualRecovery / expectedRecovery) * 100).toFixed(1)}% recovery realization`
                  : 'Realized from completed outcomes'}
              </span>
            </div>

            <div className="summary-tile">
              <span className="tile-label">Supervisor Override Rate</span>
              <span className="tile-value warning">{(overrideRate * 100).toFixed(1)}%</span>
              <span className="tile-desc">Decisions deviating from engine pick</span>
            </div>

            <div className="summary-tile">
              <span className="tile-label">Total Intake Volume</span>
              <span className="tile-value">{totalReturnsCount}</span>
              <span className="tile-desc">Units recorded across lifecycle</span>
            </div>
          </div>

          {/* Return Volume Pipeline by Status */}
          <div className="detail-card" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.05rem', color: '#37474f' }}>
              Returns Pipeline by Status
            </h3>
            <div className="status-tiles-grid">
              {STATUS_CONFIG.map((cfg) => {
                const count = byStatus[cfg.key] || 0;
                return (
                  <div
                    key={cfg.key}
                    className="status-tile"
                    style={{ backgroundColor: cfg.bg, borderTop: `4px solid ${cfg.color}` }}
                  >
                    <span className="status-tile-count" style={{ color: cfg.color }}>
                      {count}
                    </span>
                    <span className="status-tile-label">{cfg.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            {/* Disposition Breakdown Chart */}
            <div className="detail-card">
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.05rem', color: '#37474f' }}>
                Decisions by Disposition Pathway
              </h3>
              <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.85rem', color: '#757575' }}>
                Distribution of finalized dispositions decided by supervisors.
              </p>

              <div className="disposition-bars-list">
                {DISPOSITION_CONFIG.map((disp) => {
                  const count = byDisp[disp.key] || 0;
                  const pct = ((count / maxDispCount) * 100).toFixed(0);
                  return (
                    <div key={disp.key} className="disposition-bar-row">
                      <span className="disp-label">{disp.key}</span>
                      <div className="disp-track">
                        <div
                          className="disp-fill"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: disp.color,
                          }}
                        />
                      </div>
                      <span className="disp-count">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent Returns Stream */}
            <div className="detail-card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#37474f' }}>
                  Recent Intake Activity
                </h3>
                <Link to="/returns" style={{ fontSize: '0.85rem', color: '#1a237e', textDecoration: 'none', fontWeight: 600 }}>
                  View all returns →
                </Link>
              </div>

              {recent.length === 0 ? (
                <p style={{ color: '#666', fontStyle: 'italic', margin: 'auto 0' }}>
                  No recent intake activity found.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', flex: 1 }}>
                  {recent.map((ret) => (
                    <div
                      key={ret.return_id}
                      onClick={() => navigate(`/returns/${ret.return_id}`)}
                      className="recent-return-item"
                    >
                      <div>
                        <div style={{ fontWeight: 600, color: '#1a237e', fontSize: '0.9rem' }}>
                          {ret.return_tracking_number}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#555' }}>
                          {ret.brand} {ret.model_name}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span className={`status-badge ${ret.status}`} style={{ fontSize: '0.7rem' }}>
                          {ret.status.replace(/_/g, ' ')}
                        </span>
                        <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '0.2rem' }}>
                          {ret.return_date || '—'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
