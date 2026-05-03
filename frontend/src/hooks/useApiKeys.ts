import { useState, useEffect } from "react";
import { keysApi } from "../api/keys.api";

export interface StoredKey {
  _id: string;
  key: string;
  creditsRemaining?: number;
  lastChecked?: string;
}

const LS_KEY = "apiKeyVault";

function persist(keys: StoredKey[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(keys));
}

export function useApiKeys() {
  const [keys, setKeys] = useState<StoredKey[]>(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    keysApi
      .getAll()
      .then((dbKeys: StoredKey[]) => {
        setKeys(dbKeys);
        persist(dbKeys);
      })
      .catch((e) => {});
  }, []);

  const addKey = async (key: string) => {
    if (keys.some((k) => k.key === key)) return;
    try {
      const created: StoredKey = await keysApi.add(key);
      const updated = [created, ...keys];
      setKeys(updated);
      persist(updated);
    } catch (e) {}
  };

  const removeKey = async (id: string) => {
    try {
      await keysApi.remove(id);
      const updated = keys.filter((k) => k._id !== id);
      setKeys(updated);
      persist(updated);
    } catch (e) {}
  };

  const updateCredits = async (key: string, creditsRemaining: number) => {
    try {
      setKeys((prev) => {
        const next = prev.map((k) =>
          k.key === key
            ? { ...k, creditsRemaining, lastChecked: new Date().toISOString() }
            : k,
        );
        persist(next);
        return next;
      });
      await keysApi.updateCredits(key, creditsRemaining);
    } catch (e) {}
  };

  return { keys, addKey, removeKey, updateCredits };
}
