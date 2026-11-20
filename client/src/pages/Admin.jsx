import React, { useState, useEffect } from 'react';
import api, { getApiErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function Admin() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('products'); // 'products' | 'warehouses' | 'operators'

  // Data states
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [operators, setOperators] = useState([]);

  // Loading & error states
  const [loading, setLoading] = useState(false);
  const [pageError, setPageError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Modals / forms states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null); // object being edited
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  // Product form state
  const initialProductForm = {
    sku: '',
    brand: '',
    model_name: '',
    category: '',
    retail_price: '',
  };
  const [productForm, setProductForm] = useState(initialProductForm);

  // Warehouse form state
  const initialWarehouseForm = {
    warehouse_code: '',
    facility_name: '',
    city: '',
    state: '',
    capacity: '',
  };
  const [warehouseForm, setWarehouseForm] = useState(initialWarehouseForm);

  // Operator form state
  const initialOperatorForm = {
    employee_code: '',
    full_name: '',
    email: '',
    role: '',
    app_role: 'INSPECTOR',
    warehouse_id: '',
    password: '',
    is_active: true,
  };
  const [operatorForm, setOperatorForm] = useState(initialOperatorForm);

  // Fetch data
  const fetchData = async () => {
    setLoading(true);
    setPageError('');
    try {
      // Load all three lists together so every tab label shows its real count
      // (they're small; loading only the active tab made the others show 0).
      const [prodRes, whRes, opRes] = await Promise.all([
        api.get('/products'),
        api.get('/warehouses'),
        api.get('/operators'),
      ]);
      setProducts(prodRes.data.data || []);
      setWarehouses(whRes.data.data || []);
      setOperators(opRes.data.data || []);
    } catch (err) {
      setPageError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    setShowCreateModal(false);
    setEditingItem(null);
    setFormError('');
    setFieldErrors({});
    setActionSuccess('');
  }, [activeTab]);

  const parseServerErrors = (err) => {
    const data = err.response?.data;
    if (data?.errors && Array.isArray(data.errors)) {
      const mapped = {};
      data.errors.forEach((e) => {
        if (e.field) mapped[e.field] = e.message;
      });
      setFieldErrors(mapped);
    } else {
      setFieldErrors({});
    }
    setFormError(getApiErrorMessage(err));
  };

  // --- Handlers: Product ---
  const handleOpenCreateProduct = () => {
    setProductForm(initialProductForm);
    setFormError('');
    setFieldErrors({});
    setShowCreateModal(true);
  };

  const handleOpenEditProduct = (prod) => {
    setEditingItem(prod);
    setProductForm({
      sku: prod.sku,
      brand: prod.brand,
      model_name: prod.model_name,
      category: prod.category,
      retail_price: prod.retail_price,
    });
    setFormError('');
    setFieldErrors({});
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError('');
    setFieldErrors({});

    const payload = {
      sku: productForm.sku.trim(),
      brand: productForm.brand.trim(),
      model_name: productForm.model_name.trim(),
      category: productForm.category.trim(),
      retail_price: Number(productForm.retail_price),
    };

    try {
      if (editingItem) {
        await api.patch(`/products/${editingItem.product_id}`, payload);
        setActionSuccess(`Product "${payload.model_name}" updated successfully.`);
        setEditingItem(null);
      } else {
        await api.post('/products', payload);
        setActionSuccess(`Product "${payload.model_name}" created successfully.`);
        setShowCreateModal(false);
      }
      await fetchData();
    } catch (err) {
      parseServerErrors(err);
    } finally {
      setFormSubmitting(false);
    }
  };

  // --- Handlers: Warehouse ---
  const handleOpenCreateWarehouse = () => {
    setWarehouseForm(initialWarehouseForm);
    setFormError('');
    setFieldErrors({});
    setShowCreateModal(true);
  };

  const handleOpenEditWarehouse = (wh) => {
    setEditingItem(wh);
    setWarehouseForm({
      warehouse_code: wh.warehouse_code,
      facility_name: wh.facility_name,
      city: wh.city,
      state: wh.state,
      capacity: wh.capacity,
    });
    setFormError('');
    setFieldErrors({});
  };

  const handleSaveWarehouse = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError('');
    setFieldErrors({});

    const payload = {
      warehouse_code: warehouseForm.warehouse_code.trim(),
      facility_name: warehouseForm.facility_name.trim(),
      city: warehouseForm.city.trim(),
      state: warehouseForm.state.trim(),
      capacity: Number(warehouseForm.capacity),
    };

    try {
      if (editingItem) {
        await api.patch(`/warehouses/${editingItem.warehouse_id}`, payload);
        setActionSuccess(`Warehouse "${payload.facility_name}" updated successfully.`);
        setEditingItem(null);
      } else {
        await api.post('/warehouses', payload);
        setActionSuccess(`Warehouse "${payload.facility_name}" created successfully.`);
        setShowCreateModal(false);
      }
      await fetchData();
    } catch (err) {
      parseServerErrors(err);
    } finally {
      setFormSubmitting(false);
    }
  };

  // --- Handlers: Operator ---
  const handleOpenCreateOperator = () => {
    setOperatorForm({
      ...initialOperatorForm,
      warehouse_id: warehouses.length > 0 ? warehouses[0].warehouse_id : '',
    });
    setFormError('');
    setFieldErrors({});
    setShowCreateModal(true);
  };

  const handleOpenEditOperator = (op) => {
    setEditingItem(op);
    setOperatorForm({
      employee_code: op.employee_code,
      full_name: op.full_name,
      email: op.email,
      role: op.role,
      app_role: op.app_role,
      warehouse_id: op.warehouse_id,
      password: '',
      is_active: op.is_active,
    });
    setFormError('');
    setFieldErrors({});
  };

  const handleSaveOperator = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError('');
    setFieldErrors({});

    try {
      if (editingItem) {
        const payload = {
          full_name: operatorForm.full_name.trim(),
          role: operatorForm.role.trim(),
          app_role: operatorForm.app_role,
          warehouse_id: Number(operatorForm.warehouse_id),
          is_active: Boolean(operatorForm.is_active),
        };
        if (operatorForm.password && operatorForm.password.trim()) {
          payload.password = operatorForm.password.trim();
        }
        await api.patch(`/operators/${editingItem.operator_id}`, payload);
        setActionSuccess(`Operator "${payload.full_name}" updated successfully.`);
        setEditingItem(null);
      } else {
        const payload = {
          employee_code: operatorForm.employee_code.trim(),
          full_name: operatorForm.full_name.trim(),
          email: operatorForm.email.trim(),
          role: operatorForm.role.trim(),
          app_role: operatorForm.app_role,
          warehouse_id: Number(operatorForm.warehouse_id),
          password: operatorForm.password,
        };
        await api.post('/operators', payload);
        setActionSuccess(`Operator "${payload.full_name}" created successfully.`);
        setShowCreateModal(false);
      }
      await fetchData();
    } catch (err) {
      parseServerErrors(err);
    } finally {
      setFormSubmitting(false);
    }
  };

  // Format currency
  const formatCurrency = (val) => {
    if (val === null || val === undefined) return '—';
    return `₹${Number(val).toLocaleString('en-IN')}`;
  };

  // Helper for warehouse name
  const getWarehouseName = (whId) => {
    const wh = warehouses.find((w) => w.warehouse_id === Number(whId));
    return wh ? `${wh.warehouse_code} (${wh.facility_name})` : `WH #${whId}`;
  };

  return (
    <div className="page-admin">
      <div className="page-head">
        <div className="page-head-text">
          <h1>Admin</h1>
          <p className="page-sub">The product catalog, warehouses, and who can sign in.</p>
        </div>
        <div className="page-actions">
          {activeTab === 'products' && (
            <button className="btn-primary" onClick={handleOpenCreateProduct}>
              Add product
            </button>
          )}
          {activeTab === 'warehouses' && (
            <button className="btn-primary" onClick={handleOpenCreateWarehouse}>
              Add warehouse
            </button>
          )}
          {activeTab === 'operators' && (
            <button className="btn-primary" onClick={handleOpenCreateOperator}>
              Add operator
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'products'}
          className={`tab-btn ${activeTab === 'products' ? 'active' : ''}`}
          onClick={() => setActiveTab('products')}
        >
          Products <span className="tab-count">{products.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'warehouses'}
          className={`tab-btn ${activeTab === 'warehouses' ? 'active' : ''}`}
          onClick={() => setActiveTab('warehouses')}
        >
          Warehouses <span className="tab-count">{warehouses.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'operators'}
          className={`tab-btn ${activeTab === 'operators' ? 'active' : ''}`}
          onClick={() => setActiveTab('operators')}
        >
          Operators <span className="tab-count">{operators.length}</span>
        </button>
      </div>

      {actionSuccess && (
        <div className="alert success" role="status">
          <span>{actionSuccess}</span>
          <button type="button" className="close-alert-btn" aria-label="Dismiss" onClick={() => setActionSuccess('')}>
            ×
          </button>
        </div>
      )}

      {pageError && (
        <div className="error-banner" role="alert">
          <div>
            <strong>Couldn't load admin data.</strong> {pageError}
          </div>
          <button type="button" className="retry-btn" onClick={fetchData}>
            Retry
          </button>
        </div>
      )}

      {/* Main Tab Content */}
      {loading ? (
        <div className="panel loading-container">
          <div className="spinner" />
          <span>Loading {activeTab}…</span>
        </div>
      ) : (
        <>
          {/* TAB: PRODUCTS */}
          {activeTab === 'products' && (
            <div className="table-panel">
              <table className="data-table stack">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>SKU</th>
                    <th>Brand</th>
                    <th>Model</th>
                    <th>Category</th>
                    <th className="num">Retail price</th>
                    <th className="num"><span className="visually-hidden">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {products.length === 0 ? (
                    <tr className="empty-row">
                      <td colSpan="7">
                        <div className="empty-state-card">
                          <h3 className="empty-state-title">No products yet</h3>
                          <p className="empty-state-desc">Returns can only be recorded against catalog products. Add the first one.</p>
                          <button
                            type="button"
                            className="btn-primary"
                            onClick={handleOpenCreateProduct}
                          >
                            Add product
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    products.map((p) => (
                      <tr key={p.product_id}>
                        <td data-label="ID" className="muted">#{p.product_id}</td>
                        <td data-label="SKU" className="code">{p.sku}</td>
                        <td data-label="Brand">{p.brand}</td>
                        <td data-label="Model" className="cell-strong">{p.model_name}</td>
                        <td data-label="Category">
                          <span className="category-pill">{p.category}</span>
                        </td>
                        <td data-label="Retail price" className="num cell-strong">
                          {formatCurrency(p.retail_price)}
                        </td>
                        <td className="num no-label">
                          <button
                            className="btn-secondary btn-sm"
                            onClick={() => handleOpenEditProduct(p)}
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB: WAREHOUSES */}
          {activeTab === 'warehouses' && (
            <div className="table-panel">
              <table className="data-table stack">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Code</th>
                    <th>Facility</th>
                    <th>City</th>
                    <th>State</th>
                    <th className="num">Capacity</th>
                    <th className="num"><span className="visually-hidden">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {warehouses.length === 0 ? (
                    <tr className="empty-row">
                      <td colSpan="7">
                        <div className="empty-state-card">
                          <h3 className="empty-state-title">No warehouses yet</h3>
                          <p className="empty-state-desc">Add a warehouse so returns and operators can be assigned to it.</p>
                          <button
                            type="button"
                            className="btn-primary"
                            onClick={handleOpenCreateWarehouse}
                          >
                            Add warehouse
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    warehouses.map((wh) => (
                      <tr key={wh.warehouse_id}>
                        <td data-label="ID" className="muted">#{wh.warehouse_id}</td>
                        <td data-label="Code" className="code">{wh.warehouse_code}</td>
                        <td data-label="Facility" className="cell-strong">{wh.facility_name}</td>
                        <td data-label="City">{wh.city}</td>
                        <td data-label="State">{wh.state}</td>
                        <td data-label="Capacity" className="num">
                          {Number(wh.capacity).toLocaleString()} units
                        </td>
                        <td className="num no-label">
                          <button
                            className="btn-secondary btn-sm"
                            onClick={() => handleOpenEditWarehouse(wh)}
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB: OPERATORS */}
          {activeTab === 'operators' && (
            <div className="table-panel">
              <table className="data-table stack">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Code</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Job title</th>
                    <th>Access</th>
                    <th>Warehouse</th>
                    <th>Status</th>
                    <th className="num"><span className="visually-hidden">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {operators.length === 0 ? (
                    <tr className="empty-row">
                      <td colSpan="9">
                        <div className="empty-state-card">
                          <h3 className="empty-state-title">No operators yet</h3>
                          <p className="empty-state-desc">Add an operator so someone can sign in.</p>
                          <button
                            type="button"
                            className="btn-primary"
                            onClick={handleOpenCreateOperator}
                          >
                            Add operator
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    operators.map((op) => (
                      <tr key={op.operator_id}>
                        <td data-label="ID" className="muted">#{op.operator_id}</td>
                        <td data-label="Code" className="code">{op.employee_code}</td>
                        <td data-label="Name" className="cell-strong">
                          {op.full_name}
                          {user?.operator_id === op.operator_id && (
                            <span className="current-user-tag"> (You)</span>
                          )}
                        </td>
                        <td data-label="Email">{op.email}</td>
                        <td data-label="Job title">{op.role}</td>
                        <td data-label="Access">
                          <span className={`role-badge ${op.app_role}`}>
                            {op.app_role}
                          </span>
                        </td>
                        <td data-label="Warehouse">{getWarehouseName(op.warehouse_id)}</td>
                        <td data-label="Status">
                          <span className={`status-tag ${op.is_active ? 'active' : 'inactive'}`}>
                            {op.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="num no-label">
                          <button
                            className="btn-secondary btn-sm"
                            onClick={() => handleOpenEditOperator(op)}
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* PRODUCT MODAL (Create / Edit) */}
      {(showCreateModal || editingItem) && activeTab === 'products' && (
        <div className="modal-backdrop">
          <div className="modal-box">
            <div className="modal-header">
              <h2>{editingItem ? 'Edit product' : 'Add product'}</h2>
              <button
                type="button"
                aria-label="Close"
                className="modal-close-btn"
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingItem(null);
                }}
              >
                ×
              </button>
            </div>
            {formError && <div className="alert error" role="alert">{formError}</div>}
            <form onSubmit={handleSaveProduct}>
              <div className="form-group">
                <label htmlFor="adm-sku">SKU <span className="required-star">*</span></label>
                <input id="adm-sku"
                  type="text"
                  required
                  disabled={formSubmitting}
                  placeholder="e.g. SAM-S24-256-BLK"
                  value={productForm.sku}
                  onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                />
                {fieldErrors.sku && <span className="field-error">{fieldErrors.sku}</span>}
              </div>

              <div className="field-row">
                <div className="form-group">
                  <label htmlFor="adm-brand">Brand <span className="required-star">*</span></label>
                  <input id="adm-brand"
                    type="text"
                    required
                    disabled={formSubmitting}
                    placeholder="e.g. Samsung"
                    value={productForm.brand}
                    onChange={(e) => setProductForm({ ...productForm, brand: e.target.value })}
                  />
                  {fieldErrors.brand && <span className="field-error">{fieldErrors.brand}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="adm-category">Category <span className="required-star">*</span></label>
                  <input id="adm-category"
                    type="text"
                    required
                    disabled={formSubmitting}
                    placeholder="e.g. Smartphone"
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                  />
                  {fieldErrors.category && (
                    <span className="field-error">{fieldErrors.category}</span>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="adm-model-name">Model name <span className="required-star">*</span></label>
                <input id="adm-model-name"
                  type="text"
                  required
                  disabled={formSubmitting}
                  placeholder="e.g. Galaxy S24 Ultra"
                  value={productForm.model_name}
                  onChange={(e) => setProductForm({ ...productForm, model_name: e.target.value })}
                />
                {fieldErrors.model_name && (
                  <span className="field-error">{fieldErrors.model_name}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="adm-retail-price">Retail price (₹) <span className="required-star">*</span></label>
                <input id="adm-retail-price"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  disabled={formSubmitting}
                  placeholder="e.g. 129999.00"
                  value={productForm.retail_price}
                  onChange={(e) =>
                    setProductForm({ ...productForm, retail_price: e.target.value })
                  }
                />
                {fieldErrors.retail_price && (
                  <span className="field-error">{fieldErrors.retail_price}</span>
                )}
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingItem(null);
                  }}
                  disabled={formSubmitting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={formSubmitting}>
                  {formSubmitting
                    ? 'Saving…'
                    : editingItem
                    ? 'Save product'
                    : 'Add product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WAREHOUSE MODAL (Create / Edit) */}
      {(showCreateModal || editingItem) && activeTab === 'warehouses' && (
        <div className="modal-backdrop">
          <div className="modal-box">
            <div className="modal-header">
              <h2>{editingItem ? 'Edit warehouse' : 'Add warehouse'}</h2>
              <button
                type="button"
                aria-label="Close"
                className="modal-close-btn"
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingItem(null);
                }}
              >
                ×
              </button>
            </div>
            {formError && <div className="alert error" role="alert">{formError}</div>}
            <form onSubmit={handleSaveWarehouse}>
              <div className="form-group">
                <label htmlFor="adm-warehouse-code">Warehouse code <span className="required-star">*</span></label>
                <input id="adm-warehouse-code"
                  type="text"
                  required
                  disabled={formSubmitting}
                  placeholder="e.g. WH-KOL-01"
                  value={warehouseForm.warehouse_code}
                  onChange={(e) =>
                    setWarehouseForm({ ...warehouseForm, warehouse_code: e.target.value })
                  }
                />
                {fieldErrors.warehouse_code && (
                  <span className="field-error">{fieldErrors.warehouse_code}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="adm-facility-name">Facility name <span className="required-star">*</span></label>
                <input id="adm-facility-name"
                  type="text"
                  required
                  disabled={formSubmitting}
                  placeholder="e.g. Kolkata Sorting Center"
                  value={warehouseForm.facility_name}
                  onChange={(e) =>
                    setWarehouseForm({ ...warehouseForm, facility_name: e.target.value })
                  }
                />
                {fieldErrors.facility_name && (
                  <span className="field-error">{fieldErrors.facility_name}</span>
                )}
              </div>

              <div className="field-row">
                <div className="form-group">
                  <label htmlFor="adm-city">City <span className="required-star">*</span></label>
                  <input id="adm-city"
                    type="text"
                    required
                    disabled={formSubmitting}
                    placeholder="e.g. Kolkata"
                    value={warehouseForm.city}
                    onChange={(e) =>
                      setWarehouseForm({ ...warehouseForm, city: e.target.value })
                    }
                  />
                  {fieldErrors.city && <span className="field-error">{fieldErrors.city}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="adm-state">State <span className="required-star">*</span></label>
                  <input id="adm-state"
                    type="text"
                    required
                    disabled={formSubmitting}
                    placeholder="e.g. West Bengal"
                    value={warehouseForm.state}
                    onChange={(e) =>
                      setWarehouseForm({ ...warehouseForm, state: e.target.value })
                    }
                  />
                  {fieldErrors.state && <span className="field-error">{fieldErrors.state}</span>}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="adm-capacity-units">Capacity (units) <span className="required-star">*</span></label>
                <input id="adm-capacity-units"
                  type="number"
                  min="1"
                  step="1"
                  required
                  disabled={formSubmitting}
                  placeholder="e.g. 5000"
                  value={warehouseForm.capacity}
                  onChange={(e) =>
                    setWarehouseForm({ ...warehouseForm, capacity: e.target.value })
                  }
                />
                {fieldErrors.capacity && (
                  <span className="field-error">{fieldErrors.capacity}</span>
                )}
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingItem(null);
                  }}
                  disabled={formSubmitting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={formSubmitting}>
                  {formSubmitting
                    ? 'Saving…'
                    : editingItem
                    ? 'Save warehouse'
                    : 'Add warehouse'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OPERATOR MODAL (Create / Edit) */}
      {(showCreateModal || editingItem) && activeTab === 'operators' && (
        <div className="modal-backdrop">
          <div className="modal-box">
            <div className="modal-header">
              <h2>{editingItem ? 'Edit operator' : 'Add operator'}</h2>
              <button
                type="button"
                aria-label="Close"
                className="modal-close-btn"
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingItem(null);
                }}
              >
                ×
              </button>
            </div>
            {formError && <div className="alert error" role="alert">{formError}</div>}
            <form onSubmit={handleSaveOperator}>
              {!editingItem && (
                <div className="form-group">
                  <label htmlFor="adm-employee-code">Employee code <span className="required-star">*</span></label>
                  <input id="adm-employee-code"
                    type="text"
                    required
                    disabled={formSubmitting}
                    placeholder="e.g. OP-107"
                    value={operatorForm.employee_code}
                    onChange={(e) =>
                      setOperatorForm({ ...operatorForm, employee_code: e.target.value })
                    }
                  />
                  {fieldErrors.employee_code && (
                    <span className="field-error">{fieldErrors.employee_code}</span>
                  )}
                </div>
              )}

              <div className="field-row">
                <div className="form-group">
                  <label htmlFor="adm-full-name">Full name <span className="required-star">*</span></label>
                  <input id="adm-full-name"
                    type="text"
                    required
                    disabled={formSubmitting}
                    placeholder="e.g. Priya Sharma"
                    value={operatorForm.full_name}
                    onChange={(e) =>
                      setOperatorForm({ ...operatorForm, full_name: e.target.value })
                    }
                  />
                  {fieldErrors.full_name && (
                    <span className="field-error">{fieldErrors.full_name}</span>
                  )}
                </div>
                {!editingItem ? (
                  <div className="form-group">
                    <label htmlFor="adm-email">Email <span className="required-star">*</span></label>
                    <input id="adm-email"
                      type="email"
                      required
                      disabled={formSubmitting}
                      placeholder="e.g. priya.sharma@returnloop.internal"
                      value={operatorForm.email}
                      onChange={(e) =>
                        setOperatorForm({ ...operatorForm, email: e.target.value })
                      }
                    />
                    {fieldErrors.email && (
                      <span className="field-error">{fieldErrors.email}</span>
                    )}
                  </div>
                ) : (
                  <div className="form-group">
                    <label htmlFor="adm-email-2">Email</label>
                    <input id="adm-email-2" type="email" disabled value={operatorForm.email} />
                  </div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="adm-job-title">Job title <span className="required-star">*</span></label>
                <input id="adm-job-title"
                  type="text"
                  required
                  disabled={formSubmitting}
                  placeholder="e.g. Reverse Logistics Specialist"
                  value={operatorForm.role}
                  onChange={(e) => setOperatorForm({ ...operatorForm, role: e.target.value })}
                />
                {fieldErrors.role && <span className="field-error">{fieldErrors.role}</span>}
              </div>

              <div className="field-row">
                <div className="form-group">
                  <label htmlFor="adm-access-level">Access level <span className="required-star">*</span></label>
                  <select id="adm-access-level"
                    value={operatorForm.app_role}
                    disabled={formSubmitting}
                    onChange={(e) =>
                      setOperatorForm({ ...operatorForm, app_role: e.target.value })
                    }
                  >
                    <option value="INSPECTOR">INSPECTOR</option>
                    <option value="SUPERVISOR">SUPERVISOR</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                  {fieldErrors.app_role && (
                    <span className="field-error">{fieldErrors.app_role}</span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="adm-warehouse">Warehouse <span className="required-star">*</span></label>
                  <select id="adm-warehouse"
                    value={operatorForm.warehouse_id}
                    required
                    disabled={formSubmitting}
                    onChange={(e) =>
                      setOperatorForm({ ...operatorForm, warehouse_id: e.target.value })
                    }
                  >
                    <option value="" disabled>
                      Select warehouse
                    </option>
                    {warehouses.map((wh) => (
                      <option key={wh.warehouse_id} value={wh.warehouse_id}>
                        {wh.warehouse_code} — {wh.facility_name} ({wh.city})
                      </option>
                    ))}
                  </select>
                  {fieldErrors.warehouse_id && (
                    <span className="field-error">{fieldErrors.warehouse_id}</span>
                  )}
                </div>
              </div>

              {editingItem && (
                <div className="form-group">
                  <label htmlFor="adm-status">Status <span className="required-star">*</span></label>
                  <select id="adm-status"
                    value={operatorForm.is_active ? 'true' : 'false'}
                    disabled={formSubmitting}
                    onChange={(e) =>
                      setOperatorForm({
                        ...operatorForm,
                        is_active: e.target.value === 'true',
                      })
                    }
                  >
                    <option value="true">Active (can sign in)</option>
                    <option value="false">Inactive (sign-in blocked)</option>
                  </select>
                  {fieldErrors.is_active && (
                    <span className="field-error">{fieldErrors.is_active}</span>
                  )}
                </div>
              )}

              <div className="form-group">
                <label htmlFor="adm-password">
                  {editingItem ? 'New password (optional)' : 'Password *'}
                </label>
                <input
                  id="adm-password"
                  type="password"
                  required={!editingItem}
                  disabled={formSubmitting}
                  placeholder={
                    editingItem
                      ? 'Leave blank to keep unchanged (min 8 chars if resetting)'
                      : 'Min 8 characters'
                  }
                  value={operatorForm.password}
                  onChange={(e) =>
                    setOperatorForm({ ...operatorForm, password: e.target.value })
                  }
                />
                {fieldErrors.password && (
                  <span className="field-error">{fieldErrors.password}</span>
                )}
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingItem(null);
                  }}
                  disabled={formSubmitting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={formSubmitting}>
                  {formSubmitting
                    ? 'Saving…'
                    : editingItem
                    ? 'Save operator'
                    : 'Add operator'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
