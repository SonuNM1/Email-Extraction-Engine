export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'stopped';

export interface Job {
  _id: string;
  keyword: string;
  location: string;
  status: JobStatus;
  totalEmailsFound?: number;
  emailsFound?: number;
  serperCreditsUsed?: number;
  creditsExhausted?: boolean;
  filePath?: string;
  startedAt?: string;
  completedAt?: string;
  stoppedAt?: string;
}