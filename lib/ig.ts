import https from "https";

export const APP_ID = "936619743392459";
export const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/114.0.0.0 Safari/537.36";

export function getSessionData(sessionId: string) {
  let pk = "";
  const decoded = decodeURIComponent(sessionId);
  if (decoded.includes(":")) {
    pk = decoded.split(":")[0];
  }

  // generated dynamic csrf
  const csrf = "xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0,
      v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

  return { sessionId, pk, csrf };
}

export async function igRequest(
  url: string,
  sessionId: string,
  options: any = {},
): Promise<InboxPromise> {
  const { pk, csrf } = getSessionData(sessionId);

  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      {
        method: options.method || "GET",
        headers: {
          "User-Agent": USER_AGENT,
          "X-IG-App-ID": APP_ID,
          Cookie: `sessionid=${sessionId}; csrftoken=${csrf}; ds_user_id=${pk}`,
          "X-CSRFToken": csrf,
          ...(options.headers || {}),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.status === "fail") {
              reject(new Error(parsed.message || "API Error"));
            } else {
              resolve(parsed);
            }
          } catch (e) {
            reject(new Error(`Invalid Response (${res.statusCode}): ` + data.substring(0, 100)));
          }
        });
      },
    );

    req.on("error", reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}
