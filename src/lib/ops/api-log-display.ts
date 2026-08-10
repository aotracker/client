export type ParsedApiLogDetails = {
  url?: string;
  path?: string;
  method?: string;
  statusCode?: number;
  statusText?: string;
  attempt?: number;
  maxAttempts?: number;
  latencyMs?: number;
  responseBody?: string;
  networkCause?: string;
  timeoutMs?: number;
  region?: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function pickString(
  record: Record<string, unknown>,
  key: string
): string | undefined {
  const value = record[key];
  if (value == null || value === "") return undefined;
  return String(value);
}

function pickNumber(
  record: Record<string, unknown>,
  key: string
): number | undefined {
  const value = record[key];
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return undefined;
}

function parseFromMessage(message?: string | null): ParsedApiLogDetails {
  if (!message) return {};

  const parsed: ParsedApiLogDetails = {};
  const urlMatch = message.match(/url:\s*(https?:\/\/[^\s·]+)/i);
  if (urlMatch) parsed.url = urlMatch[1];

  const httpMatch = message.match(/HTTP (\d+)(?:\s+([^·]+))?/);
  if (httpMatch) {
    parsed.statusCode = Number(httpMatch[1]);
    const statusText = httpMatch[2]?.trim();
    if (statusText) parsed.statusText = statusText;
  }

  const responseMatch = message.match(/response:\s*([^·]+)/);
  if (responseMatch) parsed.responseBody = responseMatch[1].trim();

  const attemptMatch = message.match(/attempt (\d+)\/(\d+)/);
  if (attemptMatch) {
    parsed.attempt = Number(attemptMatch[1]);
    parsed.maxAttempts = Number(attemptMatch[2]);
  }

  const getMatch = message.match(/GET ([^\s·]+)/);
  if (getMatch) parsed.path = getMatch[1];

  const timeoutMatch = message.match(/timeout:\s*(\d+)ms/i);
  if (timeoutMatch) parsed.timeoutMs = Number(timeoutMatch[1]);

  const causeMatch = message.match(/\(cause:\s*([^)]+)\)/);
  if (causeMatch) parsed.networkCause = causeMatch[1].trim();

  const regionMatch = message.match(/^\[([^\]]+)\]/);
  if (regionMatch) parsed.region = regionMatch[1];

  return parsed;
}

export function parseApiLogDetails(
  details: unknown,
  errorMessage?: string | null
): ParsedApiLogDetails {
  const record = asRecord(details);
  const fromMessage = parseFromMessage(errorMessage);

  if (!record) return fromMessage;

  return {
    url: pickString(record, "url") ?? fromMessage.url,
    path: pickString(record, "path") ?? fromMessage.path,
    method: pickString(record, "method") ?? fromMessage.method,
    statusCode: pickNumber(record, "statusCode") ?? fromMessage.statusCode,
    statusText: pickString(record, "statusText") ?? fromMessage.statusText,
    attempt: pickNumber(record, "attempt") ?? fromMessage.attempt,
    maxAttempts: pickNumber(record, "maxAttempts") ?? fromMessage.maxAttempts,
    latencyMs: pickNumber(record, "latencyMs") ?? fromMessage.latencyMs,
    responseBody:
      pickString(record, "responseBody") ?? fromMessage.responseBody,
    networkCause:
      pickString(record, "networkCause") ?? fromMessage.networkCause,
    timeoutMs: pickNumber(record, "timeoutMs") ?? fromMessage.timeoutMs,
    region: pickString(record, "region") ?? fromMessage.region,
  };
}

export function hasApiLogErrorDetails(
  parsed: ParsedApiLogDetails,
  errorMessage?: string | null
): boolean {
  return Boolean(
    parsed.url ||
      parsed.statusCode ||
      parsed.responseBody ||
      parsed.networkCause ||
      parsed.timeoutMs ||
      (errorMessage && errorMessage.length > 120)
  );
}
