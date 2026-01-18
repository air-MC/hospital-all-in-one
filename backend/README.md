# Backend API Setup Complete

The NestJS backend is ready with the core Booking Engine.

## implemented Endpoints
- **POST /booking/slots/generate**: Admin tool to generate slots from schedule rules.
- **POST /booking/appointments**: Transactional booking endpoint requiring `Idempotency-Key` header.

## How to Run (Locally)
1. **Database Setup**:
   Ensure PostgreSQL is running and update `backend/.env` with your credentials:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/hospital_db?schema=public"
   ```

2. **Migration**:
   Run the Prisma migration to create tables:
   ```bash
   cd backend
   npx prisma migrate dev --name init
   ```

3. **Start Server**:
   ```bash
   npm run start:dev
   ```

4. **Test (The Lucky 3)**:
   You can now run concurrent requests to `http://localhost:3000/booking/appointments` to test the atomic locking.
