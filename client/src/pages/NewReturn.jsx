import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api, { getApiErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function NewReturn() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const isInspector = user?.app_role === 'INSPECTOR';

  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [productSearch, setProductSearch] = useState('');

  // Form states
  const [productId, setProductId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [returnReason, setReturnReason] = useState('');
  const [returnDate, setReturnDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [customerComment, setCustomerComment] = useState('');

  const [fieldErrors, setFieldErrors] = useState({});
  const [generalError, setGeneralError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  // Load products and warehouses
  const loadData = useCallback(() => {
    setLoadingData(true);
    setGeneralError(null);
    Promise.all([
      api.get('/products'),
      api.get('/warehouses'),
    ])
      .then(([productsRes, warehousesRes]) => {
        const prodList = productsRes.data?.data || [];
        const whList = warehousesRes.data?.data || [];
        setProducts(prodList);
        setWarehouses(whList);

        if (prodList.length > 0) {
          setProductId(String(prodList[0].product_id));
        }

        if (isInspector) {
          setWarehouseId(String(user?.warehouse_id || 1));
        } else if (whList.length > 0) {
          setWarehouseId(String(user?.warehouse_id || whList[0].warehouse_id));
        }
      })
      .catch((err) => {
        setGeneralError(getApiErrorMessage(err));
      })
      .finally(() => {
        setLoadingData(false);
      });
  }, [isInspector, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredProducts = products.filter((p) => {
    if (!productSearch.trim()) return true;
    const q = productSearch.toLowerCase();
    return (
      p.sku?.toLowerCase().includes(q) ||
      p.brand?.toLowerCase().includes(q) ||
      p.model_name?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q)
    );
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldErrors({});
    setGeneralError(null);

    const payload = {
      product_id: Number(productId),
      return_reason: returnReason.trim(),
    };

    if (warehouseId) {
      payload.warehouse_id = Number(warehouseId);
    }
    if (serialNumber.trim()) {
      payload.serial_number = serialNumber.trim();
    }
    if (returnDate) {
      payload.return_date = returnDate;
    }
    if (customerComment.trim()) {
      payload.customer_comment = customerComment.trim();
    }
    if (trackingNumber.trim()) {
      payload.return_tracking_number = trackingNumber.trim();
    }

    setSubmitting(true);
    try {
      const res = await api.post('/returns', payload);
      const createdReturn = res.data?.data;
      if (createdReturn?.return_id) {
        navigate(`/returns/${createdReturn.return_id}`);
      } else {
        navigate('/returns');
      }
    } catch (err) {
      const errorsList = err.response?.data?.errors;
      if (Array.isArray(errorsList) && errorsList.length > 0) {
        const errorMap = {};
        errorsList.forEach((eItem) => {
          if (eItem.field) {
            errorMap[eItem.field] = eItem.message;
          }
        });
        setFieldErrors(errorMap);
      }
      setGeneralError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="page-new-return" style={{ maxWidth: '720px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link to="/returns" style={{ color: '#1a237e', textDecoration: 'none', fontSize: '0.9rem' }}>
          ← Back to Returns
        </Link>
        <h1 style={{ marginTop: '0.5rem' }}>Intake New Return</h1>
        <p style={{ color: '#666', margin: 0 }}>
          Record an incoming returned electronic item for evaluation and disposition.
        </p>
      </div>

      {generalError && (
        <div className="error-banner" role="alert">
          <div>
            <strong>Error:</strong> {generalError}
          </div>
          {loadingData && (
            <button type="button" className="retry-btn" onClick={loadData}>
              Retry
            </button>
          )}
        </div>
      )}

      {loadingData ? (
        <div className="loading-container">
          <div className="spinner" />
          <span>Loading intake catalog and warehouse configurations...</span>
        </div>
      ) : products.length === 0 ? (
        <div className="empty-state-card">
          <div className="empty-state-icon">📱</div>
          <h3 className="empty-state-title">No products available</h3>
          <p className="empty-state-desc">
            No products are registered in the catalog yet. An administrator must create catalog products before returns can be received.
          </p>
          <Link to="/returns" className="btn-secondary" style={{ textDecoration: 'none', marginTop: '0.5rem' }}>
            Back to Returns
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="form-card">
          {/* Product selector */}
          <div className="form-group">
            <label htmlFor="product-select">
              Product <span className="required-star">*</span>
            </label>
            <div style={{ marginBottom: '0.5rem' }}>
              <input
                type="text"
                placeholder="Filter products by brand, model or SKU..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                disabled={submitting}
                className="filter-input"
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>
            <select
              id="product-select"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              disabled={submitting}
              className="form-control"
              required
            >
              {filteredProducts.length === 0 ? (
                <option value="" disabled>No products match your search</option>
              ) : (
                filteredProducts.map((p) => (
                  <option key={p.product_id} value={p.product_id}>
                    {p.brand} {p.model_name} ({p.sku}) — ₹{Number(p.retail_price).toLocaleString()}
                  </option>
                ))
              )}
            </select>
            {fieldErrors.product_id && (
              <span className="field-error">{fieldErrors.product_id}</span>
            )}
          </div>

          {/* Warehouse selector */}
          <div className="form-group">
            <label htmlFor="warehouse-select">
              Intake Warehouse <span className="required-star">*</span>
            </label>
            <select
              id="warehouse-select"
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              disabled={isInspector || submitting}
              className="form-control"
              required
            >
              {warehouses.map((wh) => (
                <option key={wh.warehouse_id} value={wh.warehouse_id}>
                  {wh.warehouse_code} — {wh.facility_name} ({wh.city})
                </option>
              ))}
            </select>
            {isInspector && (
              <span className="field-hint">
                Inspectors are fixed to their assigned facility.
              </span>
            )}
            {fieldErrors.warehouse_id && (
              <span className="field-error">{fieldErrors.warehouse_id}</span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {/* Serial number */}
            <div className="form-group">
              <label htmlFor="serial-number">Serial Number</label>
              <input
                id="serial-number"
                type="text"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                disabled={submitting}
                placeholder="e.g. F2LXK9ABCD12"
                className="form-control"
              />
              {fieldErrors.serial_number && (
                <span className="field-error">{fieldErrors.serial_number}</span>
              )}
            </div>

            {/* Tracking number (optional) */}
            <div className="form-group">
              <label htmlFor="tracking-number">Tracking Number (Optional)</label>
              <input
                id="tracking-number"
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                disabled={submitting}
                placeholder="Auto-generated if left blank"
                className="form-control"
              />
              {fieldErrors.return_tracking_number && (
                <span className="field-error">{fieldErrors.return_tracking_number}</span>
              )}
            </div>
          </div>

          {/* Return Date */}
          <div className="form-group">
            <label htmlFor="return-date">Return Date</label>
            <input
              id="return-date"
              type="date"
              value={returnDate}
              max={todayStr}
              onChange={(e) => setReturnDate(e.target.value)}
              disabled={submitting}
              className="form-control"
            />
            {fieldErrors.return_date && (
              <span className="field-error">{fieldErrors.return_date}</span>
            )}
          </div>

          {/* Return reason (required) */}
          <div className="form-group">
            <label htmlFor="return-reason">
              Return Reason <span className="required-star">*</span>
            </label>
            <input
              id="return-reason"
              type="text"
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              disabled={submitting}
              placeholder="e.g. Screen flickering, Battery drain, Customer remorse"
              className="form-control"
              required
            />
            {fieldErrors.return_reason && (
              <span className="field-error">{fieldErrors.return_reason}</span>
            )}
          </div>

          {/* Customer comment */}
          <div className="form-group">
            <label htmlFor="customer-comment">Customer Comment</label>
            <textarea
              id="customer-comment"
              rows={3}
              value={customerComment}
              onChange={(e) => setCustomerComment(e.target.value)}
              disabled={submitting}
              placeholder="Additional feedback or condition reported by the customer..."
              className="form-control"
            />
            {fieldErrors.customer_comment && (
              <span className="field-error">{fieldErrors.customer_comment}</span>
            )}
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => navigate('/returns')}
              disabled={submitting}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || (filteredProducts.length === 0 && !productId)}
              className="btn-primary"
            >
              {submitting ? 'Creating Return...' : 'Create Return'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
