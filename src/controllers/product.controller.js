const Product = require('../models/product.model');
const ApiError = require('../utils/ApiError');
const parseId = require('../utils/parseId');
const { createValidator } = require('../utils/validator');

// Field rules for POST (all required) and PATCH (all optional).
function validateProduct(body, { partial }) {
  const required = !partial;
  return createValidator(body)
    .string('sku', { required, max: 50 })
    .string('brand', { required, max: 100 })
    .string('model_name', { required, max: 150 })
    .string('category', { required, max: 50 })
    .number('retail_price', { required, min: 0 })
    .throwIfErrors();
}

function handleDbError(err, next) {
  if (err.code === '23505') {
    return next(ApiError.conflict('A product with this SKU already exists'));
  }
  return next(err);
}

// GET /api/products
async function getAllProducts(req, res, next) {
  try {
    const { category, q } = createValidator(req.query || {})
      .string('category', { max: 50 })
      .string('q', { max: 100 })
      .throwIfErrors('Invalid query parameters');

    const products = await Product.findAll({ category, q });
    res.status(200).json({ success: true, data: products });
  } catch (err) {
    next(err);
  }
}

// GET /api/products/:id
async function getProductById(req, res, next) {
  try {
    const id = parseId(req.params.id);
    if (id === null) {
      throw ApiError.badRequest('Invalid product ID');
    }
    const product = await Product.findById(id);
    if (!product) {
      throw ApiError.notFound(`Product with ID ${id} not found`);
    }
    res.status(200).json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
}

// POST /api/products (ADMIN)
async function createProduct(req, res, next) {
  try {
    const values = validateProduct(req.body, { partial: false });
    const product = await Product.create(values);
    res.status(201).json({ success: true, message: 'Product created', data: product });
  } catch (err) {
    handleDbError(err, next);
  }
}

// PATCH /api/products/:id (ADMIN)
async function updateProduct(req, res, next) {
  try {
    const id = parseId(req.params.id);
    if (id === null) {
      throw ApiError.badRequest('Invalid product ID');
    }
    const values = validateProduct(req.body, { partial: true });
    const product = await Product.update(id, values);
    if (!product) {
      throw ApiError.notFound(`Product with ID ${id} not found`);
    }
    res.status(200).json({ success: true, message: 'Product updated', data: product });
  } catch (err) {
    handleDbError(err, next);
  }
}

module.exports = { getAllProducts, getProductById, createProduct, updateProduct };
