# Basic Microservices Example (Node.js + Express)

This project demonstrates a simple microservices architecture using Node.js and Express. It includes three small services:

- **User Service** – Provides user data (3001)
- **Product Service** – Provides product data (3002)
- **Order Service** – Combines data from the other two via API calls (3003)

---

## 🧱 Project Structure

    microservices-example/
    │
    ├── user-service.js
    ├── product-service.js
    ├── order-service.js

yaml
Copy
Edit

---

## 🛠 Requirements

- Node.js (v14+)
- npm (Node Package Manager)

---

## 📦 Installation

For each service:

1. Open terminal in project root
2. Install dependencies:
```bash
npm init -y
npm install express axios
Repeat this in folders if you separate services.

🚀 Running Services
Start each service in its own terminal:

bash
Copy
Edit
# Start User Service
node user-service.js

# Start Product Service
node product-service.js

# Start Order Service
node order-service.js
🌐 API Endpoints
GET http://localhost:3001/users – Returns list of users

GET http://localhost:3002/products – Returns list of products

GET http://localhost:3003/orders – Returns one user + one product = order
