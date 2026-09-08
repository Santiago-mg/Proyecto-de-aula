import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { IAdminRepository, AdminStats, AdminUser } from '../../../src/domain/repositories/IAdminRepository';


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
	    	id: '1',
		email: 'user1@gmail.com',
		name: 'Jhon Doe',
		role: 'USER',
		banned: false,
		banReason: null,
		bannedAt: null,
		createdAt: new Date(),
		updatedAt: new Date(),
		orderCount: 0
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

describe('Change user role', () => {
    it('Changes the role of a valid user', async () => {
	const repo = new AdminRepository();

        const user = await repo.changeRole('1', 'ADMIN');

	expect(user.role).toBe('ADMIN');
    });

    it('Does not allow an Admin to change their own role', async () => {
    	const repo = new AdminRepository();

	await expect(repo.changeRole('2', 'USER')).rejects;
    });
});
