# 2. Backend (`backend_villabooking`)

```md
# OCEANLUXE VILLAS - Backend

This repository contains the backend service for the **OCEANLUXE VILLAS** web application. It is a comprehensive REST API built with Node.js and Express, designed to manage all users, villas, bookings, and payments.

## ✨ Key Features

* **Secure Authentication:** Complete user and host authentication using JWT (stored in httpOnly cookies) and Google OAuth 2.0.
* **Role-Based Access Control:** Distinct 'user' and 'host' roles to protect routes (e.g., hosts can create listings, users can book).
* **Villa Management:** Full CRUD operations for managing villa properties, including photos, availability, and pricing.
* **Booking Engine:** Logic to handle booking creation, date conflict checks, and user-specific booking retrieval.
* **Persistent Cart:** API endpoints to add, remove, and fetch cart items for authenticated users.
* **Payment Gateway:** Securely integrated with Razorpay. Includes endpoints to create payment orders and verify payment signatures.

---

## 🛠️ Tech Stack

* **Framework:** Node.js, Express
* **Database:** MongoDB (with Mongoose)
* **Authentication:** JSON Web Tokens (JWT), Google OAuth 2.0
* **Payment:** Razorpay
* **Language:** TypeScript (or JavaScript)
* **Other:** `cors`, `cookie-parser`, `bcryptjs`

---

## 📖 API Endpoints

Here is a summary of the main API routes:

| Method   | Route                          | Description                               |
| :------- | :----------------------------- | :---------------------------------------- |
| `POST`   | `/api/signup`                  | Register a new user.                      |
| `POST`   | `/api/login`                   | Log in a user and set auth cookie.        |
| `POST`   | `/api/google`                  | Log in or register a user via Google.     |
| `POST`   | `/api/logout`                  | Log out a user and clear auth cookie.     |
| `PATCH`  | `/api/users/update-role`       | Update a user's role (e.g., to 'host').   |
| `GET`    | `/api/villas`                  | Get all villas (with search/filter).      |
| `GET`    | `/api/villas/my-listings`      | Get all villas for the logged-in host.    |
| `GET`    | `/api/villas/:id`              | Get details for a single villa.           |
| `GET`    | `/api/cart`                    | Get the user's current cart.              |
| `POST`   | `/api/cart`                    | Add an item to the cart.                  |
| `DELETE` | `/api/cart/:id`                | Remove an item from the cart.             |
| `GET`    | `/api/bookings/mybookings`     | Get all bookings for the logged-in user.  |
| `GET`    | `/api/bookings/:id`            | Get details for a single booking.         |
| `POST`   | `/api/payments/create-order`   | Creates a Razorpay order from the cart.   |
| `POST`   | `/api/payments/verify`         | Verifies a Razorpay payment signature.    |

---

## 🚀 Getting Started

### 1. Prerequisites

* Node.js (v18 or later)
* `npm` or `yarn`
* MongoDB (a local instance or a connection string from Atlas)

### 2. Installation

1.  Clone the repository:
    ```sh
    git clone [https://github.com/your-username/backend_villabooking.git](https://github.com/your-username/backend_villabooking.git)
    cd backend_villabooking
    ```

2.  Install dependencies:
    ```sh
    npm install
    # or
    yarn install
    ```

### 3. Environment Variables

Create a `.env` file in the root of the project and add the following:

```env
# Server Configuration
PORT=5000

# MongoDB Connection
MONGO_URI=YOUR_MONGODB_CONNECTION_STRING

# JWT Configuration
JWT_SECRET=YOUR_SUPER_SECRET_KEY
JWT_EXPIRES_IN=7d

# Google OAuth Credentials
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET

# Razorpay Credentials
RAZORPAY_KEY_ID=YOUR_RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET=YOUR_RAZORSON_KEY_SECRET

# Frontend URL
CLIENT_URL=http://localhost:3000