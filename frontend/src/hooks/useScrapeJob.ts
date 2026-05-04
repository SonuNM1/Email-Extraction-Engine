import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import type { Job } from "../types/job.types";

const API = import.meta.env.VITE_API_URL || "";

export interface JobEntry {
  jobId: string;
  keyword: string;
  location: string;
  job: Job | null;
  logs: string[];
  loading: boolean;
  error: string | null;
}

const ACTIVE_JOBS_KEY = "activeJobIds";

function saveActiveJobs(jobs: JobEntry[]) {
  const running = jobs
    .filter(
      (j) => !["completed", "stopped", "failed"].includes(j.job?.status ?? ""),
    )
    .map((j) => ({ jobId: j.jobId, keyword: j.keyword, location: j.location }));
  localStorage.setItem(ACTIVE_JOBS_KEY, JSON.stringify(running));
}

function loadActiveJobs(): {
  jobId: string;
  keyword: string;
  location: string;
}[] {
  try {
    const saved = localStorage.getItem(ACTIVE_JOBS_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    return [];
  }
}

async function fetchJobStatus(jobId: string) {
  const res = await axios.get(`${API}/api/scrape/${jobId}/status`);
  return res.data;
}

async function apiStartScrape(keyword: string, serperKey: string | null) {
  const res = await axios.post(`${API}/api/scrape`, { keyword, serperKey });
  return res.data;
}

export function useScrapeJobs(
  onCreditsUpdate?: (key: string, remaining: number) => void,
) {
  const [jobs, setJobs] = useState<JobEntry[]>([]);
  const didRestore = useRef(false);
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

          if (serperKey) {
            const remaining =
              data.creditsExhausted && data.creditsRemaining == null
                ? 0
                : data.creditsRemaining;
            if (remaining != null) {
              onCreditsUpdate?.(serperKey, remaining);
            }
          }

          if (data.status === "completed") {
            stopPolling(jobId);
            stopLogs(jobId);
            toast.success(`✅ Done — ${data.totalEmailsFound} emails found`, {
              id: jobId,
              duration: 6000,
            });
            if (data.creditsExhausted) {
              toast.warning(
                `🚫 Credits exhausted — add a new key to continue`,
                {
                  duration: 8000,
                },
              );
            }
            triggerDownload(jobId, keyword);
            if (serperKey) {
              const remaining =
                data.creditsExhausted && data.creditsRemaining == null
                  ? 0
                  : data.creditsRemaining;
              if (remaining != null) {
                onCreditsUpdate?.(serperKey, remaining);
              }
            }
          }

          if (data.status === "stopped") {
            stopPolling(jobId);
            stopLogs(jobId);
            if (data.creditsExhausted) {
              toast.warning(
                `🚫 Credits exhausted — ${data.totalEmailsFound} emails saved. Add a new key.`,
                { id: jobId, duration: 8000 },
              );
            } else {
              toast.warning(
                `⏹️ Stopped — ${data.totalEmailsFound} emails saved`,
                { id: jobId, duration: 6000 },
              );
            }
            triggerDownload(jobId, keyword);
            if (serperKey) {
              const remaining =
                data.creditsExhausted && data.creditsRemaining == null
                  ? 0
                  : data.creditsRemaining;
              if (remaining != null) {
                onCreditsUpdate?.(serperKey, remaining);
              }
            }
          }

          if (data.status === "failed") {
            stopPolling(jobId);
            stopLogs(jobId);
            toast.error(`❌ Job failed`, { id: jobId });
          }
        } catch (err: any) {
          const msg =
            err?.response?.status === 503
              ? "Server offline — check Railway dashboard"
              : err?.response?.status === 404
                ? "Job not found"
                : err?.message || "Lost connection";
          updateJob(jobId, { error: msg });
          stopPolling(jobId);
          stopLogs(jobId);
        }
      };
      poll();
      intervalsRef.current[jobId] = setInterval(poll, 5000);
    },
    [onCreditsUpdate],
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

  // Save active jobs whenever jobs state changes
  useEffect(() => {
    saveActiveJobs(jobs);
  }, [jobs]);

  // On mount — restore any jobs that were running before page closed
  useEffect(() => {
    if (didRestore.current) return;
    didRestore.current = true;
    const saved = loadActiveJobs();
    if (!saved.length) return;
    const restored: JobEntry[] = saved.map((s) => ({
      jobId: s.jobId,
      keyword: s.keyword,
      location: s.location,
      job: null,
      logs: [],
      loading: true,
      error: null,
    }));
    setJobs(restored);
    restored.forEach((entry) => {
      attachPoller(entry.jobId, entry.keyword, null);
      attachLogStream(entry.jobId);
    });
  }, [attachPoller, attachLogStream]);

  useEffect(
    () => () => {
      Object.values(intervalsRef.current).forEach(clearInterval);
      Object.values(esRef.current).forEach((es) => es.close());
    },
    [],
  );

  return { jobs, start, stop, remove };
}
