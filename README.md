# NewbieHub 🚀

**Empowering Developers to Showcase, Sell, and Succeed.**

NewbieHub is a comprehensive marketplace and dashboard designed for developers to manage their projects, handle client orders, and track financial transactions securely.

## ✨ Features

- **Project Marketplace**: Showcase your best work to potential buyers.
- **Developer Dashboard**: Track your earnings, pending balances, and project status in real-time.
- **Secure Payments**: Integrated with Razorpay for reliable transaction management.
- **Real-time Notifications**: Stay updated with order status, messages, and sales.
- **Client Management**: Efficiently handle custom project requests and orders.
- **Media Hosting**: Integrated with Cloudinary for seamless asset management.

## 🛠️ Tech Stack

- **Frontend**: React.js with Vite
- **Styling**: Vanilla CSS (Premium Aesthethics)
- **Backend / Database**: Firebase (Auth, Realtime Database, Storage, Hosting)
- **Payments**: Razorpay
- **Image Management**: Cloudinary

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Firebase account

### Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/[your-username]/newbiehub.git
    cd newbiehub
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Environment Setup**:
    Copy the template file to `.env`:
    ```bash
    cp .env.example .env
    ```
    Fill in your Firebase, Razorpay, and Cloudinary credentials in the `.env` file.

4.  **Run locally**:
    ```bash
    npm run dev
    ```

## 🔒 Security

Sensitive information like API keys and private configuration is managed via `.env` files and should **NEVER** be committed to the repository. Ensure your `.gitignore` includes:
- `.env`
- `node_modules/`
- `dist/`

## 📄 License

This project is licensed under the MIT License.
