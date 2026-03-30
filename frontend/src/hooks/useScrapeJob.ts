import { useState, useEffect, useRef } from "react";
import { startScrape, fetchJobStatus } from "../api/scraper.api";
import type { Job } from "../types/job.types";

export function useScrapeJob() {
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const start = async (keyword: string) => {
    setLoading(true);
    setError(null);

    try {
      const { jobId: id } = await startScrape(keyword);
      setJobId(id);
    } catch (e) {
      setError("Could not start scrape. Is the backend running?");
      setLoading(false);
      console.log("start error: ", e)
    }
  };

  // when jobId is set, start polling every 5 seconds 

  useEffect(() => {
    if(!jobId) return ; 

    const poll = async () => {
        try {
            const data = await fetchJobStatus(jobId) ; 
            setJob(data) ; 
            setLoading(false) ; 

            if(data.status === "completed" || data.status === "failed"){
                stopPolling() ; 
            }
        } catch (error) {
            setError("Lost connection to backend") ; 
            stopPolling() ; 
            console.log("poll error: ", error) ; 
        }
    }

    poll() ; 
    intervalRef.current = setInterval(poll, 5000) ; 
    
    return stopPolling ; 
  }, [jobId])

  return {
    job, 
    loading, 
    error, 
    start, 
    jobId 
  }
}
