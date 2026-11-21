import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { getApiErrorMessage } from '../api/client';
import { statusLabel } from '../utils/status';
import { formatDateOnly } from '../utils/format';

// Lifecycle order; Cancelled is an exit, shown apart from the five steps.
const STATUS_CONFIG = [
  { key: 'RECEIVED', label: 'Received' },
  { key: 'UNDER_INSPECTION', label: 'Under inspection' },
  { key: 'EVALUATED', label: 'Evaluated' },
  { key: 'DECIDED', label: 'Decided' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'CANCELLED', label: 'Cancelled' },
];

const DISPOSITION_CONFIG = [
  { key: 'Resell' },
  { key: 'Refurbish' },
  { key: 'Exchange' },
  { key: 'Donate' },
  { key: 'Recycle' },
  { key: 'Write-off' },
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
  // The API sends override_rate as a fraction (0.222 = 22.2%, docs/api.md 5.7).
  const overrideRate = (Number(dashboardData?.override_rate) || 0) * 100;

  return (
    <div className="page-dashboard">
      <div className="page-head">
        <div className="page-head-text">
          <h1>Dashboard</h1>
          <p className="page-sub">Where returns are in the pipeline, what was decided, and how much value was recovered.</p>
        </div>

        <div className="filter-group">
          <label htmlFor="dashboard-wh-select">Warehouse</label>
          <select
            id="dashboard-wh-select"
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
            disabled={loading}
            className="filter-select"
          >
            <option value="">All warehouses</option>
            {warehouses.map((wh) => (
              <option key={wh.warehouse_id} value={wh.warehouse_id}>
                {wh.warehouse_code} — {wh.facility_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="error-banner" role="alert">
          <div>
            <strong>Couldn't load the dashboard.</strong> {error}
          </div>
          <button type="button" className="retry-btn" onClick={fetchDashboard}>
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="panel loading-container">
          <div className="spinner" />
          <span>Loading dashboard…</span>
        </div>
      ) : (
        <>
          <section className="kpi-strip" aria-label="Key figures">
            <div className="kpi">
              <span className="kpi-value">₹{expectedRecovery.toLocaleString()}</span>
              <span className="kpi-label">Expected recovery</span>
              <span className="kpi-desc">Net value of the engine's recommendations</span>
            </div>
            <div className="kpi">
              <span className="kpi-value">₹{actualRecovery.toLocaleString()}</span>
              <span className="kpi-label">Actual recovery</span>
              <span className="kpi-desc">Net value realised on completed returns</span>
            </div>
            <div className="kpi">
              <span className={`kpi-value ${overrideRate > 30 ? 'warning' : ''}`}>
                {overrideRate.toFixed(1)}%
              </span>
              <span className="kpi-label">Override rate</span>
              <span className="kpi-desc">Decisions where a supervisor chose differently</span>
            </div>
            <div className="kpi">
              <span className="kpi-value">{totalReturnsCount.toLocaleString()}</span>
              <span className="kpi-label">Returns</span>
              <span className="kpi-desc">All returns received</span>
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <div>
                <h2>Pipeline</h2>
                <p>Returns at each lifecycle step right now.</p>
              </div>
            </div>
            <div className="pipeline-bar" aria-hidden="true">
              {STATUS_CONFIG.map((cfg) => {
                const count = Number(byStatus[cfg.key]) || 0;
                if (!count) return null;
                return <div key={cfg.key} className={`pipeline-seg ${cfg.key}`} style={{ flexGrow: count }} />;
              })}
            </div>
            <div className="pipeline-steps">
              {STATUS_CONFIG.map((cfg) => {
                const count = byStatus[cfg.key] || 0;
                return (
                  <React.Fragment key={cfg.key}>
                    {cfg.key === 'CANCELLED' && <div className="pipeline-gap" />}
                    <div className={`pipeline-step ${cfg.key}`}>
                      <span className="pipeline-count">{count}</span>
                      <span className="pipeline-label">{cfg.label}</span>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </section>

          <div className="two-col">
            <section className="panel">
              <div className="panel-head">
                <div>
                  <h2>Decisions by disposition</h2>
                  <p>Final dispositions chosen by supervisors.</p>
                </div>
              </div>

              <div className="disposition-bars-list">
                {DISPOSITION_CONFIG.map((disp) => {
                  const count = byDisp[disp.key] || 0;
                  const pct = ((count / maxDispCount) * 100).toFixed(0);
                  return (
                    <div key={disp.key} className="disposition-bar-row" data-disp={disp.key}>
                      <span className="disp-label">
                        <span className="disp-dot" />
                        {disp.key}
                      </span>
                      <div className="disp-track">
                        <div className="disp-fill" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="disp-count">{count}</span>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="panel">
              <div className="panel-head">
                <div>
                  <h2>Recent returns</h2>
                </div>
                <Link to="/returns" className="panel-link">
                  View all returns
                </Link>
              </div>

              {recent.length === 0 ? (
                <div className="empty-state-card">
                  <h3 className="empty-state-title">No recent returns</h3>
                  <p className="empty-state-desc">
                    Nothing has been received at this warehouse yet. Pick another warehouse or view all.
                  </p>
                </div>
              ) : (
                <ul className="recent-list">
                  {recent.map((ret) => (
                    <li key={ret.return_id}>
                      <div
                        onClick={() => navigate(`/returns/${ret.return_id}`)}
                        className="recent-return-item"
                      >
                        <div className="recent-main">
                          <span className="tracking">{ret.return_tracking_number}</span>
                          <span className="cell-sub">
                            {ret.brand} {ret.model_name}
                          </span>
                        </div>
                        <div className="recent-meta">
                          <span className={`status-tag ${ret.status}`}>{statusLabel(ret.status)}</span>
                          <span className="cell-sub">{formatDateOnly(ret.return_date)}</span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
