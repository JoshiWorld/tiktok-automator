"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { TIKTOK_ACTIVE_ACCOUNT_STORAGE_KEY } from "@/constants/storage-keys";
import { api, type RouterOutputs } from "@/trpc/react";

export type ConnectedTikTokAccount =
  RouterOutputs["tiktokAccount"]["list"][number];

type AccountListQuery = ReturnType<typeof api.tiktokAccount.list.useQuery>;

type Ctx = {
  /** Nur Konten ohne disconnectedAt */
  accounts: ConnectedTikTokAccount[];
  /** Aus list-Query inkl. getrennte */
  allAccounts: ConnectedTikTokAccount[];
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  hydrated: boolean;
  isLoading: boolean;
  error: AccountListQuery["error"];
};

const ActiveTikTokAccountCtx = createContext<Ctx | null>(null);

export function ActiveTikTokAccountProvider({
  children,
}: {
  children: ReactNode;
}) {
  const accountsQuery = api.tiktokAccount.list.useQuery();

  const connected = useMemo(() => {
    const list = accountsQuery.data ?? [];
    return list.filter((a) => !a.disconnectedAt);
  }, [accountsQuery.data]);

  const [persistedId, setPersistedId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(TIKTOK_ACTIVE_ACCOUNT_STORAGE_KEY);
      setPersistedId(raw && raw.length > 0 ? raw : null);
    } catch {
      setPersistedId(null);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || !accountsQuery.data) return;
    if (
      persistedId !== null &&
      persistedId.length > 0 &&
      !connected.some((a) => a.id === persistedId)
    ) {
      try {
        localStorage.removeItem(TIKTOK_ACTIVE_ACCOUNT_STORAGE_KEY);
      } catch {
        /* ignore */
      }
      setPersistedId(null);
    }
  }, [hydrated, persistedId, connected, accountsQuery.data]);

  const selectedId = useMemo(() => {
    if (!hydrated) return null;
    if (
      persistedId !== null &&
      persistedId.length > 0 &&
      connected.some((a) => a.id === persistedId)
    ) {
      return persistedId;
    }
    return connected[0]?.id ?? null;
  }, [hydrated, persistedId, connected]);

  const setSelectedId = useCallback((id: string | null) => {
    setPersistedId(id);
    try {
      if (id !== null && id.length > 0) {
        localStorage.setItem(TIKTOK_ACTIVE_ACCOUNT_STORAGE_KEY, id);
      } else {
        localStorage.removeItem(TIKTOK_ACTIVE_ACCOUNT_STORAGE_KEY);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(
    () =>
      ({
        accounts: connected,
        allAccounts: accountsQuery.data ?? [],
        selectedId,
        setSelectedId,
        hydrated,
        isLoading: accountsQuery.isLoading,
        error: accountsQuery.error,
      }) satisfies Ctx,
    [
      connected,
      accountsQuery.data,
      accountsQuery.isLoading,
      accountsQuery.error,
      selectedId,
      setSelectedId,
      hydrated,
    ],
  );

  return (
    <ActiveTikTokAccountCtx.Provider value={value}>
      {children}
    </ActiveTikTokAccountCtx.Provider>
  );
}

export function useSelectedTikTokAccount() {
  const ctx = useContext(ActiveTikTokAccountCtx);
  if (!ctx) {
    throw new Error(
      "useSelectedTikTokAccount muss innerhalb von ActiveTikTokAccountProvider verwendet werden.",
    );
  }
  return ctx;
}
