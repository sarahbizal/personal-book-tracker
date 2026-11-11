//Baked in at build time from client/.env. A trailing slash would make URLs like //api/v1/books
const API_URL = import.meta.env.VITE_API_URL?.replace(/\/+$/, "");

//The version lives in code, not the env var, because this code is written against v1's response shapes
const API_VERSION_PREFIX = "/api/v1";

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
}

//Fetches JSON from the API and throws a readable error when the request fails
export async function fetchJson<T>(
  path: string,
  { method = "GET", body }: RequestOptions = {},
): Promise<T> {
  //An empty string is valid: it means same origin, which the Vite proxy handles in dev
  if (API_URL === undefined) {
    throw new Error(
      'VITE_API_URL is not set. Add VITE_API_URL="" to client/.env to use the Vite proxy.',
    );
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${API_VERSION_PREFIX}${path}`, {
      method,
      ...(body === undefined
        ? {}
        : {
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }),
    });
  } catch {
    throw new Error("Couldn't reach the server. Is it running?");
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(
      errorBody?.error ?? `Request failed with status ${response.status}`,
    );
  }

  //Logout answers with 204 and no body, which response.json() would reject
  if (response.status === 204) {
    return undefined as T;
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new Error(
      "The server sent back something that isn't JSON. Check VITE_API_URL.",
    );
  }
}
