import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api, { getApiErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { todayLocalIso, formatDateOnly, formatRupees, formatSignedRupees } from '../utils/format';
import { statusLabel } from '../utils/status';

const LIFECYCLE_STEPS = [
  { key: 'RECEIVED', label: 'Received' },
  { key: 'UNDER_INSPECTION', label: 'Under inspection' },
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
      <div className="loading-container">
        <div className="spinner" />
        <span>Loading return #{id}…</span>
      </div>
    );
  }

  if (error || !data || !data.return) {
    return (
      <div className="narrow-page">
        <Link to="/returns" className="back-link">
          ← Returns
        </Link>
        <div className="empty-state-card boxed">
          <h3 className="empty-state-title">This return couldn't be loaded</h3>
          <p className="empty-state-desc">{error || 'Return not found or you do not have permission to view it.'}</p>
          <div className="page-actions">
            <button type="button" className="btn-primary" onClick={loadReturnDetail}>
              Try again
            </button>
            <Link to="/returns" className="btn-secondary">
              Back to returns
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

  // The engine's top pick among the live alternatives (EVALUATED only).
  const liveAlternatives = recommendation?.alternatives || [];
  const recommendedAlternative =
    liveAlternatives.find((a) => a.is_recommended) ||
    liveAlternatives.find((a) => a.disposition_type === recommendation?.recommended_disposition);

  const signClass = (n) => (n >= 0 ? 'pos' : 'neg');

  return (
    <div className="page-return-detail detail-page">
      <Link to="/returns" className="back-link">
        ← Returns
      </Link>

      <div className="detail-title-row">
        <div className="page-head-text">
          <h1>{ret.return_tracking_number}</h1>
          <p className="detail-meta">
            {ret.brand} {ret.model_name}. Return #{ret.return_id}, created {new Date(ret.created_at).toLocaleString()}
          </p>
        </div>
        <div className="detail-title-side">
          <span className={`status-tag large ${ret.status}`}>{statusLabel(ret.status)}</span>
          {canCancel && (
            <button type="button" onClick={() => setCancelOpen(true)} className="btn-danger-outline">
              Cancel return
            </button>
          )}
        </div>
      </div>

      {actionError && (
        <div role="alert" className="alert error">
          {actionError}
        </div>
      )}

      {/* Cancel dialog */}
      {cancelOpen && (
        <div className="modal-backdrop">
          <div className="modal-box danger" role="dialog" aria-modal="true" aria-labelledby="cancel-title">
            <div className="modal-header">
              <h2 id="cancel-title">Cancel this return?</h2>
            </div>
            <p className="modal-intro">
              <strong>{ret.return_tracking_number}</strong> will be marked Cancelled and can't be inspected or decided
              afterwards. This can't be undone.
            </p>

            {cancelError && (
              <div role="alert" className="alert error">
                {cancelError}
              </div>
            )}

            <form onSubmit={handleCancelSubmit}>
              <div className="form-group">
                <label htmlFor="cancel-reason">
                  Reason <span className="required-star">*</span>
                </label>
                <textarea
                  id="cancel-reason"
                  rows={3}
                  required
                  placeholder="e.g. Customer withdrew the request, duplicate entry"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="form-control"
                />
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  onClick={() => {
                    setCancelOpen(false);
                    setCancelError(null);
                  }}
                  className="btn-secondary"
                  disabled={submittingCancel}
                >
                  Keep return
                </button>
                <button type="submit" disabled={submittingCancel} className="btn-danger">
                  {submittingCancel ? 'Cancelling…' : 'Cancel return'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lifecycle */}
      <section className="panel" aria-label="Lifecycle">
        {isCancelled ? (
          <div className="cancelled-note">This return was cancelled before a decision was made.</div>
        ) : (
          <ol className="lifecycle">
            {LIFECYCLE_STEPS.map((step, idx) => {
              const isPassed = currentStepIdx > idx;
              const isCurrent = currentStepIdx === idx;
              return (
                <li
                  key={step.key}
                  className={`lifecycle-step ${step.key} ${isPassed ? 'done' : ''} ${isCurrent ? 'current' : ''}`}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  <span className="n">{isPassed ? '✓' : idx + 1}</span>
                  {step.label}
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {/* Return information */}
      <section className="panel">
        <div className="panel-head">
          <h2>Device and return</h2>
        </div>
        <dl className="facts">
          <div>
            <dt>Product</dt>
            <dd>
              <strong>{ret.brand}</strong> {ret.model_name}
            </dd>
          </div>
          <div>
            <dt>SKU</dt>
            <dd>
              {ret.sku} <span className="category-pill">{ret.category}</span>
            </dd>
          </div>
          <div>
            <dt>Retail price</dt>
            <dd>₹{Number(ret.retail_price).toLocaleString()}</dd>
          </div>
          <div>
            <dt>Warehouse</dt>
            <dd>
              {ret.facility_name} ({ret.warehouse_code})
            </dd>
          </div>
          <div>
            <dt>Serial number</dt>
            <dd>{ret.serial_number || '—'}</dd>
          </div>
          <div>
            <dt>Return date</dt>
            <dd>{formatDateOnly(ret.return_date)}</dd>
          </div>
          <div className="wide">
            <dt>Return reason</dt>
            <dd>{ret.return_reason}</dd>
          </div>
          {ret.customer_comment && (
            <div className="wide">
              <dt>Customer comment</dt>
              <dd className="quote">{ret.customer_comment}</dd>
            </div>
          )}
        </dl>
      </section>

      {/* Outcome (COMPLETED) */}
      {isCompleted && (
        <section className="panel accent-left COMPLETED">
          <div className="outcome-head">
            <div>
              <h2>
                Executed: {outcome.disposition_executed}
                <span className="mini-tag accepted">Completed</span>
              </h2>
            </div>
            <div className="outcome-when">
              <div>Completed {formatDateOnly(outcome.completion_date)}</div>
              <div>Partner: {outcome.execution_partner || 'Internal Logistics'}</div>
            </div>
          </div>

          <p className="form-section-label">Expected by the engine against what was actually realised</p>
          <table className="compare-table">
            <thead>
              <tr>
                <th scope="col">Figure</th>
                <th scope="col">Expected</th>
                <th scope="col">Actual</th>
                <th scope="col">Variance</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Revenue</td>
                <td>₹{expectedRevenue.toLocaleString()}</td>
                <td>₹{Number(outcome.actual_revenue).toLocaleString()}</td>
                <td>{formatSignedRupees(Number(outcome.actual_revenue) - expectedRevenue)}</td>
              </tr>
              <tr>
                <td>Cost</td>
                <td>₹{expectedCost.toLocaleString()}</td>
                <td>₹{Number(outcome.actual_cost).toLocaleString()}</td>
                <td>{formatSignedRupees(Number(outcome.actual_cost) - expectedCost)}</td>
              </tr>
              <tr className="total">
                <td>Net recovery</td>
                <td>{formatRupees(expectedNet)}</td>
                <td className={signClass(actualNet)}>{formatRupees(actualNet)}</td>
                <td className={signClass(variance)}>{formatSignedRupees(variance)}</td>
              </tr>
            </tbody>
          </table>

          {outcome.outcome_notes && (
            <p className="notes-block">
              <strong>Notes:</strong> {outcome.outcome_notes}
            </p>
          )}
        </section>
      )}

      {/* Outcome form (DECIDED, supervisor only) */}
      {isDecided && isSupervisorOrAdmin && (
        <section className="panel accent-left COMPLETED">
          <div className="panel-head">
            <div>
              <h2>Record the outcome</h2>
              <p>
                The decision was <strong>{decision?.final_disposition}</strong>. Enter what actually happened to
                complete this return.
              </p>
            </div>
          </div>

          {outcomeError && (
            <div role="alert" className="alert error">
              {outcomeError}
            </div>
          )}

          <form onSubmit={handleOutcomeSubmit}>
            <div className="field-row">
              <div className="form-group">
                <label htmlFor="outcome-executed">
                  Disposition carried out <span className="required-star">*</span>
                </label>
                <select
                  id="outcome-executed"
                  value={outcomeExecuted}
                  onChange={(e) => setOutcomeExecuted(e.target.value)}
                  className="form-control"
                  required
                >
                  {ALL_DISPOSITIONS.map((d) => (
                    <option key={d} value={d}>
                      {d} {d === decision?.final_disposition ? '(decided)' : ''}
                    </option>
                  ))}
                </select>
                {outcomeFieldErrors.disposition_executed && (
                  <span className="field-error">{outcomeFieldErrors.disposition_executed}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="execution-partner">Partner</label>
                <input
                  id="execution-partner"
                  type="text"
                  placeholder="e.g. QuickRefurb Labs, Shiksha Foundation"
                  value={executionPartner}
                  onChange={(e) => setExecutionPartner(e.target.value)}
                  className="form-control"
                />
                {outcomeFieldErrors.execution_partner && (
                  <span className="field-error">{outcomeFieldErrors.execution_partner}</span>
                )}
              </div>
            </div>

            <div className="field-row three">
              <div className="form-group">
                <label htmlFor="actual-revenue">
                  Actual revenue (₹) <span className="required-star">*</span>
                </label>
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
                <label htmlFor="actual-cost">
                  Actual cost (₹) <span className="required-star">*</span>
                </label>
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
                <label htmlFor="completion-date">
                  Completion date <span className="required-star">*</span>
                </label>
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

            <div className="form-group">
              <label htmlFor="outcome-notes">Notes</label>
              <textarea
                id="outcome-notes"
                rows={2}
                placeholder="Invoice numbers, consignment tracking, anything worth keeping"
                value={outcomeNotes}
                onChange={(e) => setOutcomeNotes(e.target.value)}
                className="form-control"
              />
              {outcomeFieldErrors.outcome_notes && (
                <span className="field-error">{outcomeFieldErrors.outcome_notes}</span>
              )}
            </div>

            <div className="form-actions start">
              <button type="submit" disabled={submittingOutcome} className="btn-accept">
                {submittingOutcome ? 'Recording…' : 'Record outcome and complete'}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Decision (DECIDED or COMPLETED) */}
      {isDecidedOrLater && decision && (
        <section className="panel">
          <div className="panel-head">
            <h2>Decision</h2>
          </div>

          <RoutingSlip
            kicker="Final route"
            tag={
              decision.is_override ? (
                <span className="mini-tag override">Overridden</span>
              ) : (
                <span className="mini-tag">Recommendation accepted</span>
              )
            }
            disposition={decision.final_disposition}
            confidence={decision.confidence_score}
            alternative={finalAlternative}
          />

          <dl className="facts decision-facts">
            <div>
              <dt>Engine recommended</dt>
              <dd>
                <strong>{decision.recommended_disposition}</strong>
              </dd>
            </div>
            <div>
              <dt>Decided by</dt>
              <dd>{decision.decided_by_name || `Operator #${decision.decided_by_operator_id}`}</dd>
            </div>
            <div>
              <dt>Decided at</dt>
              <dd>{decision.decided_at ? new Date(decision.decided_at).toLocaleString() : '—'}</dd>
            </div>
          </dl>

          {decision.is_override && (
            <div className="override-note">
              <strong>Reason for override</strong>
              {decision.override_reason}
            </div>
          )}

          {alternatives.length > 0 && (
            <div className="rank-section">
              <h3>All routes the engine ranked</h3>
              <RankList alternatives={alternatives} finalDisposition={decision.final_disposition} />
            </div>
          )}
        </section>
      )}

      {/* Live recommendation (EVALUATED) */}
      {isEvaluated && (
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Recommendation</h2>
              <p>Ranked by the rules engine from the latest inspection: condition, function and expected recovery.</p>
            </div>
          </div>

          {decisionError && (
            <div role="alert" className="alert error">
              {decisionError}
            </div>
          )}

          {loadingRecommendation ? (
            <div className="loading-container">
              <div className="spinner" />
              <span>Ranking dispositions…</span>
            </div>
          ) : recError ? (
            <div role="alert" className="alert error">
              {recError}
            </div>
          ) : recommendation ? (
            <>
              <RoutingSlip
                kicker="Recommended route"
                disposition={recommendation.recommended_disposition}
                confidence={recommendation.confidence_score}
                alternative={recommendedAlternative}
              />

              {isSupervisorOrAdmin ? (
                <div className="decision-bar">
                  <p className="decision-bar-text">
                    <strong>Your decision.</strong> Accept {recommendation.recommended_disposition}, or choose another
                    route and say why.
                  </p>
                  <div className="page-actions">
                    <button
                      type="button"
                      onClick={handleAcceptRecommendation}
                      disabled={submittingDecision}
                      className="btn-accept"
                    >
                      {submittingDecision ? 'Recording…' : `Accept ${recommendation.recommended_disposition}`}
                    </button>
                    <button
                      type="button"
                      onClick={() => setOverrideOpen((prev) => !prev)}
                      disabled={submittingDecision}
                      className="btn-secondary"
                      aria-expanded={overrideOpen}
                    >
                      {overrideOpen ? 'Close override' : 'Choose another route'}
                    </button>
                  </div>

                  {overrideOpen && (
                    <form onSubmit={handleOverrideSubmit} className="override-form">
                      <div className="field-row one-two">
                        <div className="form-group">
                          <label htmlFor="override-disposition">
                            Route <span className="required-star">*</span>
                          </label>
                          <select
                            id="override-disposition"
                            value={selectedDisposition}
                            onChange={(e) => setSelectedDisposition(e.target.value)}
                            className="form-control"
                            required
                          >
                            {ALL_DISPOSITIONS.map((d) => (
                              <option key={d} value={d}>
                                {d} {d === recommendation.recommended_disposition ? '(recommended)' : ''}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="form-group">
                          <label htmlFor="override-reason">
                            Reason for override <span className="required-star">*</span>
                          </label>
                          <input
                            id="override-reason"
                            type="text"
                            placeholder="e.g. Partner NGO requested this model for a school programme"
                            value={overrideReason}
                            onChange={(e) => setOverrideReason(e.target.value)}
                            className="form-control"
                            required
                          />
                        </div>
                      </div>

                      <div className="form-actions">
                        <button type="submit" disabled={submittingDecision} className="btn-override">
                          {submittingDecision ? 'Saving override…' : 'Save override'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              ) : (
                <div className="decision-bar">
                  <p className="decision-bar-text">A supervisor will accept this route or choose another.</p>
                </div>
              )}

              <div className="rank-section">
                <h3>All six routes, ranked</h3>
                <RankList alternatives={liveAlternatives} />
              </div>
            </>
          ) : null}
        </section>
      )}

      {/* Start inspection (RECEIVED) */}
      {status === 'RECEIVED' && (
        <section className="panel accent-left UNDER_INSPECTION">
          <div className="action-strip">
            <div>
              <h2>Start inspection</h2>
              <p className="muted small">Moves this return to Under inspection while you examine the device.</p>
            </div>
            <button
              type="button"
              onClick={handleStartInspection}
              disabled={startingInspection}
              className="btn-primary"
            >
              {startingInspection ? 'Starting…' : 'Start inspection'}
            </button>
          </div>
        </section>
      )}

      {/* Inspection form */}
      {canInspect && (
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>{inspections.length > 0 ? 'Record another inspection' : 'Record inspection'}</h2>
              <p>Saving an inspection marks the return Evaluated and re-ranks the six routes.</p>
            </div>
          </div>

          <form onSubmit={handleInspectionSubmit}>
            <div className="field-row">
              <div className="form-group">
                <label htmlFor="condition-grade">
                  Condition grade <span className="required-star">*</span>
                </label>
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
                <label htmlFor="functional-status">
                  Functional status <span className="required-star">*</span>
                </label>
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

            <div className="check-row">
              <label className="check">
                <input
                  type="checkbox"
                  checked={hasOriginalPackaging}
                  onChange={(e) => setHasOriginalPackaging(e.target.checked)}
                />
                Original packaging
              </label>

              <label className="check">
                <input
                  type="checkbox"
                  checked={hasAllAccessories}
                  onChange={(e) => setHasAllAccessories(e.target.checked)}
                />
                All accessories
              </label>
            </div>

            <div className="field-row">
              <div className="form-group">
                <label htmlFor="repair-estimate">Repair estimate (₹)</label>
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
            </div>

            <div className="form-group">
              <label htmlFor="diagnostic-notes">Diagnostic notes</label>
              <textarea
                id="diagnostic-notes"
                rows={3}
                placeholder="Defects found, components tested, anything the supervisor should know"
                value={diagnosticNotes}
                onChange={(e) => setDiagnosticNotes(e.target.value)}
                className="form-control"
              />
              {inspectionFieldErrors.diagnostic_notes && (
                <span className="field-error">{inspectionFieldErrors.diagnostic_notes}</span>
              )}
            </div>

            <div className="form-actions start">
              <button type="submit" disabled={submittingInspection} className="btn-primary">
                {submittingInspection ? 'Saving inspection…' : 'Save inspection'}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Inspection history */}
      <section className="panel">
        <div className="panel-head">
          <h2>Inspection history</h2>
          <span className="muted small">
            {inspections.length} {inspections.length === 1 ? 'inspection' : 'inspections'}
          </span>
        </div>

        {inspections.length === 0 ? (
          <p className="muted">No inspections recorded yet.</p>
        ) : (
          <ol className="history-list">
            {inspections.map((insp, idx) => (
              <li key={insp.inspection_id || idx} className="history-item">
                <div className="history-head">
                  <span className="history-who">
                    {idx === 0 ? 'Latest inspection' : `Inspection #${insp.inspection_id}`}, by{' '}
                    {insp.inspector_name || `Inspector #${insp.inspector_id}`}
                  </span>
                  <span className="muted small">
                    {insp.inspected_at ? new Date(insp.inspected_at).toLocaleString() : '—'}
                  </span>
                </div>

                <dl className="facts four">
                  <div>
                    <dt>Grade</dt>
                    <dd>
                      <strong>{insp.condition_grade}</strong>
                    </dd>
                  </div>
                  <div>
                    <dt>Functional status</dt>
                    <dd>
                      <strong>{insp.functional_status}</strong>
                    </dd>
                  </div>
                  <div>
                    <dt>Repair estimate</dt>
                    <dd>
                      <strong>₹{Number(insp.repair_estimate || 0).toLocaleString()}</strong>
                    </dd>
                  </div>
                  <div>
                    <dt>Packaging, accessories</dt>
                    <dd>
                      {insp.has_original_packaging ? '✓ Box' : '✗ No box'},{' '}
                      {insp.has_all_accessories ? '✓ All accessories' : '✗ Missing'}
                    </dd>
                  </div>
                </dl>

                {insp.diagnostic_notes && (
                  <p className="history-notes">
                    <strong>Notes:</strong> {insp.diagnostic_notes}
                  </p>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

// The decided or recommended route, printed as a yellow routing slip.
function RoutingSlip({ kicker, tag, disposition, confidence, alternative }) {
  return (
    <div className="slip" data-disp={disposition}>
      <div className="slip-stub">
        <span className="slip-stub-label">Confidence</span>
        <span className="slip-stub-value">{(Number(confidence) * 100).toFixed(1)}%</span>
        <span className="slip-stub-note">engine score</span>
      </div>
      <div className="slip-body">
        <div className="slip-kicker">
          {kicker}
          {tag}
        </div>
        <div className="slip-disposition">{disposition}</div>
        {alternative?.rationale && <p className="slip-rationale">{alternative.rationale}</p>}
      </div>
      {alternative && (
        <div className="slip-figures">
          <span className="slip-net-label">Net expected recovery</span>
          <span className="slip-net">{formatRupees(alternative.net_expected_recovery)}</span>
          <span className="slip-sub">
            Revenue ₹{Number(alternative.estimated_revenue).toLocaleString()}, cost ₹
            {Number(alternative.estimated_cost).toLocaleString()}
          </span>
          <span className="slip-sub">Feasibility {(Number(alternative.feasibility_score) * 100).toFixed(0)}%</span>
        </div>
      )}
    </div>
  );
}

// All six ranked alternatives in one dense list.
function RankList({ alternatives, finalDisposition }) {
  return (
    <div className="rank-table">
      <div className="rank-head" aria-hidden="true">
        <span>#</span>
        <span>Route</span>
        <span className="num">Net recovery</span>
        <span className="num">Revenue</span>
        <span className="num">Cost</span>
        <span>Feasibility</span>
      </div>
      <ol className="rank-list">
        {alternatives.map((alt) => {
          const isFinal = finalDisposition && alt.disposition_type === finalDisposition;
          const feasibility = Number(alt.feasibility_score) * 100;
          return (
            <li
              key={alt.alternative_id || alt.disposition_type}
              className={`rank-row ${alt.is_recommended ? 'is-recommended' : ''} ${isFinal ? 'is-final' : ''}`}
              data-disp={alt.disposition_type}
            >
              <span className="rank-n">{alt.rank_order}</span>
              <div className="rank-main">
                <div className="rank-name">
                  <span className="disp-dot" />
                  {alt.disposition_type}
                  {alt.is_recommended && <span className="mini-tag recommended">Recommended</span>}
                  {isFinal && <span className="mini-tag final">Final</span>}
                </div>
                {alt.rationale && <p className="rank-why">{alt.rationale}</p>}
              </div>
              <div className="rank-fig net">
                <span className="rank-fig-label">Net recovery</span>
                {formatRupees(alt.net_expected_recovery)}
              </div>
              <div className="rank-fig">
                <span className="rank-fig-label">Revenue</span>₹{Number(alt.estimated_revenue).toLocaleString()}
              </div>
              <div className="rank-fig">
                <span className="rank-fig-label">Cost</span>₹{Number(alt.estimated_cost).toLocaleString()}
              </div>
              <div className="rank-meter">
                <span className="rank-fig-label">Feasibility</span>
                <div className="meter">
                  <div className="meter-track">
                    <div className="meter-fill" style={{ width: `${feasibility}%` }} />
                  </div>
                  <span className="meter-num">{feasibility.toFixed(0)}%</span>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
