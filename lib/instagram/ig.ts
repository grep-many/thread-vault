export const APP_ID = "936619743392459";
export const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/114.0.0.0 Safari/537.36";

export interface RequestOptions {
  method?: "GET" | "POST" | "DELETE" | "PUT";
  headers?: Record<string, string>;
  body?: string | FormData;
}

export function getSessionData(sessionId: string, csrfToken?: string, appId?: string) {
  let pk = "";
  const decoded = decodeURIComponent(sessionId);
  if (decoded.includes(":")) {
    pk = decoded.split(":")[0];
  }

  const csrf =
    csrfToken ||
    "xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0,
        v = c == "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });

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

  try {
    const response = await fetch(url, {
      method: options.method || "GET",
      headers: {
        "User-Agent": USER_AGENT,
        "X-IG-App-ID": resolvedAppId,
        "X-CSRFToken": csrf,
        Cookie: `sessionid=${sessionId}; csrftoken=${csrf}; ds_user_id=${pk}`,
        ...(options.headers || {}),
      },
      body: options.body ? options.body : undefined,
    });

    const data = await response.json();

    if ((data as { status?: string }).status === "fail") {
      throw new Error((data as { message?: string }).message || "API Error");
    }

    return data;
  } catch (error: unknown) {
    throw new Error(error instanceof Error ? error.message : "Network request failed");
  }
}
