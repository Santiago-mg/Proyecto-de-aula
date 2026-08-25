import { describe, it, expect, beforeEach, vi } from 'vitest';
import { changeUserRole } from '../../../src/application/use-cases/admin.use-cases';
import type { AdminUser } from '../../../src/domain/repositories/IAdminRepository';

const mockRepo = {
  getStats: vi.fn(),
  listUsers: vi.fn(),
  banUser: vi.fn(),
  unbanUser: vi.fn(),
  changeRole: vi.fn(),
};

function makeUser(overrides: Partial<AdminUser> = {}): AdminUser {
  return {
    id: 'u1',
    email: 'a@test.com',
    name: 'Ana',
    role: 'USER',
    banned: false,
    banReason: null,
    bannedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    orderCount: 0,
    ...overrides,
  };
}

describe('changeUserRole', () => {
  beforeEach(() => {
    // resetAllMocks also clears mockResolvedValueOnce queues
    vi.resetAllMocks();
  });

  it('promotes USER to ADMIN', async () => {
    const updatedUser = makeUser({ role: 'ADMIN' });
    // Sets up the mock to return a resolved promise to the next call
    mockRepo.changeRole.mockResolvedValueOnce(updatedUser);

    const result = await changeUserRole(mockRepo, 'u1', { role: 'ADMIN' }, 'admin-1');

    expect(result.role).toBe('ADMIN');
    expect(mockRepo.changeRole).toHaveBeenCalledTimes(1);
    expect(mockRepo.changeRole).toHaveBeenCalledWith('u1', 'ADMIN');
  });

  it('rejects changing your own role', async () => {
    await expect(
      changeUserRole(mockRepo, 'u1', { role: 'ADMIN' }, 'u1'),
    ).rejects.toMatchObject({ statusCode: 400 });

    expect(mockRepo.changeRole).not.toHaveBeenCalled();
  });

  it('changes from ADMIN to USER', async () => {
    const updatedUser = makeUser({ role: 'USER' });

    mockRepo.changeRole.mockResolvedValueOnce(updatedUser);

    const result = await changeUserRole(mockRepo, 'u1', { role: 'USER' }, 'admin-1');

    expect(result.role).toBe('USER');
    expect(mockRepo.changeRole).toHaveBeenCalledTimes(1);
    expect(mockRepo.changeRole).toHaveBeenCalledWith('u1', 'USER');
  });
});
