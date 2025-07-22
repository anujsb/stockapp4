// src/lib/services/userService.ts
import { db } from '@/lib/db';
import { users, userStocks, stocks } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { currentUser } from '@clerk/nextjs/server';

export interface CreateUserParams {
  clerkId: string;
  email: string;
  username?: string;
}

export class UserService {
  /**
   * Create or get user from Clerk data
   */
  static async createOrGetUser(userData: CreateUserParams) {
    try {
      // Check if user already exists
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.clerkId, userData.clerkId))
        .limit(1);

      if (existingUser.length > 0) {
        // Update last login
        const updatedUser = await db
          .update(users)
          .set({ lastLogin: new Date() })
          .where(eq(users.clerkId, userData.clerkId))
          .returning();
        
        return updatedUser[0];
      }

      // Create new user
      const newUser = await db
        .insert(users)
        .values({
          clerkId: userData.clerkId,
          email: userData.email,
          username: userData.username,
          lastLogin: new Date(),
        })
        .returning();

      return newUser[0];
    } catch (error) {
      console.error('Error creating or getting user:', error);
      throw new Error('Failed to create or get user');
    }
  }

  /**
   * Get current user from Clerk
   */
  static async getCurrentUser() {
    try {
      const clerkUser = await currentUser();
      if (!clerkUser) return null;

      const dbUser = await db
        .select()
        .from(users)
        .where(eq(users.clerkId, clerkUser.id))
        .limit(1);

      if (dbUser.length === 0) {
        // Create user if doesn't exist
        return await this.createOrGetUser({
          clerkId: clerkUser.id,
          email: clerkUser.emailAddresses[0]?.emailAddress || '',
          username: clerkUser.username || clerkUser.firstName || undefined,
        });
      }

      return dbUser[0];
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  /**
   * Add stock to user's portfolio
   */
  static async addStockToPortfolio(
    userId: number,
    stockId: number,
    quantity: number,
    buyPrice: number
  ) {
    try {
      // Check if user already owns this stock
      const existingUserStock = await db
        .select()
        .from(userStocks)
        .where(eq(userStocks.userId, userId) && eq(userStocks.stockId, stockId))
        .limit(1);

      if (existingUserStock.length > 0) {
        // Update existing position (average cost basis)
        const existing = existingUserStock[0];
        const totalValue = (existing.quantity * Number(existing.buyPrice)) + (quantity * buyPrice);
        const totalQuantity = existing.quantity + quantity;
        const avgPrice = totalValue / totalQuantity;

        return await db
          .update(userStocks)
          .set({
            quantity: totalQuantity,
            buyPrice: avgPrice.toString(),
            updatedAt: new Date(),
          })
          .where(eq(userStocks.id, existing.id))
          .returning();
      } else {
        // Create new position
        return await db
          .insert(userStocks)
          .values({
            userId,
            stockId,
            quantity,
            buyPrice: buyPrice.toString(),
          })
          .returning();
      }
    } catch (error) {
      console.error('Error adding stock to portfolio:', error);
      throw new Error('Failed to add stock to portfolio');
    }
  }

  /**
   * Get user's portfolio
   */
  static async getUserPortfolio(userId: number) {
    try {
      return await db
        .select({
          id: userStocks.id,
          quantity: userStocks.quantity,
          buyPrice: userStocks.buyPrice,
          addedAt: userStocks.addedAt,
          updatedAt: userStocks.updatedAt,
          stock: {
            id: stocks.id,
            symbol: stocks.symbol,
            name: stocks.name,
            exchange: stocks.exchange,
          }
        })
        .from(userStocks)
        .leftJoin(stocks, eq(userStocks.stockId, stocks.id))
        .where(eq(userStocks.userId, userId));
    } catch (error) {
      console.error('Error getting user portfolio:', error);
      return [];
    }
  }

  /**
   * Remove stock from user's portfolio
   */
  static async removeStockFromPortfolio(userId: number, stockId: number) {
    try {
      return await db
        .delete(userStocks)
        .where(eq(userStocks.userId, userId) && eq(userStocks.stockId, stockId))
        .returning();
    } catch (error) {
      console.error('Error removing stock from portfolio:', error);
      throw new Error('Failed to remove stock from portfolio');
    }
  }
}