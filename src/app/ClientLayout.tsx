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
