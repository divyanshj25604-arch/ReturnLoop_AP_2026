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
      if (activeTab === 'products') {
        const res = await api.get('/products');
        setProducts(res.data.data || []);
      } else if (activeTab === 'warehouses') {
        const res = await api.get('/warehouses');
        setWarehouses(res.data.data || []);
      } else if (activeTab === 'operators') {
        const [opRes, whRes] = await Promise.all([
          api.get('/operators'),
          api.get('/warehouses'),
        ]);
        setOperators(opRes.data.data || []);
        setWarehouses(whRes.data.data || []);
      }
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
      <div className="admin-header">
        <div>
          <h1>Administration</h1>
          <p className="admin-subtitle">Manage catalog products, logistics warehouses, and operator accounts.</p>
        </div>
        <div className="admin-actions">
          {activeTab === 'products' && (
            <button className="primary-btn" onClick={handleOpenCreateProduct}>
              + New Product
            </button>
          )}
          {activeTab === 'warehouses' && (
            <button className="primary-btn" onClick={handleOpenCreateWarehouse}>
              + New Warehouse
            </button>
          )}
          {activeTab === 'operators' && (
            <button className="primary-btn" onClick={handleOpenCreateOperator}>
              + New Operator
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="admin-tabs">
        <button
          className={`admin-tab-btn ${activeTab === 'products' ? 'active' : ''}`}
          onClick={() => setActiveTab('products')}
        >
          Products ({products.length})
        </button>
        <button
          className={`admin-tab-btn ${activeTab === 'warehouses' ? 'active' : ''}`}
          onClick={() => setActiveTab('warehouses')}
        >
          Warehouses ({warehouses.length})
        </button>
        <button
          className={`admin-tab-btn ${activeTab === 'operators' ? 'active' : ''}`}
          onClick={() => setActiveTab('operators')}
        >
          Operators ({operators.length})
        </button>
      </div>

      {actionSuccess && (
        <div className="admin-alert success" style={{ marginBottom: '1.25rem' }}>
          <span>{actionSuccess}</span>
          <button className="close-alert-btn" onClick={() => setActionSuccess('')}>
            ×
          </button>
        </div>
      )}

      {pageError && (
        <div className="admin-alert error" style={{ marginBottom: '1.25rem' }}>
          <span>{pageError}</span>
          <button className="close-alert-btn" onClick={() => setPageError('')}>
            ×
          </button>
        </div>
      )}

      {/* Main Tab Content */}
      {loading ? (
        <div className="admin-loading-card">
          <p>Loading {activeTab} data...</p>
        </div>
      ) : (
        <>
          {/* TAB: PRODUCTS */}
          {activeTab === 'products' && (
            <div className="admin-table-card">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>SKU</th>
                    <th>Brand</th>
                    <th>Model</th>
                    <th>Category</th>
                    <th style={{ textAlign: 'right' }}>Retail Price</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>
                        No products found.
                      </td>
                    </tr>
                  ) : (
                    products.map((p) => (
                      <tr key={p.product_id}>
                        <td>#{p.product_id}</td>
                        <td className="sku-cell">{p.sku}</td>
                        <td>{p.brand}</td>
                        <td style={{ fontWeight: 600 }}>{p.model_name}</td>
                        <td>
                          <span className="category-pill">{p.category}</span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>
                          {formatCurrency(p.retail_price)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            className="admin-edit-btn"
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
            <div className="admin-table-card">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Code</th>
                    <th>Facility Name</th>
                    <th>City</th>
                    <th>State</th>
                    <th style={{ textAlign: 'right' }}>Capacity</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {warehouses.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>
                        No warehouses found.
                      </td>
                    </tr>
                  ) : (
                    warehouses.map((wh) => (
                      <tr key={wh.warehouse_id}>
                        <td>#{wh.warehouse_id}</td>
                        <td className="sku-cell">{wh.warehouse_code}</td>
                        <td style={{ fontWeight: 600 }}>{wh.facility_name}</td>
                        <td>{wh.city}</td>
                        <td>{wh.state}</td>
                        <td style={{ textAlign: 'right' }}>
                          {Number(wh.capacity).toLocaleString()} units
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            className="admin-edit-btn"
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
            <div className="admin-table-card">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Code</th>
                    <th>Full Name</th>
                    <th>Email</th>
                    <th>Job Title</th>
                    <th>App Role</th>
                    <th>Warehouse</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {operators.length === 0 ? (
                    <tr>
                      <td colSpan="9" style={{ textAlign: 'center', padding: '2rem' }}>
                        No operators found.
                      </td>
                    </tr>
                  ) : (
                    operators.map((op) => (
                      <tr key={op.operator_id}>
                        <td>#{op.operator_id}</td>
                        <td className="sku-cell">{op.employee_code}</td>
                        <td style={{ fontWeight: 600 }}>
                          {op.full_name}
                          {user?.operator_id === op.operator_id && (
                            <span className="current-user-tag"> (You)</span>
                          )}
                        </td>
                        <td>{op.email}</td>
                        <td>{op.role}</td>
                        <td>
                          <span className={`role-badge ${op.app_role}`}>
                            {op.app_role}
                          </span>
                        </td>
                        <td>{getWarehouseName(op.warehouse_id)}</td>
                        <td>
                          <span className={`status-badge ${op.is_active ? 'active' : 'inactive'}`}>
                            {op.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            className="admin-edit-btn"
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
              <h2>{editingItem ? 'Edit Product' : 'New Product'}</h2>
              <button
                className="modal-close-btn"
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingItem(null);
                }}
              >
                ×
              </button>
            </div>
            {formError && <div className="admin-alert error">{formError}</div>}
            <form onSubmit={handleSaveProduct} className="admin-form">
              <div className="form-group">
                <label>SKU *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SAM-S24-256-BLK"
                  value={productForm.sku}
                  onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                />
                {fieldErrors.sku && <span className="field-error">{fieldErrors.sku}</span>}
              </div>

              <div className="form-group-row">
                <div className="form-group">
                  <label>Brand *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Samsung"
                    value={productForm.brand}
                    onChange={(e) => setProductForm({ ...productForm, brand: e.target.value })}
                  />
                  {fieldErrors.brand && <span className="field-error">{fieldErrors.brand}</span>}
                </div>
                <div className="form-group">
                  <label>Category *</label>
                  <input
                    type="text"
                    required
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
                <label>Model Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Galaxy S24 Ultra"
                  value={productForm.model_name}
                  onChange={(e) => setProductForm({ ...productForm, model_name: e.target.value })}
                />
                {fieldErrors.model_name && (
                  <span className="field-error">{fieldErrors.model_name}</span>
                )}
              </div>

              <div className="form-group">
                <label>Retail Price (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
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
                  className="secondary-btn"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingItem(null);
                  }}
                  disabled={formSubmitting}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-btn" disabled={formSubmitting}>
                  {formSubmitting
                    ? 'Saving...'
                    : editingItem
                    ? 'Update Product'
                    : 'Create Product'}
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
              <h2>{editingItem ? 'Edit Warehouse' : 'New Warehouse'}</h2>
              <button
                className="modal-close-btn"
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingItem(null);
                }}
              >
                ×
              </button>
            </div>
            {formError && <div className="admin-alert error">{formError}</div>}
            <form onSubmit={handleSaveWarehouse} className="admin-form">
              <div className="form-group">
                <label>Warehouse Code *</label>
                <input
                  type="text"
                  required
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
                <label>Facility Name *</label>
                <input
                  type="text"
                  required
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

              <div className="form-group-row">
                <div className="form-group">
                  <label>City *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kolkata"
                    value={warehouseForm.city}
                    onChange={(e) =>
                      setWarehouseForm({ ...warehouseForm, city: e.target.value })
                    }
                  />
                  {fieldErrors.city && <span className="field-error">{fieldErrors.city}</span>}
                </div>
                <div className="form-group">
                  <label>State *</label>
                  <input
                    type="text"
                    required
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
                <label>Capacity (Units) *</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
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
                  className="secondary-btn"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingItem(null);
                  }}
                  disabled={formSubmitting}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-btn" disabled={formSubmitting}>
                  {formSubmitting
                    ? 'Saving...'
                    : editingItem
                    ? 'Update Warehouse'
                    : 'Create Warehouse'}
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
              <h2>{editingItem ? 'Edit Operator' : 'New Operator'}</h2>
              <button
                className="modal-close-btn"
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingItem(null);
                }}
              >
                ×
              </button>
            </div>
            {formError && <div className="admin-alert error">{formError}</div>}
            <form onSubmit={handleSaveOperator} className="admin-form">
              {!editingItem && (
                <div className="form-group">
                  <label>Employee Code *</label>
                  <input
                    type="text"
                    required
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

              <div className="form-group-row">
                <div className="form-group">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    required
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
                    <label>Email *</label>
                    <input
                      type="email"
                      required
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
                    <label>Email</label>
                    <input type="email" disabled value={operatorForm.email} />
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Job Title (Role) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Reverse Logistics Specialist"
                  value={operatorForm.role}
                  onChange={(e) => setOperatorForm({ ...operatorForm, role: e.target.value })}
                />
                {fieldErrors.role && <span className="field-error">{fieldErrors.role}</span>}
              </div>

              <div className="form-group-row">
                <div className="form-group">
                  <label>Application Role *</label>
                  <select
                    value={operatorForm.app_role}
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
                  <label>Assigned Warehouse *</label>
                  <select
                    value={operatorForm.warehouse_id}
                    required
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
                  <label>Status *</label>
                  <select
                    value={operatorForm.is_active ? 'true' : 'false'}
                    onChange={(e) =>
                      setOperatorForm({
                        ...operatorForm,
                        is_active: e.target.value === 'true',
                      })
                    }
                  >
                    <option value="true">Active (Can log in)</option>
                    <option value="false">Inactive (Login blocked)</option>
                  </select>
                  {fieldErrors.is_active && (
                    <span className="field-error">{fieldErrors.is_active}</span>
                  )}
                </div>
              )}

              <div className="form-group">
                <label>
                  {editingItem ? 'Reset Password (optional)' : 'Password *'}
                </label>
                <input
                  type="password"
                  required={!editingItem}
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
                  className="secondary-btn"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingItem(null);
                  }}
                  disabled={formSubmitting}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-btn" disabled={formSubmitting}>
                  {formSubmitting
                    ? 'Saving...'
                    : editingItem
                    ? 'Update Operator'
                    : 'Create Operator'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
