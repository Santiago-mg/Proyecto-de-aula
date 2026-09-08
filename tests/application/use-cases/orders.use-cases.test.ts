import { describe, it, expect, beforeEach, vi } from 'vitest';
import { z } from 'zod';
import {
  createOrder,
  getMyOrders,
  getAllOrders,
  updateOrderStatus,
} from '../../../src/application/use-cases/orders.use-cases';
import { createOrderDto } from '../../../src/application/dtos/order.dto';
import type { CreateOrderDto } from '../../../src/application/dtos/order.dto';

const mockRepo = {
  create: vi.fn(),
  findById: vi.fn(),
  findByUser: vi.fn(),
  findAll: vi.fn(),
  updateStatus: vi.fn(),
};

const PHONE_ID_1 = '3f2504e0-4f89-11d3-9a0c-0305e82c3301';
const PHONE_ID_2 = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

function makeOrderData(overrides: Partial<CreateOrderDto> = {}): CreateOrderDto {
  return {
    email: 'ana@test.com',
    name: 'Ana Garcia',
    phone: '+57 300 123 4567',
    address: 'Calle 123 #45-67',
    city: 'Bogota',
    dept: 'Cundinamarca',
    items: [
      { phoneId: PHONE_ID_1, qty: 2 },
      { phoneId: PHONE_ID_2, qty: 1, colorId: 'c1', colorName: 'Negro' },
    ],
    ...overrides,
  };
}

function makeCreatedOrder(data: CreateOrderDto, userId?: string) {
  return {
    id: 'o1',
    orderRef: 'ORD-2026-0001',
    userId: userId ?? null,
    ...data,
    subtotal: 300,
    shipping: 10,
    total: 310,
    status: 'PENDING',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe('createOrder', () => {
  beforeEach(() => {
    // resetAllMocks also clears mockResolvedValueOnce queues
    vi.resetAllMocks();
  });

  it('creates an order with userId', async () => {
    const orderData = makeOrderData();
    const createdOrder = makeCreatedOrder(orderData, 'u1');
    mockRepo.create.mockResolvedValueOnce(createdOrder);

    const result = await createOrder(mockRepo, orderData, 'u1');

    expect(result).toEqual(createdOrder);
    expect(mockRepo.create).toHaveBeenCalledTimes(1);
    expect(mockRepo.create).toHaveBeenCalledWith({
      ...orderData,
      userId: 'u1',
    });
  });

  it('creates an order without userId', async () => {
    const orderData = makeOrderData();
    const createdOrder = makeCreatedOrder(orderData);
    mockRepo.create.mockResolvedValueOnce(createdOrder);

    const result = await createOrder(mockRepo, orderData);

    expect(result).toEqual(createdOrder);
    expect(mockRepo.create).toHaveBeenCalledWith({
      ...orderData,
      userId: undefined,
    });
  });

  it('propagates repository errors', async () => {
    const orderData = makeOrderData();
    const error = new Error('Database error');
    mockRepo.create.mockRejectedValueOnce(error);

    await expect(createOrder(mockRepo, orderData, 'u1')).rejects.toThrow(
      'Database error',
    );
  });
});

describe('createOrderDto validation', () => {
  const requiredFields = [
    'email',
    'name',
    'phone',
    'address',
    'city',
    'dept',
    'items',
  ] as const;

  it.each(requiredFields)('rejects when "%s" is missing', (field) => {
    const data: Record<string, unknown> = makeOrderData();
    delete data[field];

    expect(() => createOrderDto.parse(data)).toThrow(z.ZodError);
  });

  it('accepts a complete order', () => {
    const parsed = createOrderDto.parse(makeOrderData());

    expect(parsed).toEqual(makeOrderData());
  });

  it('rejects an invalid email', () => {
    expect(() => createOrderDto.parse(makeOrderData({ email: 'not-an-email' }))).toThrow(
      z.ZodError,
    );
  });

  it('rejects an empty items array', () => {
    expect(() => createOrderDto.parse(makeOrderData({ items: [] }))).toThrow(
      z.ZodError,
    );
  });

  it('rejects a non-positive quantity', () => {
    const data = makeOrderData({
      items: [{ phoneId: PHONE_ID_1, qty: 0 }],
    });

    expect(() => createOrderDto.parse(data)).toThrow(z.ZodError);
  });

  it('rejects a non-uuid phoneId', () => {
    const data = makeOrderData({
      items: [{ phoneId: 'p1', qty: 1 }],
    });

    expect(() => createOrderDto.parse(data)).toThrow(z.ZodError);
  });
});

describe('getMyOrders', () => {
  beforeEach(() => {
    // resetAllMocks also clears mockResolvedValueOnce queues
    vi.resetAllMocks();
  });

  it('returns all orders for the given user', async () => {
    const userOrders = [
      makeCreatedOrder(makeOrderData(), 'u1'),
      { ...makeCreatedOrder(makeOrderData(), 'u1'), id: 'o2', orderRef: 'ORD-2026-0002' },
    ];
    mockRepo.findByUser.mockResolvedValueOnce(userOrders);

    const result = await getMyOrders(mockRepo, 'u1');

    expect(result).toEqual(userOrders);
    expect(mockRepo.findByUser).toHaveBeenCalledTimes(1);
    expect(mockRepo.findByUser).toHaveBeenCalledWith('u1');
  });

  it('returns an empty array when the user has no orders', async () => {
    mockRepo.findByUser.mockResolvedValueOnce([]);

    const result = await getMyOrders(mockRepo, 'u2');

    expect(result).toEqual([]);
  });
});

describe('getAllOrders', () => {
  beforeEach(() => {
    // resetAllMocks also clears mockResolvedValueOnce queues
    vi.resetAllMocks();
  });

  it('returns a paginated list of orders', async () => {
    const paginated = {
      data: [
        makeCreatedOrder(makeOrderData(), 'u1'),
        { ...makeCreatedOrder(makeOrderData(), 'u2'), id: 'o2', orderRef: 'ORD-2026-0002' },
      ],
      meta: { total: 25, page: 2, limit: 10, totalPages: 3 },
    };
    mockRepo.findAll.mockResolvedValueOnce(paginated);

    const result = await getAllOrders(mockRepo, 2, 10);

    expect(result).toEqual(paginated);
    expect(mockRepo.findAll).toHaveBeenCalledTimes(1);
    expect(mockRepo.findAll).toHaveBeenCalledWith(2, 10);
  });
});

describe('updateOrderStatus', () => {
  beforeEach(() => {
    // resetAllMocks also clears mockResolvedValueOnce queues
    vi.resetAllMocks();
  });

  it('updates the status of an existing order', async () => {
    const order = makeCreatedOrder(makeOrderData(), 'u1');
    mockRepo.findById.mockResolvedValueOnce(order);

    const updatedOrder = { ...order, status: 'SHIPPED' as const };
    mockRepo.updateStatus.mockResolvedValueOnce(updatedOrder);

    const result = await updateOrderStatus(mockRepo, order.id, 'SHIPPED');

    expect(result.status).toBe('SHIPPED');
    expect(mockRepo.findById).toHaveBeenCalledTimes(1);
    expect(mockRepo.findById).toHaveBeenCalledWith(order.id);
    expect(mockRepo.updateStatus).toHaveBeenCalledTimes(1);
    expect(mockRepo.updateStatus).toHaveBeenCalledWith(order.id, 'SHIPPED');
  });

  it('rejects with 404 when the order does not exist', async () => {
    mockRepo.findById.mockResolvedValueOnce(null);

    await expect(
      updateOrderStatus(mockRepo, 'missing-id', 'DELIVERED'),
    ).rejects.toMatchObject({ statusCode: 404 });

    expect(mockRepo.updateStatus).not.toHaveBeenCalled();
  });
});
