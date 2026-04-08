import { describe, test, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before importing the route
vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}));

import { GET, POST, PATCH } from '../route';
import { db } from '@/db';

const mockSelect = db.select as ReturnType<typeof vi.fn>;
const mockInsert = db.insert as ReturnType<typeof vi.fn>;
const mockUpdate = db.update as ReturnType<typeof vi.fn>;

const TEST_KID_ID = '550e8400-e29b-41d4-a716-446655440000';
const TEST_GOAL_ID = '660e8400-e29b-41d4-a716-446655440001';

function createRequest(url: string, options?: RequestInit): Request {
  return new Request(url, options);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/savings-goals', () => {
  function setupMockSelect(rows: Record<string, unknown>[]) {
    const mockOrderBy = vi.fn().mockResolvedValue(rows);
    const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
    mockSelect.mockReturnValue({ from: mockFrom });
  }

  test('returns 400 when kidId is missing', async () => {
    const request = createRequest('http://localhost/api/savings-goals');
    const response = await GET(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('kidId is required');
  });

  test('returns goals with numeric amounts for a kid', async () => {
    const dbRows = [
      {
        id: TEST_GOAL_ID,
        kidId: TEST_KID_ID,
        name: 'New Bike',
        targetAmount: '50.00',
        currentAmount: '12.50',
        status: 'active',
        createdAt: new Date('2024-01-01'),
        completedAt: null,
      },
    ];
    setupMockSelect(dbRows);

    const request = createRequest(
      `http://localhost/api/savings-goals?kidId=${TEST_KID_ID}`
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toHaveLength(1);
    expect(body[0].targetAmount).toBe(50.0);
    expect(body[0].currentAmount).toBe(12.5);
    expect(body[0].name).toBe('New Bike');
  });

  test('returns empty array when kid has no goals', async () => {
    setupMockSelect([]);

    const request = createRequest(
      `http://localhost/api/savings-goals?kidId=${TEST_KID_ID}`
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual([]);
  });

  test('returns 500 on database error', async () => {
    const mockFrom = vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockRejectedValue(new Error('DB connection failed')),
      }),
    });
    mockSelect.mockReturnValue({ from: mockFrom });

    const request = createRequest(
      `http://localhost/api/savings-goals?kidId=${TEST_KID_ID}`
    );
    const response = await GET(request);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe('Failed to fetch savings goals');
  });
});

describe('POST /api/savings-goals', () => {
  const validPayload = {
    kidId: TEST_KID_ID,
    name: 'New Bike',
    targetAmount: 50.0,
  };

  function setupMockInsert(returnRecord: Record<string, unknown>) {
    const mockReturning = vi.fn().mockResolvedValue([returnRecord]);
    const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
    mockInsert.mockReturnValue({ values: mockValues });
  }

  test('creates a goal and returns 201 with numeric amounts', async () => {
    setupMockInsert({
      id: TEST_GOAL_ID,
      kidId: TEST_KID_ID,
      name: 'New Bike',
      targetAmount: '50.00',
      currentAmount: '0.00',
      status: 'active',
      createdAt: new Date('2024-01-01'),
      completedAt: null,
    });

    const request = createRequest('http://localhost/api/savings-goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validPayload),
    });
    const response = await POST(request);

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.name).toBe('New Bike');
    expect(body.targetAmount).toBe(50.0);
    expect(body.currentAmount).toBe(0);
    expect(body.status).toBe('active');
  });

  test('returns 400 with field errors when name is empty', async () => {
    const request = createRequest('http://localhost/api/savings-goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...validPayload, name: '' }),
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Validation failed');
    expect(body.details).toHaveProperty('name');
  });

  test('returns 400 when targetAmount is negative', async () => {
    const request = createRequest('http://localhost/api/savings-goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...validPayload, targetAmount: -10 }),
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Validation failed');
    expect(body.details).toHaveProperty('targetAmount');
  });

  test('returns 400 when kidId is not a valid UUID', async () => {
    const request = createRequest('http://localhost/api/savings-goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...validPayload, kidId: 'not-a-uuid' }),
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Validation failed');
    expect(body.details).toHaveProperty('kidId');
  });

  test('returns 500 on database error during insert', async () => {
    const mockValues = vi.fn().mockReturnValue({
      returning: vi.fn().mockRejectedValue(new Error('DB write failed')),
    });
    mockInsert.mockReturnValue({ values: mockValues });

    const request = createRequest('http://localhost/api/savings-goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validPayload),
    });
    const response = await POST(request);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe('Failed to create savings goal');
  });
});

describe('PATCH /api/savings-goals', () => {
  function setupMockUpdate(returnRecord: Record<string, unknown> | null) {
    const mockReturning = vi.fn().mockResolvedValue(returnRecord ? [returnRecord] : []);
    const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
    const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
    mockUpdate.mockReturnValue({ set: mockSet });
    return { mockSet };
  }

  const baseGoal = {
    id: TEST_GOAL_ID,
    kidId: TEST_KID_ID,
    name: 'New Bike',
    targetAmount: '50.00',
    currentAmount: '25.00',
    status: 'active',
    createdAt: new Date('2024-01-01'),
    completedAt: null,
  };

  test('updates goal status to completed and sets completedAt', async () => {
    const { mockSet } = setupMockUpdate({
      ...baseGoal,
      status: 'completed',
      completedAt: new Date(),
    });

    const request = createRequest('http://localhost/api/savings-goals', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: TEST_GOAL_ID, status: 'completed' }),
    });
    const response = await PATCH(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('completed');

    // Verify completedAt was set in the update data
    const setArg = mockSet.mock.calls[0][0];
    expect(setArg.status).toBe('completed');
    expect(setArg.completedAt).toBeInstanceOf(Date);
  });

  test('updates goal status to archived without setting completedAt', async () => {
    const { mockSet } = setupMockUpdate({
      ...baseGoal,
      status: 'archived',
    });

    const request = createRequest('http://localhost/api/savings-goals', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: TEST_GOAL_ID, status: 'archived' }),
    });
    const response = await PATCH(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('archived');

    // Verify completedAt was NOT set
    const setArg = mockSet.mock.calls[0][0];
    expect(setArg.completedAt).toBeUndefined();
  });

  test('updates goal name and targetAmount', async () => {
    setupMockUpdate({
      ...baseGoal,
      name: 'Mountain Bike',
      targetAmount: '75.00',
    });

    const request = createRequest('http://localhost/api/savings-goals', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: TEST_GOAL_ID,
        name: 'Mountain Bike',
        targetAmount: 75.0,
      }),
    });
    const response = await PATCH(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.name).toBe('Mountain Bike');
    expect(body.targetAmount).toBe(75.0);
  });

  test('returns 404 when goal not found', async () => {
    setupMockUpdate(null);

    const request = createRequest('http://localhost/api/savings-goals', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: TEST_GOAL_ID, status: 'completed' }),
    });
    const response = await PATCH(request);

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe('Savings goal not found');
  });

  test('returns 400 when id is not a valid UUID', async () => {
    const request = createRequest('http://localhost/api/savings-goals', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'not-a-uuid', status: 'completed' }),
    });
    const response = await PATCH(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Validation failed');
    expect(body.details).toHaveProperty('id');
  });

  test('returns 400 when status is invalid', async () => {
    const request = createRequest('http://localhost/api/savings-goals', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: TEST_GOAL_ID, status: 'invalid' }),
    });
    const response = await PATCH(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Validation failed');
  });

  test('returns 500 on database error during update', async () => {
    const mockWhere = vi.fn().mockReturnValue({
      returning: vi.fn().mockRejectedValue(new Error('DB write failed')),
    });
    const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
    mockUpdate.mockReturnValue({ set: mockSet });

    const request = createRequest('http://localhost/api/savings-goals', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: TEST_GOAL_ID, status: 'completed' }),
    });
    const response = await PATCH(request);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe('Failed to update savings goal');
  });
});
