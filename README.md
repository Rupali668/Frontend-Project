# Finance Tracker

This project now includes:

- A React + Vite frontend in `finance-tracker/`
- A Spring Boot + Java backend in `finance-tracker/backend/`
- MySQL setup SQL for MySQL Workbench
- A Postman collection for API testing

## Project structure

- `src/App.jsx`: frontend dashboard connected to the backend API
- `backend/src/main/java/com/financetracker/backend`: Spring Boot source code
- `backend/src/main/resources/application.properties`: backend database config
- `backend/database/finance_tracker.sql`: SQL script to run in MySQL Workbench
- `backend/postman/finance-tracker.postman_collection.json`: Postman collection
- `.env.example`: frontend API base URL example

## Backend features

The Spring Boot backend provides:

- `GET /api/transactions`: list all transactions
- `GET /api/transactions/{id}`: get one transaction
- `GET /api/transactions/summary`: get total income, expenses, and balance
- `POST /api/transactions`: create a transaction
- `PUT /api/transactions/{id}`: update a transaction
- `DELETE /api/transactions/{id}`: delete a transaction

Supported transaction fields:

- `title`
- `amount`
- `category`
- `type` with values `INCOME` or `EXPENSE`
- `date`

## MySQL Workbench setup

1. Open MySQL Workbench.
2. Connect to your MySQL server.
3. Open [finance_tracker.sql](/c:/Users/amank/Finance%20Tracker/finance-tracker/backend/database/finance_tracker.sql).
4. Run the script to create the `finance_tracker` database and `transactions` table.
5. Update the password in [application.properties](/c:/Users/amank/Finance%20Tracker/finance-tracker/backend/src/main/resources/application.properties) if your MySQL password is different.

Default backend DB config:

- Database: `finance_tracker`
- Username: `root`
- Port: `3306`

## Run the backend

From `finance-tracker/backend`:

```powershell
mvn spring-boot:run
```

The API will start at `http://localhost:8080`.

## Run the frontend

1. Copy `.env.example` to `.env` if you want to customize the API URL.
2. From `finance-tracker` run:

```powershell
npm install
npm run dev
```

The frontend will start at `http://localhost:5173`.

## Test with Postman

1. Open Postman.
2. Import [finance-tracker.postman_collection.json](/c:/Users/amank/Finance%20Tracker/finance-tracker/backend/postman/finance-tracker.postman_collection.json).
3. Keep `baseUrl` set to `http://localhost:8080`.
4. Run the requests for create, list, update, summary, and delete.

Example create payload:

```json
{
  "title": "Metro Card Reload",
  "amount": 1500,
  "category": "Transport",
  "type": "EXPENSE",
  "date": "2026-04-18"
}
```

## Verified

These commands completed successfully:

```powershell
mvn test
npm run build
```

## Notes

- The frontend now reads and writes transactions through the Spring Boot API instead of `localStorage`.
- CORS is enabled for `http://localhost:5173` so React can call the backend during development.
- If you want, the next step can be adding authentication, edit support in the UI, or Docker setup for MySQL + Spring Boot.
