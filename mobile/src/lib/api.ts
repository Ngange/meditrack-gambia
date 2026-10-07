const API_URL = process.env.EXPO_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error("EXPO_PUBLIC_API_URL is not set. Check mobile/.env");
}

type ApiError = { error: string };

// If the server hasn't answered by then, treat it as unreachable.
// On weak connections requests often hang instead of failing fast.
const REQUEST_TIMEOUT_MS = 8000;

async function request<T>(path: string, options: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: { "Content-Type": "application/json", ...options.headers },
    });
  } catch {
    const networkError = new Error("Unable to reach the server. Check your connection.");
    (networkError as any).isNetworkError = true;
    throw networkError;
  } finally {
    clearTimeout(timer);
  }

  const data = await res.json();

    if (!res.ok) {
    const err = new Error((data as ApiError).error || "Something went wrong. Please try again.");
    (err as any).status = res.status;
    throw err;
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

export type Profile = {
  patient_id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  gender: string | null;
  blood_group: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
};

export function getProfile(token: string) {
  return request<{ profile: Profile }>("/patients/me", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
}