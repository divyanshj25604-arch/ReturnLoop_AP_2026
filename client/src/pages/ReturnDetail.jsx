import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api, { getApiErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';

const LIFECYCLE_STEPS = [
  { key: 'RECEIVED', label: 'Received' },
  { key: 'UNDER_INSPECTION', label: 'Under Inspection' },
  { key: 'EVALUATED', label: 'Evaluated' },
  { key: 'DECIDED', label: 'Decided' },
  { key: 'COMPLETED', label: 'Completed' },
];

const CONDITION_GRADES = ['Excellent', 'Good', 'Fair', 'Damaged'];
const FUNCTIONAL_STATUSES = [
  'Fully Functional',
  'Minor Glitch',
  'Defective Hardware',
  'Non-functional',
];

export default function ReturnDetail() {
  const { id } = useParams();
  const { user } = useAuth();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Start inspection action state
  const [startingInspection, setStartingInspection] = useState(false);
  const [actionError, setActionError] = useState(null);

  // Inspection form states
  const [conditionGrade, setConditionGrade] = useState('Good');
  const [functionalStatus, setFunctionalStatus] = useState('Fully Functional');
  const [hasOriginalPackaging, setHasOriginalPackaging] = useState(false);
  const [hasAllAccessories, setHasAllAccessories] = useState(false);
  const [repairEstimate, setRepairEstimate] = useState('0');
  const [diagnosticNotes, setDiagnosticNotes] = useState('');
  const [submittingInspection, setSubmittingInspection] = useState(false);
  const [inspectionFieldErrors, setInspectionFieldErrors] = useState({});

  const loadReturnDetail = useCallback(() => {
    setLoading(true);
    setError(null);
    setActionError(null);

    api
      .get(`/returns/${id}`)
      .then((res) => {
        setData(res.data?.data || null);
      })
      .catch((err) => {
        setError(getApiErrorMessage(err));
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    loadReturnDetail();
  }, [loadReturnDetail]);

  const handleStartInspection = async () => {
    setStartingInspection(true);
    setActionError(null);
    try {
      await api.post(`/returns/${id}/start-inspection`);
      loadReturnDetail();
    } catch (err) {
      setActionError(getApiErrorMessage(err));
    } finally {
      setStartingInspection(false);
    }
  };

  const handleInspectionSubmit = async (e) => {
    e.preventDefault();
    setSubmittingInspection(true);
    setInspectionFieldErrors({});
    setActionError(null);

    const payload = {
      condition_grade: conditionGrade,
      functional_status: functionalStatus,
      has_original_packaging: Boolean(hasOriginalPackaging),
      has_all_accessories: Boolean(hasAllAccessories),
      repair_estimate: parseFloat(repairEstimate) || 0,
      diagnostic_notes: diagnosticNotes.trim(),
    };

    try {
      await api.post(`/returns/${id}/inspections`, payload);
      // Reset optional fields
      setDiagnosticNotes('');
      loadReturnDetail();
    } catch (err) {
      const errors = err.response?.data?.errors;
      if (Array.isArray(errors)) {
        const errMap = {};
        errors.forEach((eItem) => {
          if (eItem.field) errMap[eItem.field] = eItem.message;
        });
        setInspectionFieldErrors(errMap);
      }
      setActionError(getApiErrorMessage(err));
    } finally {
      setSubmittingInspection(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
        Loading return details for #{id}...
      </div>
    );
  }

  if (error || !data || !data.return) {
    return (
      <div style={{ maxWidth: '800px', margin: '2rem auto' }}>
        <Link to="/returns" style={{ color: '#1a237e', textDecoration: 'none' }}>
          ← Back to Returns
        </Link>
        <div
          role="alert"
          style={{
            marginTop: '1rem',
            padding: '1.25rem',
            background: '#ffebee',
            color: '#c62828',
            borderRadius: '4px',
            border: '1px solid #ef9a9a',
          }}
        >
          <h3>Unable to load return</h3>
          <p>{error || 'Return not found'}</p>
        </div>
      </div>
    );
  }

  const ret = data.return;
  const inspections = data.inspections || [];
  const status = ret.status;

  const currentStepIdx = LIFECYCLE_STEPS.findIndex((s) => s.key === status);
  const isCancelled = status === 'CANCELLED';

  const canInspect = ['RECEIVED', 'UNDER_INSPECTION', 'EVALUATED'].includes(status);

  return (
    <div className="page-return-detail" style={{ maxWidth: '960px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1rem' }}>
        <Link to="/returns" style={{ color: '#1a237e', textDecoration: 'none', fontSize: '0.9rem' }}>
          ← Back to Returns
        </Link>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ margin: 0 }}>Return {ret.return_tracking_number}</h1>
          <span style={{ color: '#666', fontSize: '0.9rem' }}>
            ID #{ret.return_id} • Created {new Date(ret.created_at).toLocaleString()}
          </span>
        </div>
        <span className={`status-badge ${ret.status}`} style={{ fontSize: '0.9rem', padding: '0.35rem 0.85rem' }}>
          {ret.status.replace(/_/g, ' ')}
        </span>
      </div>

      {actionError && (
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
          {actionError}
        </div>
      )}

      {/* Lifecycle Progress Bar */}
      <div className="detail-card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: '#37474f' }}>Lifecycle Progress</h3>
        {isCancelled ? (
          <div style={{ padding: '0.75rem', background: '#ffebee', color: '#c62828', borderRadius: '4px', fontWeight: 600 }}>
            This return has been CANCELLED.
          </div>
        ) : (
          <div className="lifecycle-stepper">
            {LIFECYCLE_STEPS.map((step, idx) => {
              const isPassed = currentStepIdx > idx;
              const isCurrent = currentStepIdx === idx;
              return (
                <div
                  key={step.key}
                  className={`stepper-step ${isPassed ? 'completed' : ''} ${isCurrent ? 'active' : ''}`}
                >
                  <div className="step-circle">{isPassed ? '✓' : idx + 1}</div>
                  <div className="step-label">{step.label}</div>
                  {idx < LIFECYCLE_STEPS.length - 1 && <div className="step-connector" />}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Return Info Card */}
      <div className="detail-card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.2rem', marginTop: 0, marginBottom: '1rem', color: '#1a237e' }}>
          Return Information
        </h2>
        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">Product</span>
            <span className="info-value">
              <strong>{ret.brand}</strong> {ret.model_name}
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">SKU / Category</span>
            <span className="info-value">
              {ret.sku} ({ret.category})
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">Retail Price</span>
            <span className="info-value">₹{Number(ret.retail_price).toLocaleString()}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Warehouse Facility</span>
            <span className="info-value">
              {ret.facility_name} ({ret.warehouse_code})
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">Serial Number</span>
            <span className="info-value">{ret.serial_number || '—'}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Return Date</span>
            <span className="info-value">
              {ret.return_date ? new Date(ret.return_date).toLocaleDateString() : '—'}
            </span>
          </div>
          <div className="info-item" style={{ gridColumn: 'span 2' }}>
            <span className="info-label">Return Reason</span>
            <span className="info-value">{ret.return_reason}</span>
          </div>
          {ret.customer_comment && (
            <div className="info-item" style={{ gridColumn: 'span 2' }}>
              <span className="info-label">Customer Comment</span>
              <span className="info-value" style={{ fontStyle: 'italic', color: '#555' }}>
                "{ret.customer_comment}"
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Inspection Actions and Form */}
      {status === 'RECEIVED' && (
        <div className="detail-card" style={{ marginBottom: '1.5rem', background: '#e8eaf6', borderColor: '#c5cae9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0, color: '#1a237e' }}>Intake Inspection</h3>
              <p style={{ margin: '0.25rem 0 0 0', color: '#555', fontSize: '0.9rem' }}>
                Start official intake triage to transition status to UNDER INSPECTION.
              </p>
            </div>
            <button
              type="button"
              onClick={handleStartInspection}
              disabled={startingInspection}
              className="btn-primary"
            >
              {startingInspection ? 'Starting...' : 'Start Inspection'}
            </button>
          </div>
        </div>
      )}

      {canInspect && (
        <div className="detail-card" style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.2rem', marginTop: 0, marginBottom: '0.25rem', color: '#1a237e' }}>
            {inspections.length > 0 ? 'Record Additional / Updated Inspection' : 'Record Initial Inspection'}
          </h2>
          <p style={{ color: '#666', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
            Submitting this inspection transitions this return into <strong>EVALUATED</strong> and triggers the decision intelligence engine.
          </p>

          <form onSubmit={handleInspectionSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group">
                <label htmlFor="condition-grade">Condition Grade *</label>
                <select
                  id="condition-grade"
                  value={conditionGrade}
                  onChange={(e) => setConditionGrade(e.target.value)}
                  className="form-control"
                  required
                >
                  {CONDITION_GRADES.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
                {inspectionFieldErrors.condition_grade && (
                  <span className="field-error">{inspectionFieldErrors.condition_grade}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="functional-status">Functional Status *</label>
                <select
                  id="functional-status"
                  value={functionalStatus}
                  onChange={(e) => setFunctionalStatus(e.target.value)}
                  className="form-control"
                  required
                >
                  {FUNCTIONAL_STATUSES.map((fs) => (
                    <option key={fs} value={fs}>
                      {fs}
                    </option>
                  ))}
                </select>
                {inspectionFieldErrors.functional_status && (
                  <span className="field-error">{inspectionFieldErrors.functional_status}</span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '2rem', marginBottom: '1.25rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                <input
                  type="checkbox"
                  checked={hasOriginalPackaging}
                  onChange={(e) => setHasOriginalPackaging(e.target.checked)}
                />
                Has Original Packaging
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                <input
                  type="checkbox"
                  checked={hasAllAccessories}
                  onChange={(e) => setHasAllAccessories(e.target.checked)}
                />
                Has All Accessories
              </label>
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label htmlFor="repair-estimate">Repair Estimate (₹)</label>
              <input
                id="repair-estimate"
                type="number"
                min="0"
                step="0.01"
                value={repairEstimate}
                onChange={(e) => setRepairEstimate(e.target.value)}
                className="form-control"
              />
              {inspectionFieldErrors.repair_estimate && (
                <span className="field-error">{inspectionFieldErrors.repair_estimate}</span>
              )}
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label htmlFor="diagnostic-notes">Diagnostic Notes</label>
              <textarea
                id="diagnostic-notes"
                rows={3}
                placeholder="Observed defects, component diagnosis, or testing observations..."
                value={diagnosticNotes}
                onChange={(e) => setDiagnosticNotes(e.target.value)}
                className="form-control"
              />
              {inspectionFieldErrors.diagnostic_notes && (
                <span className="field-error">{inspectionFieldErrors.diagnostic_notes}</span>
              )}
            </div>

            <button
              type="submit"
              disabled={submittingInspection}
              className="btn-primary"
            >
              {submittingInspection ? 'Submitting Inspection...' : 'Submit Inspection'}
            </button>
          </form>
        </div>
      )}

      {/* Inspection History */}
      <div className="detail-card">
        <h2 style={{ fontSize: '1.2rem', marginTop: 0, marginBottom: '1rem', color: '#1a237e' }}>
          Inspection History ({inspections.length})
        </h2>

        {inspections.length === 0 ? (
          <p style={{ color: '#666', fontStyle: 'italic', margin: 0 }}>
            No inspections have been recorded yet for this return.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {inspections.map((insp, idx) => (
              <div
                key={insp.inspection_id || idx}
                style={{
                  border: '1px solid #e0e0e0',
                  borderRadius: '6px',
                  padding: '1rem 1.25rem',
                  backgroundColor: idx === 0 ? '#f9fbe7' : '#ffffff',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 600, color: '#37474f' }}>
                    {idx === 0 ? 'Latest Inspection' : `Inspection #${insp.inspection_id}`} • By{' '}
                    {insp.inspector_name || `Inspector #${insp.inspector_id}`}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: '#757575' }}>
                    {insp.inspected_at ? new Date(insp.inspected_at).toLocaleString() : '—'}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', fontSize: '0.85rem' }}>
                  <div>
                    <span style={{ color: '#757575', display: 'block' }}>Grade</span>
                    <strong>{insp.condition_grade}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#757575', display: 'block' }}>Functional Status</span>
                    <strong>{insp.functional_status}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#757575', display: 'block' }}>Repair Estimate</span>
                    <strong>₹{Number(insp.repair_estimate || 0).toLocaleString()}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#757575', display: 'block' }}>Packaging / Acc.</span>
                    <span>
                      {insp.has_original_packaging ? '✓ Box' : '✗ No Box'},{' '}
                      {insp.has_all_accessories ? '✓ Accs' : '✗ Missing'}
                    </span>
                  </div>
                </div>

                {insp.diagnostic_notes && (
                  <div style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: '#555', borderTop: '1px dashed #e0e0e0', paddingTop: '0.5rem' }}>
                    <strong>Notes:</strong> {insp.diagnostic_notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
