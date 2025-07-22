// src/app/api/portfolio/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/lib/services/userService';
import { auth } from '@clerk/nextjs/server';

// Helper to convert BigInt to string recursively
function convertBigIntToString(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(convertBigIntToString);
  } else if (obj && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k, typeof v === 'bigint' ? v.toString() : convertBigIntToString(v)])
    );
  }
  return obj;
}

// GET /api/portfolio - Get user's portfolio
export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get or create user in our database
    const user = await UserService.getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get user's portfolio
    const portfolio = await UserService.getUserPortfolio(user.id);

    return NextResponse.json(convertBigIntToString({
      success: true,
      data: portfolio
    }));

  } catch (error) {
    console.error('Error in GET /api/portfolio:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}