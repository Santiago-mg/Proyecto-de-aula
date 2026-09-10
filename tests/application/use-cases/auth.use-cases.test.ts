import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loginUser, registerUser } from '../../../src/application/use-cases/auth.use-cases.ts';
import type { IUserRepository } from '../../../src/domain/repositories/IUserRepository.ts';
import type { User } from '../../../src/domain/entities/User.ts';
import type { LoginDto, RegisterDto } from '../../../src/application/dtos/auth.dto.ts';

// El módulo captura el secreto al cargarse, así que se fija antes de los imports.
vi.hoisted(() => {
  process.env.JWT_SECRET = 'secreto-de-prueba';
});

const { mockBcryptHash, mockBcryptCompare, mockJwtSign } = vi.hoisted(() => ({
  mockBcryptHash: vi.fn(),
  mockBcryptCompare: vi.fn(),
  mockJwtSign: vi.fn(),
}));

vi.mock('bcrypt', () => ({
  __esModule: true,
  default: { hash: mockBcryptHash, compare: mockBcryptCompare },
  hash: mockBcryptHash,
  compare: mockBcryptCompare,
}));

vi.mock('jsonwebtoken', () => ({
  __esModule: true,
  default: { sign: mockJwtSign },
  sign: mockJwtSign,
}));

// ─── Repositorio simulado y fábrica de usuarios ─────────────────
const mockRepo: IUserRepository = {
  findByEmail: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
};

function makeUser(sobreescrituras: Partial<User> = {}): User {
  const ahora = new Date();
  return {
    id: 'u1',
    email: 'ana@test.com',
    name: 'Ana Garcia',
    password: 'password-hasheada',
    role: 'USER',
    banned: false,
    banReason: null,
    bannedAt: null,
    createdAt: ahora,
    updatedAt: ahora,
    ...sobreescrituras,
  };
}

const REGISTRO: RegisterDto = {
  email: 'ana@test.com',
  name: 'Ana Garcia',
  password: 'password123',
};

const CREDENCIALES: LoginDto = {
  email: 'ana@test.com',
  password: 'password123',
};

beforeEach(() => {
  vi.resetAllMocks();
});

afterEach(() => {
  delete process.env.JWT_EXPIRES_IN;
});

describe('registerUser — registrar un usuario nuevo', () => {
  it('registers a new user and returns the public user with a token', async () => {
    const usuario = makeUser();
    (mockRepo.findByEmail as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
    mockBcryptHash.mockResolvedValueOnce('password-hasheada');
    (mockRepo.create as ReturnType<typeof vi.fn>).mockResolvedValueOnce(usuario);
    mockJwtSign.mockReturnValueOnce('token-falso');

    const result = await registerUser(mockRepo, REGISTRO);

    expect(mockRepo.findByEmail).toHaveBeenCalledTimes(1);
    expect(mockRepo.findByEmail).toHaveBeenCalledWith(REGISTRO.email);
    expect(mockBcryptHash).toHaveBeenCalledWith(REGISTRO.password, 12);
    expect(mockRepo.create).toHaveBeenCalledWith({
      email: REGISTRO.email,
      name: REGISTRO.name,
      password: 'password-hasheada',
    });
    expect(mockJwtSign).toHaveBeenCalledWith(
      { id: usuario.id, role: usuario.role },
      'secreto-de-prueba',
      { expiresIn: expect.any(String) },
    );
    expect(result.token).toBe('token-falso');
    expect(result.user).toMatchObject({
      id: usuario.id,
      email: usuario.email,
      name: usuario.name,
    });
    expect(result.user).not.toHaveProperty('password');
  });

  it('rejects with 409 when the email is already registered', async () => {
    (mockRepo.findByEmail as ReturnType<typeof vi.fn>).mockResolvedValueOnce(makeUser());

    await expect(registerUser(mockRepo, REGISTRO)).rejects.toMatchObject({
      statusCode: 409,
      message: 'El email ya está registrado',
    });

    expect(mockRepo.create).not.toHaveBeenCalled();
    expect(mockBcryptHash).not.toHaveBeenCalled();
  });
});

describe('loginUser — iniciar sesión', () => {
  it('returns the public user with a token for valid credentials', async () => {
    const usuario = makeUser();
    (mockRepo.findByEmail as ReturnType<typeof vi.fn>).mockResolvedValueOnce(usuario);
    mockBcryptCompare.mockResolvedValueOnce(true);
    mockJwtSign.mockReturnValueOnce('token-falso');

    const result = await loginUser(mockRepo, CREDENCIALES);

    expect(mockBcryptCompare).toHaveBeenCalledWith(
      CREDENCIALES.password,
      usuario.password,
    );
    expect(mockJwtSign).toHaveBeenCalledWith(
      { id: usuario.id, role: usuario.role },
      'secreto-de-prueba',
      { expiresIn: expect.any(String) },
    );
    expect(result.token).toBe('token-falso');
    expect(result.user).not.toHaveProperty('password');
  });

  it('rejects with 401 when the user does not exist', async () => {
    (mockRepo.findByEmail as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

    await expect(loginUser(mockRepo, CREDENCIALES)).rejects.toMatchObject({
      statusCode: 401,
      message: 'Credenciales inválidas',
    });

    expect(mockBcryptCompare).not.toHaveBeenCalled();
  });

  it('rejects with 401 on a wrong password', async () => {
    (mockRepo.findByEmail as ReturnType<typeof vi.fn>).mockResolvedValueOnce(makeUser());
    mockBcryptCompare.mockResolvedValueOnce(false);

    await expect(loginUser(mockRepo, CREDENCIALES)).rejects.toMatchObject({
      statusCode: 401,
      message: 'Credenciales inválidas',
    });

    expect(mockJwtSign).not.toHaveBeenCalled();
  });

  it('rejects with 403 for a banned user including the reason', async () => {
    (mockRepo.findByEmail as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      makeUser({ banned: true, banReason: 'fraude en pagos' }),
    );
    mockBcryptCompare.mockResolvedValueOnce(true);

    await expect(loginUser(mockRepo, CREDENCIALES)).rejects.toMatchObject({
      statusCode: 403,
      message: 'Tu cuenta ha sido suspendida. Motivo: fraude en pagos',
    });

    expect(mockJwtSign).not.toHaveBeenCalled();
  });

  it('rejects with 403 for a banned user without a reason', async () => {
    (mockRepo.findByEmail as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      makeUser({ banned: true, banReason: null }),
    );
    mockBcryptCompare.mockResolvedValueOnce(true);

    await expect(loginUser(mockRepo, CREDENCIALES)).rejects.toMatchObject({
      statusCode: 403,
      message: 'Tu cuenta ha sido suspendida.',
    });
  });
});

describe('configuración del módulo (JWT_EXPIRES_IN)', () => {
  it('defaults the expiry to 7d when JWT_EXPIRES_IN is not defined', async () => {
    delete process.env.JWT_EXPIRES_IN;
    vi.resetModules();
    const { registerUser: registrar } = await import(
      '../../../src/application/use-cases/auth.use-cases.ts'
    );

    (mockRepo.findByEmail as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
    mockBcryptHash.mockResolvedValueOnce('password-hasheada');
    (mockRepo.create as ReturnType<typeof vi.fn>).mockResolvedValueOnce(makeUser());

    await registrar(mockRepo, REGISTRO);

    expect(mockJwtSign).toHaveBeenCalledWith(
      { id: 'u1', role: 'USER' },
      'secreto-de-prueba',
      { expiresIn: '7d' },
    );
  });

  it('uses JWT_EXPIRES_IN from the environment when it is set', async () => {
    process.env.JWT_EXPIRES_IN = '2h';
    vi.resetModules();
    const { registerUser: registrar } = await import(
      '../../../src/application/use-cases/auth.use-cases.ts'
    );

    (mockRepo.findByEmail as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
    mockBcryptHash.mockResolvedValueOnce('password-hasheada');
    (mockRepo.create as ReturnType<typeof vi.fn>).mockResolvedValueOnce(makeUser());

    await registrar(mockRepo, REGISTRO);

    expect(mockJwtSign).toHaveBeenCalledWith(
      { id: 'u1', role: 'USER' },
      'secreto-de-prueba',
      { expiresIn: '2h' },
    );
  });
});