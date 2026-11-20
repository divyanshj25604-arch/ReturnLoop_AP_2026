import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api, { getApiErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { todayLocalIso } from '../utils/format';

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
  const [returnDate, setReturnDate] = useState(() => todayLocalIso());
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

  const todayStr = todayLocalIso();

  return (
    <div className="page-new-return narrow-page">
      <Link to="/returns" className="back-link">
        ← Returns
      </Link>
      <div className="page-head">
        <div className="page-head-text">
          <h1>New return</h1>
          <p className="page-sub">
            Record a device that has arrived at the warehouse. It starts as Received, ready for inspection.
          </p>
        </div>
      </div>

      {generalError && (
        <div className="error-banner" role="alert">
          <div>
            <strong>Couldn't save.</strong> {generalError}
          </div>
          {loadingData && (
            <button type="button" className="retry-btn" onClick={loadData}>
              Retry
            </button>
          )}
        </div>
      )}

      {loadingData ? (
        <div className="panel loading-container">
          <div className="spinner" />
          <span>Loading products and warehouses…</span>
        </div>
      ) : products.length === 0 ? (
        <div className="empty-state-card boxed">
          <h3 className="empty-state-title">No products in the catalog</h3>
          <p className="empty-state-desc">
            An administrator needs to add products before returns can be recorded.
          </p>
          <Link to="/returns" className="btn-secondary">
            Back to returns
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="panel">
          {/* Product selector */}
          <div className="form-group">
            <label htmlFor="product-select">
              Product <span className="required-star">*</span>
            </label>
            <input
              type="search"
              aria-label="Filter products"
              placeholder="Filter by brand, model or SKU"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              disabled={submitting}
              className="filter-input"
            />
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
              Warehouse <span className="required-star">*</span>
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
                Inspectors record returns at their own warehouse.
              </span>
            )}
            {fieldErrors.warehouse_id && (
              <span className="field-error">{fieldErrors.warehouse_id}</span>
            )}
          </div>

          <div className="field-row">
            {/* Serial number */}
            <div className="form-group">
              <label htmlFor="serial-number">Serial number</label>
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
              <label htmlFor="tracking-number">Tracking number</label>
              <input
                id="tracking-number"
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                disabled={submitting}
                placeholder="Leave blank to generate one"
                className="form-control"
              />
              {fieldErrors.return_tracking_number && (
                <span className="field-error">{fieldErrors.return_tracking_number}</span>
              )}
            </div>
          </div>

          {/* Return Date */}
          <div className="form-group">
            <label htmlFor="return-date">Return date</label>
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
              Return reason <span className="required-star">*</span>
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
            <label htmlFor="customer-comment">Customer comment</label>
            <textarea
              id="customer-comment"
              rows={3}
              value={customerComment}
              onChange={(e) => setCustomerComment(e.target.value)}
              disabled={submitting}
              placeholder="What the customer said about the device"
              className="form-control"
            />
            {fieldErrors.customer_comment && (
              <span className="field-error">{fieldErrors.customer_comment}</span>
            )}
          </div>

          {/* Buttons */}
          <div className="form-actions">
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
              {submitting ? 'Recording return…' : 'Record return'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
