export type LabResult = {
  result_id: string;
  test_name: string;
  test_date: string; // YYYY-MM-DD
  result: string | null;
  reference_range: string | null;
  facility_name: string | null;
  visit_id: string | null;
  created_at: string;
  updated_at: string;
};

export type LabPanelRow = { testName: string; result?: string; referenceRange?: string };

/** Several results from one lab visit: one date and lab, many tests. */
export type LabPanelInput = {
  testDate: string;
  facilityName?: string;
  visitId?: string | null;
  results: LabPanelRow[];
};

export type LabResultInput = {
  testName: string;
  testDate: string;
  result?: string;
  referenceRange?: string;
  facilityName?: string;
  visitId?: string | null;
};
