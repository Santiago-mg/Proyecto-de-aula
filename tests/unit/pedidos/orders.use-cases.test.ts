import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import {
  createOrder,
  getMyOrders,
  getAllOrders,
  updateOrderStatus,
} from '../../../src/application/use-cases/orders.use-cases';
import { createOrderDto } from '../../../src/application/dtos/order.dto';
import type { CreateOrderDto } from '../../../src/application/dtos/order.dto';
import { OrderRepository } from '../../../src/infrastructure/repositories/OrderRepository';
import prisma from '../../../src/infrastructure/database/prisma';
import { limpiarBaseDeDatos } from '../../helpers/db';
import { crearCelular, ID_INEXISTENTE } from '../../helpers/fixtures';

// repo es el OrderRepository real. create() corre una transacción de Postgres
// de verdad (lee el precio vigente, valida stock y lo descuenta), así que
// estas pruebas comprueban ese comportamiento tal cual ocurre en producción,
// no una simulación de él.
const repo = new OrderRepository();

const PHONE_ID_1 = '3f2504e0-4f89-11d3-9a0c-0305e82c3301';
const PHONE_ID_2 = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

function makeOrderData(
  items: CreateOrderDto['items'],
  overrides: Partial<CreateOrderDto> = {},
): CreateOrderDto {
  return {
    email: 'ana@test.com',
    name: 'Ana Garcia',
    phone: '+57 300 123 4567',
    address: 'Calle 123 #45-67',
    city: 'Bogota',
    dept: 'Cundinamarca',
    items,
    ...overrides,
  };
}

beforeEach(async () => {
  await limpiarBaseDeDatos();
});

describe('createOrder', () => {
  it('crea el pedido calculando el subtotal y el total a partir del precio real de los celulares', async () => {
    const celular1 = await crearCelular({ price: 100_000, stock: 10 });
    const celular2 = await crearCelular({ price: 50_000, stock: 10 });
    const orderData = makeOrderData([
      { phoneId: celular1.id, qty: 2 },
      { phoneId: celular2.id, qty: 1, colorId: 'c1', colorName: 'Negro' },
    ]);

    const result = await createOrder(repo, orderData, 'u1');

    // subtotal = 100.000×2 + 50.000×1 = 250.000. No pasa de 500.000, así que
    // el envío cuesta 20.000 (regla del repositorio).
    expect(result.subtotal).toBe(250_000);
    expect(result.shipping).toBe(20_000);
    expect(result.total).toBe(270_000);
    expect(result.userId).toBe('u1');
    expect(result.orderRef).toMatch(/^CP-[0-9A-F]{6}$/);
  });

  it('crea el pedido sin userId cuando la compra es de un invitado', async () => {
    const celular = await crearCelular({ price: 100_000, stock: 5 });
    const orderData = makeOrderData([{ phoneId: celular.id, qty: 1 }]);

    const result = await createOrder(repo, orderData);

    expect(result.userId).toBeNull();
  });

  it('el envío es gratis cuando el subtotal supera los 500.000', async () => {
    const celular = await crearCelular({ price: 600_000, stock: 5 });
    const orderData = makeOrderData([{ phoneId: celular.id, qty: 1 }]);

    const result = await createOrder(repo, orderData);

    expect(result.shipping).toBe(0);
    expect(result.total).toBe(600_000);
  });

  it('descuenta el stock del celular comprado', async () => {
    const celular = await crearCelular({ price: 100_000, stock: 5 });
    const orderData = makeOrderData([{ phoneId: celular.id, qty: 2 }]);

    await createOrder(repo, orderData);

    const actualizado = await prisma.phone.findUnique({ where: { id: celular.id } });
    expect(actualizado?.stock).toBe(3);
  });

  it('lanza AppError 404 si algún celular del pedido no existe', async () => {
    const orderData = makeOrderData([{ phoneId: ID_INEXISTENTE, qty: 1 }]);

    await expect(createOrder(repo, orderData, 'u1')).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('lanza AppError 400 y no descuenta stock cuando el stock es insuficiente', async () => {
    const celular = await crearCelular({ price: 100_000, stock: 1 });
    const orderData = makeOrderData([{ phoneId: celular.id, qty: 5 }]);

    await expect(createOrder(repo, orderData)).rejects.toMatchObject({
      statusCode: 400,
    });

    // La transacción se revirtió completa: el stock quedó como estaba.
    const actualizado = await prisma.phone.findUnique({ where: { id: celular.id } });
    expect(actualizado?.stock).toBe(1);
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

  function datosCompletos(): CreateOrderDto {
    return makeOrderData([
      { phoneId: PHONE_ID_1, qty: 2 },
      { phoneId: PHONE_ID_2, qty: 1, colorId: 'c1', colorName: 'Negro' },
    ]);
  }

  it.each(requiredFields)('rejects when "%s" is missing', (field) => {
    const data: Record<string, unknown> = datosCompletos();
    delete data[field];

    expect(() => createOrderDto.parse(data)).toThrow(z.ZodError);
  });

  it('accepts a complete order', () => {
    const parsed = createOrderDto.parse(datosCompletos());

    expect(parsed).toEqual(datosCompletos());
  });

  it('rejects an invalid email', () => {
    expect(() =>
      createOrderDto.parse(makeOrderData(datosCompletos().items, { email: 'not-an-email' })),
    ).toThrow(z.ZodError);
  });

  it('rejects an empty items array', () => {
    expect(() => createOrderDto.parse(makeOrderData([]))).toThrow(z.ZodError);
  });

  it('rejects a non-positive quantity', () => {
    const data = makeOrderData([{ phoneId: PHONE_ID_1, qty: 0 }]);

    expect(() => createOrderDto.parse(data)).toThrow(z.ZodError);
  });

  it('rejects a non-uuid phoneId', () => {
    const data = makeOrderData([{ phoneId: 'p1', qty: 1 }]);

    expect(() => createOrderDto.parse(data)).toThrow(z.ZodError);
  });
});

describe('getMyOrders', () => {
  it('returns all orders for the given user', async () => {
    const celular = await crearCelular({ price: 100_000, stock: 20 });
    const orderData = makeOrderData([{ phoneId: celular.id, qty: 1 }]);
    await createOrder(repo, orderData, 'u1');
    await createOrder(repo, orderData, 'u1');
    await createOrder(repo, orderData, 'u2');

    const result = await getMyOrders(repo, 'u1');

    expect(result).toHaveLength(2);
    expect(result.every((o) => o.userId === 'u1')).toBe(true);
  });

  it('returns an empty array when the user has no orders', async () => {
    const result = await getMyOrders(repo, 'usuario-sin-pedidos');

    expect(result).toEqual([]);
  });
});

describe('getAllOrders', () => {
  it('returns a paginated list of orders', async () => {
    const celular = await crearCelular({ price: 100_000, stock: 20 });
    const orderData = makeOrderData([{ phoneId: celular.id, qty: 1 }]);
    await createOrder(repo, orderData, 'u1');
    await createOrder(repo, orderData, 'u2');
    await createOrder(repo, orderData, 'u3');

    const result = await getAllOrders(repo, 1, 2);

    expect(result.data).toHaveLength(2);
    expect(result.meta).toEqual({ total: 3, page: 1, limit: 2, totalPages: 2 });
  });
});

describe('updateOrderStatus', () => {
  // OrderRepository.create() no fija el status: usa el valor por defecto del
  // schema, que es CONFIRMED. Por eso las transiciones válidas que se
  // prueban aquí parten de CONFIRMED (→ SHIPPED o CANCELLED), no de PENDING.
  async function crearPedidoConfirmado() {
    const celular = await crearCelular({ price: 100_000, stock: 10 });
    const orderData = makeOrderData([{ phoneId: celular.id, qty: 1 }]);
    return createOrder(repo, orderData, 'u1');
  }

  it('actualiza el estado de un pedido existente (CONFIRMED → SHIPPED es una transición válida)', async () => {
    const order = await crearPedidoConfirmado();
    expect(order.status).toBe('CONFIRMED');

    const result = await updateOrderStatus(repo, order.id, 'SHIPPED');

    expect(result.status).toBe('SHIPPED');
  });

  it('rejects with 400 una transición inválida (de CONFIRMED a DELIVERED, saltándose SHIPPED)', async () => {
    const order = await crearPedidoConfirmado();

    await expect(updateOrderStatus(repo, order.id, 'DELIVERED')).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it('rejects with 400 cuando el pedido ya está en ese estado', async () => {
    const order = await crearPedidoConfirmado();

    await expect(updateOrderStatus(repo, order.id, 'CONFIRMED')).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it('rejects with 404 cuando el pedido no existe', async () => {
    await expect(updateOrderStatus(repo, ID_INEXISTENTE, 'DELIVERED')).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});
