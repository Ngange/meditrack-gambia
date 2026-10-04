const API_URL = process.env.EXPO_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error("EXPO_PUBLIC_API_URL is not set. Check mobile/.env");
}

type ApiError = { error: string };

async function request<T>(path: string, options: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error((data as ApiError).error || "Something went wrong. Please try again.");
  }

  return data as T;
}

export type LoginResponse = {
  token: string;
  user: { userId: string; email: string; role: "patient" | "admin" };
};

export function login(email: string, password: string) {
  return request<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function register(email: string, password: string, firstName: string, lastName: string) {
  return request<LoginResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, firstName, lastName }),
  });
}