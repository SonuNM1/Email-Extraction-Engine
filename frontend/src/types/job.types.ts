export type LocationStatus = 'pending' | 'running' | 'done' | 'failed' ; 
export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' ; 

export interface LocationEntry { 
    name: string, 
    status: LocationStatus, 
    emailsFound: number 
}

export interface JobProgress {
  completed: number;
  total: number;
  currentLocation: string;
}

export interface Job {
    _id: string; 
    keyword: string; 
    status: JobStatus; 
    progress: JobProgress; 
    locations: LocationEntry[]; 
}

