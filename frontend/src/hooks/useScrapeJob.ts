import { useState, useEffect, useRef } from 'react';
import { startScrape, fetchJobStatus } from '../api/scraper.api';
import type { Job } from '../types/job.types';

const API = import.meta.env.VITE_API_URL;

export function useScrapeJob() {
  const [jobId, setJobId]     = useState<string | null>(null);
  const [job, setJob]         = useState<Job | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [logs, setLogs]       = useState<string[]>([]);

  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const esRef        = useRef<EventSource | null>(null);

  const stopPolling = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const stopLogs = () => {
    if (esRef.current) { esRef.current.close(); esRef.current = null; }
  };

  const start = async (
    keyword: string,
    email?: string | null,
    pushSubscription?: PushSubscription | null
  ) => {
    setLoading(true);
    setError(null);
    setJob(null);
    setLogs([]);
    try {
      const { jobId: id } = await startScrape(keyword, email, pushSubscription);
      setJobId(id);
    } catch (e) {
      setError('Could not start scrape. Is the backend running?');
      setLoading(false);
      console.error('start error:', e);
    }
  };

  // Status polling
  useEffect(() => {
    if (!jobId) return;

    const poll = async () => {
      try {
        const data = await fetchJobStatus(jobId);
        setJob(data);
        setLoading(false);
        if (data.status === 'completed' || data.status === 'failed') {
          stopPolling();
          stopLogs();
        }
      } catch (e) {
        setError('Lost connection to backend');
        stopPolling();
        stopLogs();
        console.error('poll error:', e);
      }
    };

    poll();
    intervalRef.current = setInterval(poll, 5000);
    return stopPolling;
  }, [jobId]);

  // SSE log stream
  useEffect(() => {
    if (!jobId) return;

    const es = new EventSource(`${API}/api/scrape/${jobId}/logs`);
    esRef.current = es;

    es.onmessage = (event) => {
      const msg = JSON.parse(event.data) as string;
      setLogs(prev => [...prev.slice(-500), msg]); // keep last 500 lines
    };

    es.onerror = () => es.close();

    return stopLogs;
  }, [jobId]);

  return { job, loading, error, start, jobId, logs };
}