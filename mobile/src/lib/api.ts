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

export type Severity = "mild" | "moderate" | "severe";
export type AllergyStatus = "active" | "resolved";

export type Allergy = {
  allergy_id: string;
  allergen: string;
  reaction: string | null;
  severity: Severity | null;
  status: AllergyStatus;
  created_at: string;
  updated_at: string;
};

export type AllergyInput = {
  allergen: string;
  reaction?: string;
  severity?: Severity | null;
  status?: AllergyStatus;
};

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

export function getAllergies(token: string) {
  return request<{ allergies: Allergy[] }>("/records/allergies", {
    method: "GET",
    headers: auth(token),
  });
}

export function createAllergy(token: string, input: AllergyInput) {
  return request<{ allergy: Allergy }>("/records/allergies", {
    method: "POST",
    headers: auth(token),
    body: JSON.stringify(input),
  });
}

export function updateAllergy(token: string, id: string, input: AllergyInput) {
  return request<{ allergy: Allergy }>(`/records/allergies/${id}`, {
    method: "PUT",
    headers: auth(token),
    body: JSON.stringify(input),
  });
}

export function deleteAllergy(token: string, id: string) {
  return request<{ deleted: boolean }>(`/records/allergies/${id}`, {
    method: "DELETE",
    headers: auth(token),
  });
}


export type ConditionStatus = "active" | "resolved" | "chronic";

export type Condition = {
  condition_id: string;
  condition_name: string;
  diagnosis_date: string | null; // "YYYY-MM-DD"
  status: ConditionStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ConditionInput = {
  conditionName: string;
  diagnosisDate?: string;
  status?: ConditionStatus;
  notes?: string;
};

export function getConditions(token: string) {
  return request<{ conditions: Condition[] }>("/records/conditions", {
    method: "GET",
    headers: auth(token),
  });
}

export function createCondition(token: string, input: ConditionInput) {
  return request<{ condition: Condition }>("/records/conditions", {
    method: "POST",
    headers: auth(token),
    body: JSON.stringify(input),
  });
}

export function updateCondition(token: string, id: string, input: ConditionInput) {
  return request<{ condition: Condition }>(`/records/conditions/${id}`, {
    method: "PUT",
    headers: auth(token),
    body: JSON.stringify(input),
  });
}

export function deleteCondition(token: string, id: string) {
  return request<{ deleted: boolean }>(`/records/conditions/${id}`, {
    method: "DELETE",
    headers: auth(token),
  });
}


export type Summary = {
  allergies: number;
  conditions: number;
  visits: number;
};

export function getSummary(token: string) {
  return request<{ summary: Summary }>("/records/summary", {
    method: "GET",
    headers: auth(token),
  });
}

export type ProfileInput = {
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  gender?: string;
  bloodGroup?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
};

export function updateProfile(token: string, input: ProfileInput) {
  return request<{ profile: Profile }>("/patients/me", {
    method: "PUT",
    headers: auth(token),
    body: JSON.stringify(input),
  });
};


export type Visit = {
  visit_id: string;
  facility_name: string | null;
  visit_date: string; // YYYY-MM-DD
  reason: string | null;
  diagnosis: string | null;
  treatment: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type VisitInput = {
  facilityName?: string;
  visitDate: string;
  reason?: string;
  diagnosis?: string;
  treatment?: string;
  notes?: string;
};

export function getVisits(token: string) {
  return request<{ visits: Visit[] }>("/records/visits", {
    method: "GET",
    headers: auth(token),
  });
}

export function createVisit(token: string, input: VisitInput) {
  return request<{ visit: Visit }>("/records/visits", {
    method: "POST",
    headers: auth(token),
    body: JSON.stringify(input),
  });
}

export function updateVisit(token: string, id: string, input: VisitInput) {
  return request<{ visit: Visit }>(`/records/visits/${id}`, {
    method: "PUT",
    headers: auth(token),
    body: JSON.stringify(input),
  });
}

export function deleteVisit(token: string, id: string) {
  return request<{ deleted: boolean }>(`/records/visits/${id}`, {
    method: "DELETE",
    headers: auth(token),
  });
}