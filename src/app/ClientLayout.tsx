"use client";
import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
  useUser,
} from "@clerk/nextjs";
import { useEffect } from "react";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isSignedIn } = useUser();

  useEffect(() => {
    if (!isSignedIn) return;
    
    // Call once on login
    fetch("/api/stocks/update-realtime", { method: "POST" });
    
    // Set up interval
    const interval = setInterval(() => {
      fetch("/api/stocks/update-realtime", { method: "POST" });
    }, 60_000);
    
    return () => clearInterval(interval);
  }, [isSignedIn]);

  return (
    <>
      <header>
        <SignedOut>
          <SignInButton />
          <SignUpButton />
        </SignedOut>
        <SignedIn>
          <UserButton />
        </SignedIn>
      </header>
      {children}
    </>
  );
}