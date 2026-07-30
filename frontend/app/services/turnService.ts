let cachedRTCConfig: RTCConfiguration | null = null;
let expiresAt = 0;

export async function getRTCConfiguration(
  backendUrl: string,
  getToken: () => Promise<string | null>
): Promise<RTCConfiguration> {
  // Refresh 5 minutes before expiry
  if (cachedRTCConfig && Date.now() < expiresAt - 5 * 60 * 1000) {
    return cachedRTCConfig;
  }

  const token = await getToken();

  const response = await fetch(
    `${backendUrl}/api/turn-credentials`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const text = await response.text();

    throw new Error(
        `TURN request failed: ${text}`
    );
}

  const turn = await response.json();

  cachedRTCConfig = {
    iceServers: [
      {
        urls: [
          "stun:stun.l.google.com:19302",
          "stun:stun1.l.google.com:19302",
        ],
      },
      {
        urls: turn.urls,
        username: turn.username,
        credential: turn.credential,
      },
    ],
  };

  // Your backend credentials last 1 hour.
  expiresAt = Date.now() + 3600 * 1000;

  return cachedRTCConfig;
}