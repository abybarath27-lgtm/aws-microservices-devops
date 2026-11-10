const express = require('express');
const app = express();

app.get('/health', (req, res) => {
  res.status(200).json({ service: 'product-service', status: 'healthy' });
});

app.get('/products', (req, res) => {
  res.json([
    { id: 101, name: 'Laptop' },
    { id: 102, name: 'Phone' }
  ]);
});

const PORT = process.env.PORT || 3002;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Product Service running on port ${PORT}`);
});
