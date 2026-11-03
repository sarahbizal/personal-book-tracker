//Baked in at build time from client/.env. A trailing slash would make URLs like //api/v1/books
const API_URL = import.meta.env.VITE_API_URL?.replace(/\/+$/, "");

//The version lives in code, not the env var, because this code is written against v1's response shapes
const API_VERSION_PREFIX = "/api/v1";

//Fetches JSON from the API and throws a readable error when the request fails
export async function fetchJson<T>(path: string): Promise<T> {
  if (!API_URL) {
    throw new Error("VITE_API_URL is not set. Add it to client/.env.");
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${API_VERSION_PREFIX}${path}`);
  } catch {
    throw new Error("Couldn't reach the server. Is it running?");
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(
      body?.error ?? `Request failed with status ${response.status}`,
    );
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new Error(
      "The server sent back something that isn't JSON. Check VITE_API_URL.",
    );
  }
}
