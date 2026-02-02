// Core enums matching Prisma schema
import { Priority, Source, TokenStatus } from "../generated/prisma/enums";

// Doctor types
export interface Doctor {
  id: string;
  name: string;
  displayID: string; // Human-readable ID (e.g., AKG001)
  specialization: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDoctorInput {
  name: string;
  specialization?: string;
}

// Slot types
export interface Slot {
  id: string;
  displayID: string; // Human-readable ID (e.g., S-AKG001-20260201-001)
  doctorId: string;
  date: Date;
  startTime: string;
  endTime: string;
  capacity: number;
  paidCap: number | null;
  followUpCap: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSlotInput {
  doctorId: string;
  date: string; // "2024-01-15"
  startTime: string; // "09:00"
  endTime: string; // "10:00"
  capacity: number;
  paidCap?: number;
  followUpCap?: number;
}

// Token types
export interface Token {
  id: string;
  displayID: string; // Human-readable ID (e.g., T-AKG001-20260201-001)
  patientName: string;
  patientPhone: string | null;
  patientAge: number | null;
  source: Source;
  priority: Priority;
  status: TokenStatus;
  slotId: string | null;
  doctorId: string;
  date: Date;
  idempotencyKey: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  allocatedAt: Date | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
}

export interface CreateTokenInput {
  patientName: string;
  patientPhone?: string;
  patientAge?: number;
  doctorId: string;
  date: string; // "2024-01-15"
  source: Source;
  priority: Priority;
  idempotencyKey: string;
  notes?: string;
}

export interface UpdateTokenStatusInput {
  tokenId: string;
  status: TokenStatus;
}

// Allocation result types
export interface AllocationResult {
  success: boolean;
  token: Token;
  slot: Slot | null;
  message: string;
}

export interface ReallocationResult {
  success: boolean;
  movedTokens: Token[];
  freedSlot: Slot | null;
  message: string;
}

// Slot availability info
export interface SlotAvailability {
  slotId: string;
  doctorId: string;
  startTime: string;
  endTime: string;
  capacity: number;
  allocatedCount: number;
  availableCount: number;
  paidCount: number;
  followUpCount: number;
  emergencyCount: number;
  canAcceptPaid: boolean;
  canAcceptFollowUp: boolean;
  canAcceptRegular: boolean;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Error types
export interface AppError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// Audit log types
export interface AuditLog {
  id: string;
  operation: string;
  tokenId: string | null;
  slotId: string | null;
  doctorId: string | null;
  details: Record<string, unknown> | null;
  timestamp: Date;
}

export interface CreateAuditLogInput {
  operation: string;
  tokenId?: string;
  slotId?: string;
  doctorId?: string;
  details?: Record<string, unknown>;
}
