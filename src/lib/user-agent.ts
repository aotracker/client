/** Browser/OS labels parsed from a session user-agent. Names stay in English. */
export type UserAgentDevice = {
  browser: string | null;
  os: string | null;
};

export function parseUserAgentDevice(
  value: string | null | undefined
): UserAgentDevice | null {
  const ua = value?.trim();
  if (!ua) return null;

  const os = detectOs(ua);
  const browser = detectBrowser(ua);
  if (!os && !browser) return null;
  return { browser, os };
}

function detectOs(ua: string): string | null {
  if (/iPad/i.test(ua) || (/Macintosh/i.test(ua) && /Mobile/i.test(ua))) {
    return "iPadOS";
  }
  if (/iPhone|iPod/i.test(ua)) return "iOS";
  if (/Android/i.test(ua)) return "Android";
  if (/Windows NT|Win64|Win32/i.test(ua)) return "Windows";
  if (/Mac OS X|Macintosh/i.test(ua)) return "macOS";
  if (/CrOS/i.test(ua)) return "Chrome OS";
  if (/Linux/i.test(ua)) return "Linux";
  return null;
}

function detectBrowser(ua: string): string | null {
  if (/Edg(?:e|A|iOS)?\//i.test(ua)) return "Edge";
  if (/OPR\/|Opera/i.test(ua)) return "Opera";
  if (/SamsungBrowser/i.test(ua)) return "Samsung Internet";
  if (/Firefox|FxiOS/i.test(ua)) return "Firefox";
  if (/CriOS|Chrome|Chromium/i.test(ua)) return "Chrome";
  if (/Safari/i.test(ua)) return "Safari";
  return null;
}
