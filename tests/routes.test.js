const request = require('supertest');
const { app } = require('../server');
const db = require('../db');

describe('Auth API', () => {
    test('register creates a user and returns a JWT', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ name: 'Test Rider', email: 'rider@test.com', password: 'secret123', role: 'passenger' });
        expect(res.status).toBe(201);
        expect(res.body.token).toBeDefined();
        expect(res.body.userId).toBeDefined();
    });

    test('login returns matching credentials for existing user', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'rider@test.com', password: 'secret123' });
        expect(res.status).toBe(200);
        expect(res.body.token).toBeDefined();
    });

    test('forgot + reset password flow works', async () => {
        const forgot = await request(app)
            .post('/api/auth/forgot-password')
            .send({ email: 'rider@test.com' });
        expect(forgot.status).toBe(200);
        expect(forgot.body.resetToken).toBeDefined();

        const reset = await request(app)
            .post('/api/auth/reset-password')
            .send({ resetToken: forgot.body.resetToken, newPassword: 'newsecret123' });
        expect(reset.status).toBe(200);

        const login = await request(app)
            .post('/api/auth/login')
            .send({ email: 'rider@test.com', password: 'newsecret123' });
        expect(login.status).toBe(200);
    });
});

describe('Users API', () => {
    test('search finds users by name', async () => {
        const res = await request(app).get('/api/users/search').query({ q: 'Test' });
        expect(res.status).toBe(200);
        expect(res.body.some(u => u.email === 'rider@test.com')).toBe(true);
    });

    test('search returns empty array for no match', async () => {
        const res = await request(app).get('/api/users/search').query({ q: 'zzzznomatchzzzz' });
        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(0);
    });
});

describe('Trips API', () => {
    test('creating a trip without auth is rejected', async () => {
        const res = await request(app)
            .post('/api/trips')
            .send({ from: 'A', to: 'B', date: '2026-10-01', time: '09:00', seats: 2, price: 10 });
        expect(res.status).toBe(401);
    });

    test('creating a trip as a passenger is forbidden', async () => {
        const login = await request(app)
            .post('/api/auth/login')
            .send({ email: 'rider@test.com', password: 'newsecret123' });
        const res = await request(app)
            .post('/api/trips')
            .set('Authorization', `Bearer ${login.body.token}`)
            .send({ from: 'Casablanca', to: 'Rabat', date: '2026-10-01', time: '09:00', seats: 2, price: 10 });
        expect(res.status).toBe(403);
    });

    test('admin monitor endpoint requires admin token', async () => {
        const login = await request(app)
            .post('/api/auth/login')
            .send({ email: 'rider@test.com', password: 'newsecret123' });
        const res = await request(app)
            .get('/api/trips/admin/all')
            .set('Authorization', `Bearer ${login.body.token}`);
        expect(res.status).toBe(403);
    });
});

describe('Transactions API', () => {
    test('summary endpoint is reachable and computes totals', async () => {
        db.memoryDb.transactions = db.memoryDb.transactions || [];
        db.memoryDb.transactions.push({
            id: 'txn_summary_test',
            userId: 'user_summary',
            type: 'payment',
            amount: 42,
            tripId: 'trip_x',
            status: 'completed',
            createdAt: new Date()
        });
        const res = await request(app).get('/api/transactions/stats/summary/user_summary');
        expect(res.status).toBe(200);
        expect(res.body.totalSpent).toBe(42);
        expect(res.body.completedTransactions).toBe(1);
    });
});