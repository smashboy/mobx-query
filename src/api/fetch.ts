import { API_URL } from "./constants";

export interface ApiFetchOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  params?: Map<string, string>;
}

export async function apiFetch<R = unknown>(
  path: string,
  options?: ApiFetchOptions
) {
  const url = new URL(API_URL);

  url.pathname = path;

  if (options?.params && options.params.size > 0) {
    for (const [key, value] of options.params.entries()) {
      url.searchParams.append(key, value);
    }
  }

  const res = await fetch(url.toString(), {
    method: options?.method || "GET",
  });

  const json = await res.json();

  return json as R;
}
