import { describe, test, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before importing the route
vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    delete: vi.fn(),
  },
}));

import { GET, PUT } from '../route';
import { db } from '@/db';

const mockSelect = db.select as ReturnType<typeof vi.fn>;
const mockInsert = db.insert as ReturnType<typeof vi.fn>;
const mockDelete = (db as unknown as { delete: ReturnType<typeof vi.fn> }).delete;

const TEST_KID_ID = '550e8400-e29b-41d4-a716-446655440000';
const TEST_CAT_ID_1 = '660e8400-e29b-41d4-a716-446655440001';
const TEST_CAT_ID_2 = '660e8400-e29b-41d4-a716-446655440002';
const TEST_CAT_ID_3 = '660e8400-e29b-41d4-a716-446655440003';

function createRequest(url: string, options?: RequestInit): Request {
  return new Request(url, options);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/spending-categories', () => {
  function setupMockSelectChain(callResults: Record<string, unknown>[][]) {
    let callIndex = 0;
    mockSelect.mockImplementation(() => {
      const rows = callResults[callIndex] ?? [];
      callIndex++;
      const mockOrderBy = vi.fn().mockResolvedValue(rows);
      const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      return { from: mockFrom };
    });
  }

  function setupMockSelectWithBalances(
    categories: Record<string, unknown>[],
    balances: Record<string, unknown>[]
  ) {
    let callIndex = 0;
    mockSelect.mockImplementation(() => {
      const isFirst = callIndex === 0;
      callIndex++;
      if (isFirst) {
        const mockOrderBy = vi.fn().mockResolvedValue(categories);
        const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
        const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
        return { from: mockFrom };
      }
      const mockWhere = vi.fn().mockResolvedValue(balances);
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      return { from: mockFrom };
    });
  }

  test('returns 400 when kidId is missing', async () => {
    const request = createRequest('http://localhost/api/spending-categories');
    const response = await GET(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('kidId is required');
  });

  test('returns enabled false with empty categories when none exist', async () => {
    setupMockSelectChain([[]]);

    const request = createRequest(
      `http://localhost/api/spending-categories?kidId=${TEST_KID_ID}`
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ enabled: false, categories: [] });
  });

  test('returns enabled true with categories and balances', async () => {
    const categories = [
      { id: TEST_CAT_ID_1, kidId: TEST_KID_ID, name: 'Save', percentage: 40, sortOrder: 0, createdAt: new Date() },
      { id: TEST_CAT_ID_2, kidId: TEST_KID_ID, name: 'Spend', percentage: 40, sortOrder: 1, createdAt: new Date() },
      { id: TEST_CAT_ID_3, kidId: TEST_KID_ID, name: 'Give', percentage: 20, sortOrder: 2, createdAt: new Date() },
    ];
    const balances = [
      { id: 'b1', categoryId: TEST_CAT_ID_1, kidId: TEST_KID_ID, balance: '15.00', updatedAt: new Date() },
      { id: 'b2', categoryId: TEST_CAT_ID_2, kidId: TEST_KID_ID, balance: '10.50', updatedAt: new Date() },
      { id: 'b3', categoryId: TEST_CAT_ID_3, kidId: TEST_KID_ID, balance: '5.25', updatedAt: new Date() },
    ];
    setupMockSelectWithBalances(categories, balances);

    const request = createRequest(
      `http://localhost/api/spending-categories?kidId=${TEST_KID_ID}`
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.enabled).toBe(true);
    expect(body.categories).toHaveLength(3);
    expect(body.categories[0]).toEqual({
      id: TEST_CAT_ID_1,
      name: 'Save',
      percentage: 40,
      sortOrder: 0,
      balance: 15.0,
    });
    expect(body.categories[2].balance).toBe(5.25);
  });

  test('returns 0 balance when no balance record exists for a category', async () => {
    const categories = [
      { id: TEST_CAT_ID_1, kidId: TEST_KID_ID, name: 'Save', percentage: 100, sortOrder: 0, createdAt: new Date() },
    ];
    setupMockSelectWithBalances(categories, []);

    const request = createRequest(
      `http://localhost/api/spending-categories?kidId=${TEST_KID_ID}`
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.categories[0].balance).toBe(0);
  });

  test('returns 500 on database error', async () => {
    mockSelect.mockImplementation(() => {
      const mockOrderBy = vi.fn().mockRejectedValue(new Error('DB connection failed'));
      const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      return { from: mockFrom };
    });

    const request = createRequest(
      `http://localhost/api/spending-categories?kidId=${TEST_KID_ID}`
    );
    const response = await GET(request);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe('Failed to fetch spending categories');
  });
});

describe('PUT /api/spending-categories', () => {
  function setupMockSelectForPut(existingCategories: Record<string, unknown>[]) {
    const mockWhere = vi.fn().mockResolvedValue(existingCategories);
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
    mockSelect.mockReturnValue({ from: mockFrom });
  }

  function setupMockDelete() {
    const mockWhere = vi.fn().mockResolvedValue(undefined);
    mockDelete.mockReturnValue({ where: mockWhere });
  }

  function setupMockInsertChain(callResults: Record<string, unknown>[][]) {
    let callIndex = 0;
    mockInsert.mockImplementation(() => {
      const rows = callResults[callIndex] ?? [];
      callIndex++;
      const mockReturning = vi.fn().mockResolvedValue(rows);
      const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
      return { values: mockValues };
    });
  }

  const validPayload = {
    kidId: TEST_KID_ID,
    enabled: true,
    categories: [
      { name: 'Save', percentage: 50 },
      { name: 'Spend', percentage: 50 },
    ],
  };

  test('creates default categories when first enabled with empty categories array', async () => {
    setupMockSelectForPut([]);
    setupMockDelete();

    const insertedDefaults = [
      { id: TEST_CAT_ID_1, kidId: TEST_KID_ID, name: 'Save', percentage: 40, sortOrder: 0, createdAt: new Date() },
      { id: TEST_CAT_ID_2, kidId: TEST_KID_ID, name: 'Spend', percentage: 40, sortOrder: 1, createdAt: new Date() },
      { id: TEST_CAT_ID_3, kidId: TEST_KID_ID, name: 'Give', percentage: 20, sortOrder: 2, createdAt: new Date() },
    ];
    setupMockInsertChain([insertedDefaults, []]);

    const request = createRequest('http://localhost/api/spending-categories', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kidId: TEST_KID_ID,
        enabled: true,
        categories: [],
      }),
    });
    const response = await PUT(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.enabled).toBe(true);
    expect(body.categories).toHaveLength(3);
    expect(body.categories[0].name).toBe('Save');
    expect(body.categories[0].percentage).toBe(40);
    expect(body.categories[1].name).toBe('Spend');
    expect(body.categories[2].name).toBe('Give');
    expect(body.categories[2].percentage).toBe(20);
  });

  test('creates provided categories when enabled with custom categories', async () => {
    setupMockSelectForPut([]);
    setupMockDelete();

    const insertedCustom = [
      { id: TEST_CAT_ID_1, kidId: TEST_KID_ID, name: 'Save', percentage: 50, sortOrder: 0, createdAt: new Date() },
      { id: TEST_CAT_ID_2, kidId: TEST_KID_ID, name: 'Spend', percentage: 50, sortOrder: 1, createdAt: new Date() },
    ];
    setupMockInsertChain([insertedCustom, []]);

    const request = createRequest('http://localhost/api/spending-categories', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validPayload),
    });
    const response = await PUT(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.enabled).toBe(true);
    expect(body.categories).toHaveLength(2);
    expect(body.categories[0].name).toBe('Save');
    expect(body.categories[0].percentage).toBe(50);
    expect(body.categories[0].balance).toBe(0);
  });

  test('replaces existing categories when updating', async () => {
    const existingCats = [
      { id: 'old-1', kidId: TEST_KID_ID, name: 'OldCat', percentage: 100, sortOrder: 0, createdAt: new Date() },
    ];
    setupMockSelectForPut(existingCats);
    setupMockDelete();

    const insertedNew = [
      { id: TEST_CAT_ID_1, kidId: TEST_KID_ID, name: 'Save', percentage: 50, sortOrder: 0, createdAt: new Date() },
      { id: TEST_CAT_ID_2, kidId: TEST_KID_ID, name: 'Spend', percentage: 50, sortOrder: 1, createdAt: new Date() },
    ];
    setupMockInsertChain([insertedNew, []]);

    const request = createRequest('http://localhost/api/spending-categories', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validPayload),
    });
    const response = await PUT(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.enabled).toBe(true);
    expect(body.categories).toHaveLength(2);
    // Verify delete was called (replace strategy)
    expect(mockDelete).toHaveBeenCalled();
  });

  test('disables categories by deleting all for the kid', async () => {
    setupMockDelete();

    const request = createRequest('http://localhost/api/spending-categories', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kidId: TEST_KID_ID,
        enabled: false,
        categories: [],
      }),
    });
    const response = await PUT(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ enabled: false, categories: [] });
    expect(mockDelete).toHaveBeenCalled();
  });

  test('returns 400 when percentages do not sum to 100', async () => {
    const request = createRequest('http://localhost/api/spending-categories', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kidId: TEST_KID_ID,
        enabled: true,
        categories: [
          { name: 'Save', percentage: 30 },
          { name: 'Spend', percentage: 30 },
        ],
      }),
    });
    const response = await PUT(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Validation failed');
    expect(body.details).toHaveProperty('categories');
  });

  test('returns 400 when kidId is not a valid UUID', async () => {
    const request = createRequest('http://localhost/api/spending-categories', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kidId: 'not-a-uuid',
        enabled: true,
        categories: [{ name: 'Save', percentage: 100 }],
      }),
    });
    const response = await PUT(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Validation failed');
    expect(body.details).toHaveProperty('kidId');
  });

  test('returns 400 when category name is empty', async () => {
    const request = createRequest('http://localhost/api/spending-categories', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kidId: TEST_KID_ID,
        enabled: true,
        categories: [{ name: '', percentage: 100 }],
      }),
    });
    const response = await PUT(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Validation failed');
  });

  test('returns 400 when percentage is out of range', async () => {
    const request = createRequest('http://localhost/api/spending-categories', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kidId: TEST_KID_ID,
        enabled: true,
        categories: [{ name: 'Save', percentage: 0 }],
      }),
    });
    const response = await PUT(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Validation failed');
  });

  test('returns 500 on database error during insert', async () => {
    setupMockSelectForPut([]);
    setupMockDelete();

    mockInsert.mockImplementation(() => {
      const mockReturning = vi.fn().mockRejectedValue(new Error('DB write failed'));
      const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
      return { values: mockValues };
    });

    const request = createRequest('http://localhost/api/spending-categories', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validPayload),
    });
    const response = await PUT(request);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe('Failed to save spending categories');
  });
});
