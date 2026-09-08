import { describe, it, expect, beforeEach} from 'vitest';
import { changeUserRole } from '../../../src/application/use-cases/admin.use-cases';
import type { AdminUser } from '../../../src/domain/repositories/IAdminRepository';

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

// Repositorio simulado de AdminRepository
class AdminRepository implements IAdminRepository {
    async getStats(): Promise<AdminStats> {
    	const now = new Date()
    	const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
   	const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

        const [totalUsers, bannedUsers, newUsers, adminUsers] = [2, 0, 0, 1];
    	const [totalPhones, inStockPhones, verifiedPhones] = [0, 0, 0];
    	const [orderStats, revenueThisMonth, recentOrders] = [null, 0, 0];
    	const last7DaysOrders = 0;
    	const last7Days = [];
    	const dailyRevenue = 0;

    	return {
      	    users: {
            	total: totalUsers,
            	banned: bannedUsers,
            	newThisWeek: newUsers,
            	admins: adminUsers,
      	    },
      	    phones: {
        	total: totalPhones,
        	inStock: inStockPhones,
        	outOfStock: totalPhones - inStockPhones,
        	verified: verifiedPhones,
      	    },
      	    orders: {
        	total: 0,
        	pending: statusMap['PENDING']?.count ?? 0,
        	confirmed: statusMap['CONFIRMED']?.count ?? 0,
        	shipped: statusMap['SHIPPED']?.count ?? 0,
        	delivered: statusMap['DELIVERED']?.count ?? 0,
        	cancelled: statusMap['CANCELLED']?.count ?? 0,
        	revenue: totalRevenue,
        	revenueThisMonth: revenueThisMonth._sum.total ?? 0,
      	    },
      	    revenueByDay: dailyRevenue,
      	    recentOrders: [],
	}
    }

    async changeRole(userId: string, role: 'USER' | 'ADMIN'): AdminUser {
    	const users = [
	    {
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
	    },
	    {
		id: '2',
		email: 'user2@gmail.com',
		name: 'Mary Jane',
		role: 'ADMIN',
		banned: false,
		banReason: null,
		bannedAt: null,
		createdAt: new Date(),
		updatedAt: new Date(),
		orderCount: 0
	    }
	];

	const user = users.find(u => u.id === userId);
	user.role = role;

	return user;
    }
}

describe('changeUserRole', () => {
  it('promotes USER to ADMIN', async () => {
    const updatedUser = makeUser({ role: 'ADMIN' });
    // Sets up the mock to return a resolved promise to the next call

    const result = await changeUserRole(new AdminRepository(), 'u1', { role: 'ADMIN' }, 'admin-1');

    expect(result.role).toBe('ADMIN');
  });

  it('rejects changing your own role', async () => {
    await expect(
      changeUserRole(new AdminRepository(), 'u1', { role: 'ADMIN' }, 'u1'),
    ).rejects.toMatchObject({ statusCode: 400 });

  });

  it('changes from ADMIN to USER', async () => {
    const updatedUser = makeUser({ role: 'USER' });

    const result = await changeUserRole(new AdminRepository(), 'u1', { role: 'USER' }, 'admin-1');

    expect(result.role).toBe('USER');
  });
});
