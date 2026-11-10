const express = require('express');
const axios = require('axios');

const app = express();

const USER_SERVICE_URL =
  process.env.USER_SERVICE_URL || 'http://user-service:3001';

const PRODUCT_SERVICE_URL =
  process.env.PRODUCT_SERVICE_URL || 'http://product-service:3002';

app.get('/health', (req, res) => {
  res.status(200).json({ service: 'order-service', status: 'healthy' });
});

app.get('/orders', async (req, res) => {
  try {
    const users = await axios.get(`${USER_SERVICE_URL}/users`);
    const products = await axios.get(`${PRODUCT_SERVICE_URL}/products`);

    res.json({
      user: users.data[0],
      product: products.data[0],
      status: 'Order Placed'
    });
  } catch (error) {
    console.error('Order service dependency error:', error.message);

    res.status(503).json({
      status: 'unavailable',
      message: 'Unable to retrieve user or product information'
    });
  }
});

const PORT = process.env.PORT || 3003;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Order Service running on port ${PORT}`);
});
