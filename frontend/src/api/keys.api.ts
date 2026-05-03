export const keysApi = {
  getAll: async () => {
    try {
      const saved = localStorage.getItem('apiKeyVault');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  },

  add: async (key: string) => {
    const newKey = { _id: Date.now().toString(), key, creditsRemaining: undefined, lastChecked: undefined };
    try {
      const saved = localStorage.getItem('apiKeyVault');
      const keys = saved ? JSON.parse(saved) : [];
      localStorage.setItem('apiKeyVault', JSON.stringify([newKey, ...keys]));
    } catch (e) {}
    return newKey;
  },

  remove: async (id: string) => {
    try {
      const saved = localStorage.getItem('apiKeyVault');
      if (!saved) return;
      const keys = JSON.parse(saved).filter((k: any) => k._id !== id);
      localStorage.setItem('apiKeyVault', JSON.stringify(keys));
    } catch (e) {}
  },

  updateCredits: async (key: string, remaining: number) => {
    try {
      const saved = localStorage.getItem('apiKeyVault');
      if (!saved) return;
      const keys = JSON.parse(saved);
      const updated = keys.map((k: any) =>
        k.key === key ? { ...k, creditsRemaining: remaining, lastChecked: new Date().toISOString() } : k
      );
      localStorage.setItem('apiKeyVault', JSON.stringify(updated));
      return updated.find((k: any) => k.key === key);
    } catch (e) {}
  },
};