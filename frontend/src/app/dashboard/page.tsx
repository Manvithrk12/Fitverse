"use client";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/lib/auth-context";

function DashboardContent() {
  const { user, logout } = useAuth();

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-bold">Welcome, {user?.email}</h1>
      <p className="text-sm text-gray-500">
        Role: {user?.role}. This is a Phase 1 placeholder proving the route is
        protected — the real dashboard arrives in Phase 7.
      </p>
      <button
        onClick={() => logout()}
        className="rounded bg-black px-4 py-2 text-sm font-medium text-white"
      >
        Log out
      </button>
    </main>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}
