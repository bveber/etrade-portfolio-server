# E*TRADE Portfolio Server

This is a Node.js server application for managing E*TRADE portfolio data. It allows you to authorize access to your E*TRADE account, retrieve portfolio data, account balances, and transactions, and view 10-K filings.

## Features

- OAuth authorization with E*TRADE
- Retrieve and persist account balances, portfolio data, and transactions
- Fetch and display 10-K filings from the SEC

## Installation

1. Clone the repository:
    ```bash
    git clone https://github.com/bveber/etrade-portfolio-server.git
    cd etrade-portfolio-server
    ```

2. Install dependencies:
    ```bash
    npm install
    ```

3. Create a `.env` file in the root directory with your E*TRADE API credentials:
    ```env
    CONSUMER_KEY=your_consumer_key
    CONSUMER_SECRET=your_consumer_secret
    ```

4. Start the server:
    ```bash
    npm start
    ```

## Usage

### OAuth Authorization

1. Open your browser and go to `http://localhost:3000`.
2. Click on the "Get Authorization URL" button to get the authorization URL.
3. Authorize the application by visiting the provided URL.
4. Enter the OAuth verifier in the callback form to complete the authorization process.

### Retrieve Data

- **Account Balances**: Click the "Get Account Balances" button to fetch and display account balances.
- **Portfolio Data**: Click the "Get Portfolio Data" button to fetch and display portfolio data.
- **Transactions Data**: Click the "Get Transactions Data" button to fetch and display transactions data.

### 10-K Filings

1. Navigate to `http://localhost:3000/filings`.
2. Enter a stock ticker and click "Get 10-K Data" to fetch and display 10-K filings.

## Project Structure

```plaintext
etrade-portfolio-server/
│
├── public/                # Static HTML files
│   ├── filings.html
│   └── index.html
│
├── src/                   # Source files
│   ├── routes/            # Route handlers
│   │   ├── accountBalances.js
│   │   ├── portfolio.js
│   │   ├── transactions.js
│   │   └── edgar.js
│   │
│   ├── services/          # Business logic
│   │   ├── oauth.js
│   │   ├── cache.js
│   │   └── utils.js
│   │
│   └── server.js          # Main server file
│
├── .gitignore
├── .nvmrc
├── package.json
└── README.md
```

## Running Tests

This project uses Jest for unit testing. To run the tests, follow these steps:

1. Install the dependencies (if you haven't already):
    ```bash
    npm install
    ```

2. Run the tests:
    ```bash
    npm test
    ```

The tests are located in the `tests` directory and cover various functionalities of the application, including OAuth, portfolio data, transactions data, account balances, and 10-K filings.