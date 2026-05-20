# Setup Guide

## Prerequisites

- Node.js 16.x or higher
- npm or yarn
- PostgreSQL 12+
- Docker (optional)

## Installation

### 1. Clone Repository

```bash
git clone https://github.com/nawabsaifi85100-blip/adlhisab-erp.git
cd adlhisab-erp
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

```bash
cp .env.example .env
```

Edit `.env` file with your configuration:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=adlhisab_erp
DB_USER=erp_user
DB_PASSWORD=your_password
JWT_SECRET=your_secret_key
```

### 4. Database Setup

```bash
# Create database
createdb adlhisab_erp

# Run migrations
npm run migrate

# Seed data (optional)
npm run seed
```

### 5. Start Development Server

```bash
npm run dev
```

Server will run on `http://localhost:3000`

## Docker Setup

```bash
docker-compose up -d
```

## Testing

```bash
# Run all tests
npm test

# Run specific test
npm test -- --grep "module-name"

# Coverage
npm run test:coverage
```
