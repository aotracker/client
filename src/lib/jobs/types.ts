export interface BattleSyncJobInfo {
  state: string | null;
  lastError: string | null;
  createdAt: number | null;
  runAt: number | null;
  delayMs: number | null;
  notReadySince: number | null;
  notReadyDefers: number;
  waitingOnAlbionApi: boolean;
  apiWaitMs: number | null;
  showApiDelayNotice: boolean;
  detailUnavailable: boolean;
  detailUnavailableError: string | null;
}

export interface QueueJobSummary {
  id: string;
  name: string;
  queue: string;
  state: "active" | "waiting" | "delayed" | "failed" | "completed";
  dbStatus: "pending" | "processing" | "failed" | "completed";
  data: Record<string, unknown>;
  timestamp: number | null;
  processedOn: number | null;
  completedOn: number | null;
  runAt: number | null;
  failedReason: string | null;
  delay: number | null;
}

export interface QueueStatusSnapshot {
  counts: {
    waiting: number;
    active: number;
    delayed: number;
    failed: number;
    completed: number;
  };
  jobs: QueueJobSummary[];
}
