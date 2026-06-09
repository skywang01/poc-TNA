// Domain types for the Attendance POC (mock data layer).

export type Severity = "high" | "mid";

export interface Kpi {
  label: string;
  value: string;
  delta: string;
  dir: "up" | "down";
}

export interface TrendPoint {
  label: string;      // e.g. "W1"
  attendance: number; // %
  punctuality: number; // %
}

export interface DeptOt {
  dept: string;
  hours: number;
}

export interface Anomaly {
  id: string;
  title: string;
  why: string;       // AI attribution / explanation
  severity: Severity;
}

export interface Compliance {
  id: string;
  title: string;
  why: string;
  severity: Severity;
}

export interface OtPerson {
  name: string;
  hours: number;
  pctOfMax: number;  // 0..100 for bar width
  daily: { date: string; hours: number }[]; // drill-down detail
}

export interface PendingOt {
  id: string;
  name: string;
  dept: string;
  date: string;
  hours: number;
  reason: string;
  complianceFlag?: string; // AI compliance note
}
