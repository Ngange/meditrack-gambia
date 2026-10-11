const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  throw new Error("VITE_API_URL is not set. Check web/.env");
}

type ApiError = { error: string };

async function request<T>(path: string, options: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });

  const data = await res.json();

  if (!res.ok) {
    const err = new Error((data as ApiError).error || "Something went wrong. Please try again.");
    (err as Error & { status?: number }).status = res.status;
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
};

export function getSummary(token: string) {
  return request<{ summary: Summary }>("/records/summary", {
    method: "GET",
    headers: auth(token),
  });
}

export type MyProfile = {
  patient_id: string;
  email: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  gender: string | null;
  blood_group: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
};

export type ProfileInput = {
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  gender?: string;
  bloodGroup?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
};

export function getMyProfile(token: string) {
  return request<{ profile: MyProfile }>("/patients/me", {
    method: "GET",
    headers: auth(token),
  });
}

export function updateMyProfile(token: string, input: ProfileInput) {
  return request<{ profile: MyProfile }>("/patients/me", {
    method: "PUT",
    headers: auth(token),
    body: JSON.stringify(input),
  });
}