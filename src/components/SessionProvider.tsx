"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { getSession } from "@/lib/auth";
import { Customer } from "@/lib/types";

/**
 * Dispatch this window event after any action that changes the signed-in
 * customer's server-side data (wallet refunds, payments, profile updates).
 * The navbar wallet pill updates immediately without a manual page visit.
 */
export const SESSION_REFRESH_EVENT = "sg:session-refresh";

export function notifySessionChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(SESSION_REFRESH_EVENT));
  }
}

interface SessionContextValue {
  customer: Customer | null;
  loading: boolean;
  refresh: () => Promise<void>;
  setCustomer: (customer: Customer | null) => void;
}

const SessionContext = createContext<SessionContextValue>({
  customer: null,
  loading: true,
  refresh: async () => {},
  setCustomer: () => {},
});

export function useSession(): SessionContextValue {
  return useContext(SessionContext);
}

const REFRESH_THROTTLE_MS = 5000;

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const lastRefreshAt = useRef(0);

  const refresh = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && now - lastRefreshAt.current < REFRESH_THROTTLE_MS) return;
    lastRefreshAt.current = now;
    try {
      const session = await getSession();
      setCustomer(session);
    } catch {
      // Transient DB/session errors must never blank the navbar — keep the
      // previous customer data until the next refresh succeeds.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Async microtask keeps the setState out of the synchronous effect body
    // (react-hooks/set-state-in-effect) while still loading on mount.
    let cancelled = false;
    void Promise.resolve().then(async () => {
      await refresh(true);
      void cancelled;
    });
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  useEffect(() => {
    const onEvent = () => {
      refresh(true);
    };
    const onFocus = () => {
      refresh();
    };
    window.addEventListener(SESSION_REFRESH_EVENT, onEvent);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener(SESSION_REFRESH_EVENT, onEvent);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  return (
    <SessionContext.Provider value={{ customer, loading, refresh, setCustomer }}>
      {children}
    </SessionContext.Provider>
  );
}
