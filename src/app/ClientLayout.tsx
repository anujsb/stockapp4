"use client";
import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
  useUser,
} from "@clerk/nextjs";
import { useUpdateManager } from "@/lib/hooks/useUpdateManager";
import Link from "next/link";
import { TrendingUp, Activity, Clock, User, LogOut } from "lucide-react";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isSignedIn, user } = useUser();
  const updateManager = useUpdateManager();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r from-blue-500 to-purple-600">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">StockSense</span>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <SignedIn>
                <Link href="/dashboard" className="text-gray-700 hover:text-gray-900 font-medium">
                  Dashboard
                </Link>
                <Link href="/portfolio" className="text-gray-700 hover:text-gray-900 font-medium">
                  Portfolio
                </Link>
                <Link href="/stocks" className="text-gray-700 hover:text-gray-900 font-medium">
                  Stocks
                </Link>
              </SignedIn>
            </nav>

            {/* Auth & Status */}
            <div className="flex items-center space-x-4">
              <SignedIn>
                {/* Update Status Indicator */}
                <div className="hidden sm:flex items-center space-x-2 text-sm">
                  {updateManager.status.realTime.isActive ? (
                    <div className="flex items-center space-x-1 text-green-600">
                      <Activity className="h-4 w-4" />
                      <span>Live</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1 text-gray-400">
                      <Clock className="h-4 w-4" />
                      <span>Offline</span>
                    </div>
                  )}
                </div>
                <UserButton 
                  appearance={{
                    elements: {
                      avatarBox: "w-8 h-8"
                    }
                  }}
                  afterSignOutUrl="/"
                />
              </SignedIn>
              <SignedOut>
                <Link 
                  href="/sign-in"
                  className="text-gray-700 hover:text-gray-900 font-medium"
                >
                  Sign In
                </Link>
                <Link 
                  href="/sign-up"
                  className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all"
                >
                  Get Started
                </Link>
              </SignedOut>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>
        {children}
      </main>

      {/* Update Status Footer (only when signed in) */}
      <SignedIn>
        {updateManager.isLoading && (
          <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span className="text-sm">Updating stocks...</span>
          </div>
        )}
        
        {updateManager.error && (
          <div className="fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg max-w-sm">
            <div className="text-sm">
              <div className="font-medium">Update Error</div>
              <div className="text-red-100">{updateManager.error}</div>
            </div>
          </div>
        )}
      </SignedIn>
    </div>
  );
}
