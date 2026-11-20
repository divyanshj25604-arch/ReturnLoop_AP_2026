import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api, { getApiErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { todayLocalIso, formatDateOnly, formatRupees, formatSignedRupees } from '../utils/format';

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

const ALL_DISPOSITIONS = ['Resell', 'Refurbish', 'Exchange', 'Donate', 'Recycle', 'Write-off'];

export default function ReturnDetail() {
  const { id } = useParams();
  const { user, hasRole } = useAuth();
  const isSupervisorOrAdmin = hasRole('SUPERVISOR');

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

  // Recommendation & Decision states
  const [recommendation, setRecommendation] = useState(null);
  const [loadingRecommendation, setLoadingRecommendation] = useState(false);
  const [recError, setRecError] = useState(null);

  // Decision form states (for supervisor)
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [selectedDisposition, setSelectedDisposition] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [submittingDecision, setSubmittingDecision] = useState(false);
  const [decisionError, setDecisionError] = useState(null);

  // Cancel form states (before DECIDED, supervisor only)
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [submittingCancel, setSubmittingCancel] = useState(false);
  const [cancelError, setCancelError] = useState(null);

  // Outcome form states (DECIDED status, supervisor only)
  const [outcomeExecuted, setOutcomeExecuted] = useState('');
  const [actualRevenue, setActualRevenue] = useState('0');
  const [actualCost, setActualCost] = useState('0');
  const [executionPartner, setExecutionPartner] = useState('');
  const [completionDate, setCompletionDate] = useState(() => todayLocalIso());
  const [outcomeNotes, setOutcomeNotes] = useState('');
  const [submittingOutcome, setSubmittingOutcome] = useState(false);
  const [outcomeFieldErrors, setOutcomeFieldErrors] = useState({});
  const [outcomeError, setOutcomeError] = useState(null);

  const loadReturnDetail = useCallback(() => {
    setLoading(true);
    setError(null);
    setActionError(null);
    setDecisionError(null);
    setCancelError(null);
    setOutcomeError(null);

    api
      .get(`/returns/${id}`)
      .then((res) => {
        const returnData = res.data?.data || null;
        setData(returnData);

        // Pre-fill outcome executed with decision final disposition
        if (returnData?.decision?.final_disposition) {
          setOutcomeExecuted(returnData.decision.final_disposition);
        }

        // If status is EVALUATED, fetch real-time recommendation
        if (returnData?.return?.status === 'EVALUATED') {
          setLoadingRecommendation(true);
          api
            .get(`/returns/${id}/recommendation`)
            .then((recRes) => {
              setRecommendation(recRes.data?.data || null);
              if (recRes.data?.data?.recommended_disposition) {
                const recDisp = recRes.data.data.recommended_disposition;
                const alt = ALL_DISPOSITIONS.find((d) => d !== recDisp) || 'Resell';
                setSelectedDisposition(alt);
              }
            })
            .catch((rErr) => {
              setRecError(getApiErrorMessage(rErr));
            })
            .finally(() => {
              setLoadingRecommendation(false);
            });
        }
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

  const handleAcceptRecommendation = async () => {
    if (!recommendation?.recommended_disposition) return;
    setSubmittingDecision(true);
    setDecisionError(null);
    try {
      await api.post(`/returns/${id}/decision`, {
        final_disposition: recommendation.recommended_disposition,
      });
      loadReturnDetail();
    } catch (err) {
      setDecisionError(getApiErrorMessage(err));
    } finally {
      setSubmittingDecision(false);
    }
  };

  const handleOverrideSubmit = async (e) => {
    e.preventDefault();
    if (!overrideReason.trim()) {
      setDecisionError('An override reason is required when deviating from the recommendation.');
      return;
    }
    setSubmittingDecision(true);
    setDecisionError(null);
    try {
      await api.post(`/returns/${id}/decision`, {
        final_disposition: selectedDisposition,
        override_reason: overrideReason.trim(),
      });
      setOverrideOpen(false);
      setOverrideReason('');
      loadReturnDetail();
    } catch (err) {
      setDecisionError(getApiErrorMessage(err));
    } finally {
      setSubmittingDecision(false);
    }
  };

  const handleCancelSubmit = async (e) => {
    e.preventDefault();
    if (!cancelReason.trim()) {
      setCancelError('Please provide a reason for cancelling this return.');
      return;
    }
    setSubmittingCancel(true);
    setCancelError(null);
    try {
      await api.post(`/returns/${id}/cancel`, {
        reason: cancelReason.trim(),
      });
      setCancelOpen(false);
      setCancelReason('');
      loadReturnDetail();
    } catch (err) {
      setCancelError(getApiErrorMessage(err));
    } finally {
      setSubmittingCancel(false);
    }
  };

  const handleOutcomeSubmit = async (e) => {
    e.preventDefault();
    setSubmittingOutcome(true);
    setOutcomeFieldErrors({});
    setOutcomeError(null);

    const payload = {
      disposition_executed: outcomeExecuted || ret?.decision?.final_disposition,
      actual_revenue: parseFloat(actualRevenue) || 0,
      actual_cost: parseFloat(actualCost) || 0,
      execution_partner: executionPartner.trim(),
      completion_date: completionDate,
      outcome_notes: outcomeNotes.trim(),
    };

    try {
      await api.post(`/returns/${id}/outcome`, payload);
      loadReturnDetail();
    } catch (err) {
      const errors = err.response?.data?.errors;
      if (Array.isArray(errors)) {
        const errMap = {};
        errors.forEach((eItem) => {
          if (eItem.field) errMap[eItem.field] = eItem.message;
        });
        setOutcomeFieldErrors(errMap);
      }
      setOutcomeError(getApiErrorMessage(err));
    } finally {
      setSubmittingOutcome(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container" style={{ padding: '4rem 1rem' }}>
        <div className="spinner" />
        <span>Loading return #{id} details...</span>
      </div>
    );
  }

  if (error || !data || !data.return) {
    return (
      <div style={{ maxWidth: '800px', margin: '2rem auto' }}>
        <Link to="/returns" style={{ color: '#1a237e', textDecoration: 'none', fontWeight: 600 }}>
          ← Back to Returns
        </Link>
        <div className="empty-state-card" style={{ marginTop: '1.5rem', borderColor: '#ef9a9a' }}>
          <div className="empty-state-icon" style={{ color: '#c62828' }}>⚠️</div>
          <h3 className="empty-state-title" style={{ color: '#c62828' }}>Unable to load return</h3>
          <p className="empty-state-desc">{error || 'Return not found or you do not have permission to view it.'}</p>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
            <button type="button" className="retry-btn" onClick={loadReturnDetail}>
              Retry Loading
            </button>
            <Link to="/returns" className="btn-secondary" style={{ textDecoration: 'none' }}>
              Back to Returns
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const ret = data.return;
  const inspections = data.inspections || [];
  const status = ret.status;
  const decision = data.decision;
  const alternatives = data.alternatives || [];
  const outcome = data.outcome;

  const currentStepIdx = LIFECYCLE_STEPS.findIndex((s) => s.key === status);
  const isCancelled = status === 'CANCELLED';
  const canInspect = ['RECEIVED', 'UNDER_INSPECTION', 'EVALUATED'].includes(status);
  const canCancel = isSupervisorOrAdmin && ['RECEIVED', 'UNDER_INSPECTION', 'EVALUATED'].includes(status);
  const isEvaluated = status === 'EVALUATED';
  const isDecided = status === 'DECIDED';
  const isCompleted = status === 'COMPLETED' && Boolean(outcome);
  const isDecidedOrLater = ['DECIDED', 'COMPLETED'].includes(status) || Boolean(decision);

  // Compute expected figures from the final disposition's alternative
  const finalAlternative = alternatives.find((a) => a.disposition_type === decision?.final_disposition);
  const expectedNet = finalAlternative ? Number(finalAlternative.net_expected_recovery) : 0;
  const expectedRevenue = finalAlternative ? Number(finalAlternative.estimated_revenue) : 0;
  const expectedCost = finalAlternative ? Number(finalAlternative.estimated_cost) : 0;
  const actualNet = outcome ? Number(outcome.actual_net_recovery) : 0;
  const variance = outcome ? actualNet - expectedNet : 0;

  return (
    <div className="page-return-detail" style={{ maxWidth: '960px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <Link to="/returns" style={{ color: '#1a237e', textDecoration: 'none', fontSize: '0.9rem' }}>
          ← Back to Returns
        </Link>

        {canCancel && (
          <button
            type="button"
            onClick={() => setCancelOpen(true)}
            className="btn-danger-outline"
          >
            Cancel Return
          </button>
        )}
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

      {/* Cancel Modal / Dialog */}
      {cancelOpen && (
        <div className="modal-backdrop">
          <div className="modal-box">
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#c62828' }}>Cancel Return</h3>
            <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: '#555' }}>
              Are you sure you want to cancel return <strong>{ret.return_tracking_number}</strong>? This action cannot be undone.
            </p>

            {cancelError && (
              <div role="alert" style={{ padding: '0.5rem', background: '#ffebee', color: '#c62828', borderRadius: '4px', marginBottom: '0.75rem', fontSize: '0.85rem' }}>
                {cancelError}
              </div>
            )}

            <form onSubmit={handleCancelSubmit}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label htmlFor="cancel-reason">Cancellation Reason *</label>
                <textarea
                  id="cancel-reason"
                  rows={3}
                  required
                  placeholder="e.g. Customer withdrew request, Fraudulent claim, Duplicate entry"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="form-control"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setCancelOpen(false);
                    setCancelError(null);
                  }}
                  className="btn-secondary"
                  disabled={submittingCancel}
                >
                  Keep Return
                </button>
                <button
                  type="submit"
                  disabled={submittingCancel}
                  className="btn-danger"
                >
                  {submittingCancel ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lifecycle Progress Bar */}
      <div className="detail-card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: '#37474f' }}>Lifecycle Progress</h3>
        {isCancelled ? (
          <div style={{ padding: '0.75rem 1rem', background: '#ffebee', color: '#c62828', borderRadius: '4px', fontWeight: 600 }}>
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
              {formatDateOnly(ret.return_date)}
            </span>
          </div>
          <div className="info-item" style={{ gridColumn: 'span 2' }}>
            <span className="info-label">Return Reason</span>
            <span className="info-value">{ret.return_reason}</span>
          </div>
          {ret.customer_comment && (
            <div className="info-item" style={{ gridColumn: 'span 2' }}>
              <span className="info-label">Customer Comment</span>
              <span className="info-value" style={{ fontStyle: 'italic', color: '#555', whiteSpace: 'pre-line' }}>
                "{ret.customer_comment}"
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Outcome Section (When status is COMPLETED) */}
      {isCompleted && (
        <div className="detail-card outcome-card" style={{ marginBottom: '1.5rem', borderLeft: '6px solid #2e7d32' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <span className="info-label">Execution Outcome</span>
              <h2 style={{ margin: '0.25rem 0', color: '#2e7d32', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                Executed: {outcome.disposition_executed}
                <span className="badge-accepted">COMPLETED</span>
              </h2>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.85rem', color: '#757575', display: 'block' }}>
                Completed {formatDateOnly(outcome.completion_date)}
              </span>
              <span style={{ fontSize: '0.8rem', color: '#9e9e9e' }}>
                Partner: {outcome.execution_partner || 'Internal Logistics'}
              </span>
            </div>
          </div>

          {/* Expected vs Actual Side-by-Side Comparison */}
          <div style={{ marginBottom: '1rem', background: '#f5f7fa', borderRadius: '6px', padding: '1.25rem' }}>
            <h4 style={{ margin: '0 0 1rem 0', color: '#37474f' }}>Recovery Financial Performance (Expected vs Actual)</h4>
            <div className="comparison-grid">
              <div className="comparison-col">
                <span className="comparison-heading">Metric</span>
                <div className="comparison-cell"><strong>Gross Revenue</strong></div>
                <div className="comparison-cell"><strong>Total Cost</strong></div>
                <div className="comparison-cell highlight"><strong>Net Value Recovery</strong></div>
              </div>
              <div className="comparison-col">
                <span className="comparison-heading">Expected (Engine)</span>
                <div className="comparison-cell">₹{expectedRevenue.toLocaleString()}</div>
                <div className="comparison-cell">₹{expectedCost.toLocaleString()}</div>
                <div className="comparison-cell highlight">₹{expectedNet.toLocaleString()}</div>
              </div>
              <div className="comparison-col">
                <span className="comparison-heading">Actual (Realized)</span>
                <div className="comparison-cell">₹{Number(outcome.actual_revenue).toLocaleString()}</div>
                <div className="comparison-cell">₹{Number(outcome.actual_cost).toLocaleString()}</div>
                <div className="comparison-cell highlight" style={{ color: actualNet >= 0 ? '#1b5e20' : '#c62828' }}>
                  {formatRupees(actualNet)}
                </div>
              </div>
              <div className="comparison-col">
                <span className="comparison-heading">Variance</span>
                <div className="comparison-cell">{formatSignedRupees(Number(outcome.actual_revenue) - expectedRevenue)}</div>
                <div className="comparison-cell">{formatSignedRupees(Number(outcome.actual_cost) - expectedCost)}</div>
                <div className="comparison-cell highlight" style={{ color: variance >= 0 ? '#1b5e20' : '#c62828' }}>
                  {formatSignedRupees(variance)}
                </div>
              </div>
            </div>
          </div>

          {outcome.outcome_notes && (
            <div style={{ fontSize: '0.9rem', color: '#455a64', background: '#fafafa', padding: '0.75rem', borderRadius: '4px' }}>
              <strong>Execution Notes:</strong> {outcome.outcome_notes}
            </div>
          )}
        </div>
      )}

      {/* Outcome Form (When status is DECIDED, supervisor only) */}
      {isDecided && isSupervisorOrAdmin && (
        <div className="detail-card" style={{ marginBottom: '1.5rem', border: '2px solid #2e7d32', background: '#f1f8e9' }}>
          <h2 style={{ fontSize: '1.25rem', marginTop: 0, marginBottom: '0.25rem', color: '#1b5e20' }}>
            Record Final Execution Outcome
          </h2>
          <p style={{ color: '#555', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
            This return has a finalized decision (<strong>{decision?.final_disposition}</strong>). Record the financial recovery and completion details to mark this return as <strong>COMPLETED</strong>.
          </p>

          {outcomeError && (
            <div role="alert" style={{ padding: '0.75rem', background: '#ffebee', color: '#c62828', borderRadius: '4px', marginBottom: '1rem' }}>
              {outcomeError}
            </div>
          )}

          <form onSubmit={handleOutcomeSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group">
                <label htmlFor="outcome-executed">Disposition Executed *</label>
                <select
                  id="outcome-executed"
                  value={outcomeExecuted}
                  onChange={(e) => setOutcomeExecuted(e.target.value)}
                  className="form-control"
                  required
                >
                  {ALL_DISPOSITIONS.map((d) => (
                    <option key={d} value={d}>
                      {d} {d === decision?.final_disposition ? '(Decided Target)' : ''}
                    </option>
                  ))}
                </select>
                {outcomeFieldErrors.disposition_executed && (
                  <span className="field-error">{outcomeFieldErrors.disposition_executed}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="execution-partner">Execution Partner</label>
                <input
                  id="execution-partner"
                  type="text"
                  placeholder="e.g. QuickRefurb Labs, Shiksha Foundation, EcoRecycle"
                  value={executionPartner}
                  onChange={(e) => setExecutionPartner(e.target.value)}
                  className="form-control"
                />
                {outcomeFieldErrors.execution_partner && (
                  <span className="field-error">{outcomeFieldErrors.execution_partner}</span>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group">
                <label htmlFor="actual-revenue">Actual Revenue (₹) *</label>
                <input
                  id="actual-revenue"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={actualRevenue}
                  onChange={(e) => setActualRevenue(e.target.value)}
                  className="form-control"
                />
                {outcomeFieldErrors.actual_revenue && (
                  <span className="field-error">{outcomeFieldErrors.actual_revenue}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="actual-cost">Actual Cost (₹) *</label>
                <input
                  id="actual-cost"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={actualCost}
                  onChange={(e) => setActualCost(e.target.value)}
                  className="form-control"
                />
                {outcomeFieldErrors.actual_cost && (
                  <span className="field-error">{outcomeFieldErrors.actual_cost}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="completion-date">Completion Date *</label>
                <input
                  id="completion-date"
                  type="date"
                  required
                  value={completionDate}
                  onChange={(e) => setCompletionDate(e.target.value)}
                  className="form-control"
                />
                {outcomeFieldErrors.completion_date && (
                  <span className="field-error">{outcomeFieldErrors.completion_date}</span>
                )}
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label htmlFor="outcome-notes">Execution Notes</label>
              <textarea
                id="outcome-notes"
                rows={2}
                placeholder="Log invoice numbers, consignment tracking or notes..."
                value={outcomeNotes}
                onChange={(e) => setOutcomeNotes(e.target.value)}
                className="form-control"
              />
              {outcomeFieldErrors.outcome_notes && (
                <span className="field-error">{outcomeFieldErrors.outcome_notes}</span>
              )}
            </div>

            <button
              type="submit"
              disabled={submittingOutcome}
              className="btn-primary"
              style={{ backgroundColor: '#2e7d32' }}
            >
              {submittingOutcome ? 'Recording...' : 'Record Outcome & Mark Completed'}
            </button>
          </form>
        </div>
      )}

      {/* Decision Section (When status is DECIDED or COMPLETED) */}
      {isDecidedOrLater && decision && (
        <div className="detail-card decision-card" style={{ marginBottom: '1.5rem', borderLeft: '6px solid #1a237e' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
              <span className="info-label">Disposition Decision</span>
              <h2 style={{ margin: '0.25rem 0', color: '#1a237e', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                Final: {decision.final_disposition}
                {decision.is_override ? (
                  <span className="badge-override">OVERRIDDEN</span>
                ) : (
                  <span className="badge-accepted">RECOMMENDATION ACCEPTED</span>
                )}
              </h2>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span className="confidence-pill">
                Confidence: {(Number(decision.confidence_score) * 100).toFixed(1)}%
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1rem', background: '#f5f7fa', padding: '1rem', borderRadius: '4px' }}>
            <div>
              <span className="info-label">Recommended</span>
              <span className="info-value" style={{ fontWeight: 600 }}>
                {decision.recommended_disposition}
              </span>
            </div>
            <div>
              <span className="info-label">Decided By</span>
              <span className="info-value">
                {decision.decided_by_name || `Operator #${decision.decided_by_operator_id}`}
              </span>
            </div>
            <div>
              <span className="info-label">Decided Date</span>
              <span className="info-value">
                {decision.decided_at ? new Date(decision.decided_at).toLocaleString() : '—'}
              </span>
            </div>
          </div>

          {decision.is_override && (
            <div style={{ padding: '0.75rem 1rem', background: '#fff3e0', border: '1px solid #ffe0b2', borderRadius: '4px', marginBottom: '1rem' }}>
              <strong style={{ color: '#e65100' }}>Override Justification:</strong>
              <p style={{ margin: '0.25rem 0 0 0', color: '#bf360c' }}>{decision.override_reason}</p>
            </div>
          )}

          {/* Saved Alternatives */}
          {alternatives.length > 0 && (
            <div style={{ marginTop: '1.25rem' }}>
              <h4 style={{ margin: '0 0 0.75rem 0', color: '#37474f' }}>Evaluated Disposition Alternatives</h4>
              <div className="recommendation-grid">
                {alternatives.map((alt) => (
                  <div
                    key={alt.alternative_id || alt.disposition_type}
                    className={`rec-card ${alt.disposition_type === decision.final_disposition ? 'selected-disposition' : ''} ${alt.is_recommended ? 'recommended-option' : ''}`}
                  >
                    <div className="rec-card-header">
                      <span className="rec-rank">#{alt.rank_order}</span>
                      <strong className="rec-title">{alt.disposition_type}</strong>
                      {alt.is_recommended && <span className="rec-badge">Recommended</span>}
                      {alt.disposition_type === decision.final_disposition && (
                        <span className="final-badge">Final</span>
                      )}
                    </div>
                    <div className="rec-metric-primary">
                      <span className="metric-label">Net Recovery</span>
                      <span className="metric-value">₹{Number(alt.net_expected_recovery).toLocaleString()}</span>
                    </div>
                    <div className="rec-metrics-row">
                      <div>
                        <span>Revenue:</span> ₹{Number(alt.estimated_revenue).toLocaleString()}
                      </div>
                      <div>
                        <span>Cost:</span> ₹{Number(alt.estimated_cost).toLocaleString()}
                      </div>
                      <div>
                        <span>Feasibility:</span> {(Number(alt.feasibility_score) * 100).toFixed(0)}%
                      </div>
                    </div>
                    {alt.rationale && <p className="rec-rationale">{alt.rationale}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Live Recommendation Section (When status is EVALUATED) */}
      {isEvaluated && (
        <div className="detail-card" style={{ marginBottom: '1.5rem', border: '2px solid #3f51b5' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.3rem', margin: 0, color: '#1a237e' }}>
                Decision Intelligence Recommendations
              </h2>
              <p style={{ margin: '0.25rem 0 0 0', color: '#555', fontSize: '0.9rem' }}>
                Algorithmic disposition scoring based on physical condition grade, functional diagnostics, and financial recovery models.
              </p>
            </div>
            {recommendation && (
              <span className="confidence-pill" style={{ fontSize: '0.95rem' }}>
                Engine Confidence: {(Number(recommendation.confidence_score) * 100).toFixed(1)}%
              </span>
            )}
          </div>

          {decisionError && (
            <div
              role="alert"
              style={{
                padding: '0.85rem 1rem',
                background: '#ffebee',
                color: '#c62828',
                borderRadius: '4px',
                marginBottom: '1rem',
                border: '1px solid #ef9a9a',
              }}
            >
              {decisionError}
            </div>
          )}

          {loadingRecommendation ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
              Computing optimal disposition rankings...
            </div>
          ) : recError ? (
            <div role="alert" style={{ padding: '1rem', background: '#ffebee', color: '#c62828', borderRadius: '4px' }}>
              {recError}
            </div>
          ) : recommendation ? (
            <>
              {/* Supervisor Decision Controls */}
              {isSupervisorOrAdmin && (
                <div style={{ marginBottom: '1.5rem', padding: '1.25rem', background: '#e8eaf6', borderRadius: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                      <strong style={{ fontSize: '1rem', color: '#1a237e' }}>Supervisor Decision Required:</strong>
                      <span style={{ display: 'block', fontSize: '0.9rem', color: '#455a64' }}>
                        Accept the top recommendation (<strong>{recommendation.recommended_disposition}</strong>) or record an override.
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <button
                        type="button"
                        onClick={handleAcceptRecommendation}
                        disabled={submittingDecision}
                        className="btn-primary"
                        style={{ backgroundColor: '#2e7d32' }}
                      >
                        {submittingDecision ? 'Recording...' : `Accept ${recommendation.recommended_disposition}`}
                      </button>

                      <button
                        type="button"
                        onClick={() => setOverrideOpen((prev) => !prev)}
                        disabled={submittingDecision}
                        className="btn-secondary"
                      >
                        {overrideOpen ? 'Cancel Override' : 'Override Recommendation'}
                      </button>
                    </div>
                  </div>

                  {overrideOpen && (
                    <form onSubmit={handleOverrideSubmit} style={{ marginTop: '1.25rem', borderTop: '1px solid #c5cae9', paddingTop: '1.25rem' }}>
                      <h4 style={{ margin: '0 0 0.75rem 0', color: '#1a237e' }}>Record Disposition Override</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', marginBottom: '1rem' }}>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label htmlFor="override-disposition">Select Target Disposition *</label>
                          <select
                            id="override-disposition"
                            value={selectedDisposition}
                            onChange={(e) => setSelectedDisposition(e.target.value)}
                            className="form-control"
                            required
                          >
                            {ALL_DISPOSITIONS.map((d) => (
                              <option key={d} value={d}>
                                {d} {d === recommendation.recommended_disposition ? '(Engine Pick)' : ''}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="form-group" style={{ margin: 0 }}>
                          <label htmlFor="override-reason">Reason for Override *</label>
                          <input
                            id="override-reason"
                            type="text"
                            placeholder="e.g. Partner NGO requested this model for school program"
                            value={overrideReason}
                            onChange={(e) => setOverrideReason(e.target.value)}
                            className="form-control"
                            required
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <button
                          type="submit"
                          disabled={submittingDecision}
                          className="btn-primary"
                          style={{ backgroundColor: '#e65100' }}
                        >
                          {submittingDecision ? 'Submitting Override...' : 'Confirm Override'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* 6 Ranked Recommendation Cards */}
              <div className="recommendation-grid">
                {(recommendation.alternatives || []).map((alt) => (
                  <div
                    key={alt.disposition_type}
                    className={`rec-card ${alt.is_recommended ? 'recommended-option' : ''}`}
                  >
                    <div className="rec-card-header">
                      <span className="rec-rank">#{alt.rank_order}</span>
                      <strong className="rec-title">{alt.disposition_type}</strong>
                      {alt.is_recommended && <span className="rec-badge">Recommended</span>}
                    </div>

                    <div className="rec-metric-primary">
                      <span className="metric-label">Net Expected Recovery</span>
                      <span className="metric-value">₹{Number(alt.net_expected_recovery).toLocaleString()}</span>
                    </div>

                    <div className="rec-metrics-row">
                      <div>
                        <span>Est. Revenue:</span> ₹{Number(alt.estimated_revenue).toLocaleString()}
                      </div>
                      <div>
                        <span>Est. Cost:</span> ₹{Number(alt.estimated_cost).toLocaleString()}
                      </div>
                      <div>
                        <span>Feasibility:</span> {(Number(alt.feasibility_score) * 100).toFixed(0)}%
                      </div>
                    </div>

                    {alt.rationale && <p className="rec-rationale">{alt.rationale}</p>}
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </div>
      )}

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
            Submitting an inspection transitions this return into <strong>EVALUATED</strong> and triggers the decision intelligence engine.
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
