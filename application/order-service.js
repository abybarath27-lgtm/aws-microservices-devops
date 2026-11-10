// order-service.js
const express = require('express');
const axios = require('axios');
const app = express();

app.get('/orders', async (req, res) => {
  const users = await axios.get('http://localhost:3001/users');
  const products = await axios.get('http://localhost:3002/products');
  res.json({
    user: users.data[0],
    product: products.data[0],
    status: 'Order Placed'
  });
});

app.listen(3003, () => console.log('Order Service running on port 3003'));
