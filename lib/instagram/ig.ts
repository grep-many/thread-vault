export const APP_ID = "936619743392459";
export const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/114.0.0.0 Safari/537.36";

export interface RequestOptions {
  method?: "GET" | "POST" | "DELETE" | "PUT";
  headers?: Record<string, string>;
  body?: string | FormData;
}

// Pre-built static header keys that never change between requests
const STATIC_HEADER_KEYS = {
  userAgent: "User-Agent",
  appId: "X-IG-App-ID",
  csrf: "X-CSRFToken",
  cookie: "Cookie",
} as const;

const UUID_TEMPLATE = "xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx";

function generateCsrf(): string {
  return UUID_TEMPLATE.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getSessionData(sessionId: string, csrfToken?: string, appId?: string) {
  const decoded = decodeURIComponent(sessionId);
  const pk = decoded.includes(":") ? decoded.split(":")[0] : "";
  const csrf = csrfToken || generateCsrf();
  return { sessionId, pk, csrf, appId: appId || APP_ID };
}

export async function igRequest(
  url: string,
  sessionId: string,
  options: RequestOptions = {},
  csrfToken?: string,
  appId?: string,
): Promise<unknown> {
  const { pk, csrf, appId: resolvedAppId } = getSessionData(sessionId, csrfToken, appId);

  const headers: Record<string, string> = {
    [STATIC_HEADER_KEYS.userAgent]: USER_AGENT,
    [STATIC_HEADER_KEYS.appId]: resolvedAppId,
    [STATIC_HEADER_KEYS.csrf]: csrf,
    [STATIC_HEADER_KEYS.cookie]: `sessionid=${sessionId}; csrftoken=${csrf}; ds_user_id=${pk}`,
  };

  if (options.headers) {
    Object.assign(headers, options.headers);
  }

  try {
    const response = await fetch(url, {
      method: options.method ?? "GET",
      headers,
      body: options.body ?? undefined,
    });

    const data = await response.json() as { status?: string; message?: string };

    if (data.status === "fail") {
      throw new Error(data.message ?? "API Error");
    }

    return data;
  } catch (error: unknown) {
    throw new Error(error instanceof Error ? error.message : "Network request failed");
  }
}
