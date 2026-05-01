import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import type { Job } from "../types/job.types";

const API = import.meta.env.VITE_API_URL || '';

export interface JobEntry {
  jobId: string;
  keyword: string;
  location: string;
  job: Job | null;
  logs: string[];
  loading: boolean;
  error: string | null;
}

async function fetchJobStatus(jobId: string) {
  const res = await axios.get(`${API}/api/scrape/${jobId}/status`);
  return res.data;
}

async function apiStartScrape(keyword: string, serperKey: string | null) {
  const res = await axios.post(`${API}/api/scrape`, { keyword, serperKey });
  return res.data;
}

function saveCreditsToVault(key: string | null, remaining: number | null) {
  if (!key || remaining === null || remaining === undefined) return;
  try {
    const saved = localStorage.getItem("apiKeyVault");
    if (!saved) return;
    const keys = JSON.parse(saved);
    const updated = keys.map((k: any) =>
      k.key === key
        ? {
            ...k,
            creditsRemaining: remaining,
            lastChecked: new Date().toISOString(),
          }
        : k,
    );
    localStorage.setItem("apiKeyVault", JSON.stringify(updated));
  } catch (e) {}
}

export function useScrapeJobs() {
  const [jobs, setJobs] = useState<JobEntry[]>([]);
  const intervalsRef = useRef<Record<string, ReturnType<typeof setInterval>>>(
    {},
  );
  const esRef = useRef<Record<string, EventSource>>({});

  const updateJob = (jobId: string, patch: Partial<JobEntry>) =>
    setJobs((prev) =>
      prev.map((j) => (j.jobId === jobId ? { ...j, ...patch } : j)),
    );

  const stopPolling = (jobId: string) => {
    clearInterval(intervalsRef.current[jobId]);
    delete intervalsRef.current[jobId];
  };

  const stopLogs = (jobId: string) => {
    esRef.current[jobId]?.close();
    delete esRef.current[jobId];
  };

  const triggerDownload = (jobId: string, keyword: string) => {
    const a = document.createElement("a");
    a.href = `${API}/api/scrape/${jobId}/download`;
    a.download = `${keyword}-emails.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const attachPoller = useCallback(
    (jobId: string, keyword: string, serperKey: string | null) => {
      const poll = async () => {
        try {
          const data = await fetchJobStatus(jobId);
          updateJob(jobId, { job: data, loading: false });

          if (data.status === "completed") {
            stopPolling(jobId);
            stopLogs(jobId);
            toast.success(`✅ Done — ${data.totalEmailsFound} emails found`, {
              id: jobId,
              duration: 6000,
            });
            triggerDownload(jobId, keyword);
            saveCreditsToVault(serperKey, data.creditsRemaining);
          }
          if (data.status === "stopped") {
            stopPolling(jobId);
            stopLogs(jobId);
            toast.warning(
              `⏹️ Stopped — ${data.totalEmailsFound} emails saved`,
              {
                id: jobId,
                duration: 6000,
              },
            );
            triggerDownload(jobId, keyword);
            saveCreditsToVault(serperKey, data.creditsRemaining);
          }
          if (data.status === "failed") {
            stopPolling(jobId);
            stopLogs(jobId);
            toast.error(`❌ Job failed`, { id: jobId });
          }
        } catch {
          updateJob(jobId, { error: "Lost connection" });
          stopPolling(jobId);
          stopLogs(jobId);
        }
      };
      poll();
      intervalsRef.current[jobId] = setInterval(poll, 5000);
    },
    [],
  );

  const attachLogStream = useCallback((jobId: string) => {
    const es = new EventSource(`${API}/api/scrape/${jobId}/logs`);
    esRef.current[jobId] = es;
    es.onmessage = (event) => {
      const msg = JSON.parse(event.data) as string;
      setJobs((prev) =>
        prev.map((j) =>
          j.jobId === jobId ? { ...j, logs: [...j.logs.slice(-500), msg] } : j,
        ),
      );
    };
    es.onerror = () => es.close();
  }, []);

  const start = useCallback(
    async (keyword: string, serperKey: string | null) => {
      const toastId = `start-${Date.now()}`;
      toast.loading(`Starting...`, { id: toastId });
      try {
        const { jobId } = await apiStartScrape(keyword, serperKey);
        const entry: JobEntry = {
          jobId,
          keyword,
          location: "All US Locations",
          job: null,
          logs: [],
          loading: true,
          error: null,
        };
        setJobs((prev) => [entry, ...prev]);
        toast.success(`🚀 Started — "${keyword}" across all 55 locations`, {
          id: toastId,
          duration: 3000,
        });
        attachPoller(jobId, keyword, serperKey);
        attachLogStream(jobId);
        return jobId;
      } catch {
        toast.error(`Failed to start`, { id: toastId });
        return null;
      }
    },
    [attachPoller, attachLogStream],
  );

  const stop = useCallback(async (jobId: string) => {
    try {
      await axios.post(`${API}/api/scrape/${jobId}/stop`);
      toast.info("⏹️ Stop signal sent...", { duration: 4000 });
    } catch {
      toast.error("Failed to stop");
    }
  }, []);

  const remove = useCallback((jobId: string) => {
    stopPolling(jobId);
    stopLogs(jobId);
    setJobs((prev) => prev.filter((j) => j.jobId !== jobId));
  }, []);

  useEffect(
    () => () => {
      Object.values(intervalsRef.current).forEach(clearInterval);
      Object.values(esRef.current).forEach((es) => es.close());
    },
    [],
  );

  return { jobs, start, stop, remove };
}
