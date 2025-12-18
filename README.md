# 🖥️ StyleDecor – Server Side (Backend API)

## 📌 Project Name : b12-a10-styledecor-webserver

**StyleDecor – Backend Server**

## 🎯 Purpose

This server-side application powers the **StyleDecor – Smart Home & Ceremony Decoration Booking System**. It is responsible for handling authentication, role-based authorization, booking management, payment processing, decorator assignment, analytics, and secure communication between the client and database.

The backend is built following **RESTful API standards**, secure JWT verification, and real-world production practices.

---

## 🌐 Live Server URL : https://b12-a10-styledecor-webserver.vercel.app/

## **Client Live URL:** :  https://styledecor-e7da4.web.app/


---

## 🧱 Tech Stack

* **Node.js**
* **Express.js**
* **MongoDB (Atlas)**
* **Firebase Admin SDK**
* **Stripe Payment Gateway**
* **JWT Authentication**

---

## 🚀 Core Features

### 🔐 Authentication & Security

* Firebase Admin SDK token verification
* JWT-based protected routes
* Role-based access control (User / Admin / Decorator)
* Secure environment variable handling using dotenv
* CORS enabled for safe cross-origin requests

---

### 📦 Booking Management

* Create booking for consultation or on-site services
* Fetch user-wise booking history
* Update or cancel bookings
* Track booking & project status
* Pagination support for booking lists

---

### 🛠 Service & Decorator Management (Admin)

* Create / Update / Delete decoration services
* Manage service categories & pricing
* Assign decorators to paid on-site services
* Approve / Disable decorator accounts
* Fetch decorators with filters & pagination

---

### 🎯 Decorator Operations

* View assigned projects
* Update project status step-by-step
* View today’s schedule
* Check earnings & payment history

---

### 💳 Payment System

* Stripe payment intent creation
* Secure payment confirmation
* Store transactions in MongoDB
* Payment verification before decorator assignment

---

### 📊 Analytics & Reporting

* Total revenue calculation
* Service demand analytics
* Booking count histogram
* Admin dashboard statistics APIs

---

---

## 📁 API Structure (Overview)

### 🔐 Auth

* `POST /jwt` – Issue JWT token
* `GET /verify-token` – Verify token & role

### 👤 Users

* `GET /users` – Get all users (Admin)
* `PATCH /users/:id/role` – ManageUsers
* `PATCH /users/profile` – UserProfile

### 🎨 Services

* `GET /services` – Get all services
* `GET /categories` – To get unique categories (for filter dropdown) json : category filter


### 📦 Bookings

* `POST /bookings` – Service Details Page
* `GET /bookings` – AssignDecorators
* `GET /bookings/:email` – Get all bookings of a specific user
* `PATCH /bookings/assign/:id` – Update / cancel booking (AssignDecorators)
* `DELETE /bookings/:id` – booking delete/cancel api by id

### 🎯 Decorator

* `GET /assigned-projects` – Decorator projects
* `PATCH /project-status/:id` – Update project status

### 💳 Payments

* `POST /create-checkout-session` – Stripe payment intent
* `PATCH /payment-success` – payment status update and store to database history called collection payments

---

## 📦 NPM Packages Used

```json
{
  "cors": "^2.8.5",
  "dotenv": "^17.2.3",
  "express": "^5.2.1",
  "firebase-admin": "^13.6.0",
  "mongodb": "^7.0.0",
  "stripe": "^20.0.0"
}
```

---

## 🔐 Environment Variables (.env)

```env

PORT=3000

```

## 🚀 Deployment Checklist

* MongoDB Atlas connected
* Stripe keys configured
* Firebase Admin SDK configured
* CORS properly enabled
* No 404 / 504 / token errors
* JWT verification working on all protected routes

---

## 🧪 Error Handling

* Centralized try-catch blocks
* Meaningful error responses
* HTTP status code standards followed

---

### 👨‍💻 Developed By

**Mohammad Mahabubul Hoque Porosh**
MERN Stack Developer

---

