import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { AppShellSkeleton } from "@/components/AppShellSkeleton";
import { useAuth } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc";

interface ProtectedRouteProps {
  component: React.ComponentType<any>;
  [key: string]: any;
}

export function ProtectedRoute({
  component: Component,
  ...props
}: ProtectedRouteProps) {
  const { user, isAuthenticated, loading, isMfaVerified, markMfaVerified } =
    useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [checkingMfa, setCheckingMfa] = useState(false);
  const [mfaAllowed, setMfaAllowed] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated || !user) {
      setMfaAllowed(false);
      setLocation("/login");
      return;
    }

    // Reset allowance so a previous authenticated user's state never bleeds over
    setMfaAllowed(false);

    // 1. Fast path: check if session already verified for this user
    if (isMfaVerified(user.id)) {
      setMfaAllowed(true);
      return;
    }

    // 2. Server-side source of truth (staleTime: 30s)
    let isCancelled = false;
    setCheckingMfa(true);

    utils.auth["mfa.status"]
      .fetch(undefined, { staleTime: 30_000 })
      .then((status) => {
        if (isCancelled) return;
        if (status?.enabled) {
          setLocation("/login?challenge=mfa");
        } else {
          markMfaVerified(user.id);
          setMfaAllowed(true);
        }
      })
      .catch((err) => {
        if (isCancelled) return;
        console.error(
          "[ProtectedRoute] Failed to verify MFA status, failing closed:",
          err,
        );
        setLocation("/login");
      })
      .finally(() => {
        if (!isCancelled) {
          setCheckingMfa(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [
    isAuthenticated,
    loading,
    user,
    isMfaVerified,
    markMfaVerified,
    setLocation,
    utils,
  ]);

  if (loading || checkingMfa || (!mfaAllowed && isAuthenticated)) {
    return <AppShellSkeleton />;
  }

  if (!isAuthenticated || !mfaAllowed) {
    return null;
  }

  return <Component {...props} />;
}

