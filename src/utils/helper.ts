import { Priority, Source, TokenStatus } from "../generated/prisma/enums";

// Parse date string to Date object
export function isValidDate(dateString: string): Date {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date format: ${dateString}`);
  }
  return date;
}

// Convert DD-MM-YYYY to Date object
export function parseDate(dateStr: string): Date {
  const [day, month, year] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

// Check if date is today
export function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

// Format date to DD-MM-YYYY
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${day}-${month}-${year}`;
}

// Format date to YYYYMMDD for displayID
export function formatDateForDisplayID(date: string): string {
  const [day, month, year] = date.split("-");
  return `${year}${month}${day}`;
}

// Formats number with leading zeros (e.g., 1 → "001", 42 → "042")
export function formatNumber(num: number): string {
  return num.toString().padStart(3, "0");
}

// Extracts number from displayID (e.g., "AKG005" → 5 or "T-AKG001-20260201-042" → 42)
export function extractNumber(displayID: string): number {
  const match = displayID.match(/(\d+)(?!.*\d)/);
  return match ? Number(match[1]) : NaN;
}

// Get priority order value (lower number = higher priority)
export function getPriorityOrder(priority: Priority): number {
  const priorityMap: Record<Priority, number> = {
    [Priority.EMERGENCY]: 1,
    [Priority.PAID]: 2,
    [Priority.FOLLOWUP]: 3,
    [Priority.ONLINE]: 4,
    [Priority.WALKIN]: 5,
  };
  return priorityMap[priority];
}

// Compare two priorities (returns -1 if p1 is higher, 1 if p2 is higher, 0 if equal)
export function comparePriority(p1: Priority, p2: Priority): number {
  const order1 = getPriorityOrder(p1);
  const order2 = getPriorityOrder(p2);
  return order1 - order2;
}

// Validate time format (HH:MM)
export function isValidTimeFormat(time: string): boolean {
  const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
}

// Compare two times (returns -1 if t1 is earlier, 1 if t2 is earlier, 0 if equal)
export function compareTime(t1: string, t2: string): number {
  const [h1, m1] = t1.split(":").map(Number);
  const [h2, m2] = t2.split(":").map(Number);

  const minutes1 = h1 * 60 + m1;
  const minutes2 = h2 * 60 + m2;

  return minutes1 - minutes2;
}

// Validate phone number (basic validation)
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^[0-9]{10}$/;
  return phoneRegex.test(phone.replace(/\s|-/g, ""));
}

// Check if token can be allocated to a slot based on priority and caps
export function canAllocateToSlot(
  priority: Priority,
  currentPaidCount: number,
  currentFollowUpCount: number,
  currentTotalCount: number,
  capacity: number,
  paidCap: number | null,
  followUpCap: number | null,
): boolean {
  // Check if slot is full
  if (currentTotalCount >= capacity) {
    return false;
  }

  // Emergency always gets in (will displace if needed)
  if (priority === Priority.EMERGENCY) {
    return true;
  }

  // Check paid cap
  if (priority === Priority.PAID) {
    if (paidCap !== null && currentPaidCount >= paidCap) {
      return false;
    }
  }

  // Check follow-up cap
  if (priority === Priority.FOLLOWUP) {
    if (followUpCap !== null && currentFollowUpCount >= followUpCap) {
      return false;
    }
  }

  return true;
}

// Find the lowest priority token in a list (for displacement)
export function findLowestPriorityToken(
  tokens: Array<{ id: string; priority: Priority; createdAt: Date }>,
): string | null {
  if (tokens.length === 0) {
    return null;
  }

  let lowestToken = tokens[0];
  let lowestPriority = getPriorityOrder(tokens[0].priority);

  for (const token of tokens) {
    const currentPriority = getPriorityOrder(token.priority);

    // Lower priority (higher number)
    if (currentPriority > lowestPriority) {
      lowestToken = token;
      lowestPriority = currentPriority;
    }
    // Same priority, use FIFO (older token gets displaced)
    else if (currentPriority === lowestPriority) {
      if (token.createdAt < lowestToken.createdAt) {
        lowestToken = token;
      }
    }
  }

  return lowestToken.id;
}

// Generate idempotency key (can be overridden by client)
export function generateIdempotencyKey(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

// Validate idempotency key format
export function isValidIdempotencyKey(key: string): boolean {
  return key.length > 0 && key.length <= 255;
}

// Check if a status transition is valid
export function isValidStatusTransition(
  from: TokenStatus,
  to: TokenStatus,
): boolean {
  const validTransitions: Record<TokenStatus, TokenStatus[]> = {
    [TokenStatus.WAITING]: [
      TokenStatus.ALLOCATED,
      TokenStatus.CANCELLED,
      TokenStatus.EXPIRED,
    ],
    [TokenStatus.ALLOCATED]: [
      TokenStatus.COMPLETED,
      TokenStatus.NO_SHOW,
      TokenStatus.CANCELLED,
      TokenStatus.WAITING,
    ],
    [TokenStatus.COMPLETED]: [], // Terminal state
    [TokenStatus.CANCELLED]: [], // Terminal state
    [TokenStatus.NO_SHOW]: [], // Terminal state
    [TokenStatus.EXPIRED]: [], // Terminal state
  };

  return validTransitions[from]?.includes(to) || false;
}

// Calculate available capacity for a slot
export function calculateAvailableCapacity(
  capacity: number,
  allocatedCount: number,
): number {
  return Math.max(0, capacity - allocatedCount);
}

// Check if we should prioritize walk-in patients based on slot timing
export function shouldPrioritizeWalkIn(
  slotStartTime: string,
  slotEndTime: string,
  slotDate: Date,
): boolean {
  const now = new Date();

  // First check if slot has ended - if yes, don't prioritize anyone (no reallocation)
  if (hasSlotEnded(slotEndTime, slotDate)) {
    return false;
  }

  // Parse slot start time (HH:MM format)
  const [hours, minutes] = slotStartTime.split(":").map(Number);

  // Create slot datetime
  const slotDateTime = new Date(slotDate);
  slotDateTime.setHours(hours, minutes, 0, 0);

  // Calculate time difference in milliseconds
  const timeDiff = slotDateTime.getTime() - now.getTime();

  // Convert to hours
  const hoursDiff = timeDiff / (1000 * 60 * 60);

  // If slot starts within 1 hour or is currently running, prioritize walk-ins
  return hoursDiff <= 1;
}

// Check if slot has ended
export function hasSlotEnded(slotEndTime: string, slotDate: Date): boolean {
  const now = new Date();

  // Parse slot end time (HH:MM format)
  const [hours, minutes] = slotEndTime.split(":").map(Number);

  // Create slot end datetime
  const slotEndDateTime = new Date(slotDate);
  slotEndDateTime.setHours(hours, minutes, 0, 0);

  // Slot has ended if current time is past end time
  return now >= slotEndDateTime;
}

// Check if slot is available (not ended yet)
export function isSlotAvailable(slotEndTime: string, slotDate: Date): boolean {
  return !hasSlotEnded(slotEndTime, slotDate);
}

export function getParam(
  param: string | string[] | undefined,
  name: string,
): string {
  if (!param) {
    throw new Error(`${name} is required`);
  }
  if (Array.isArray(param)) {
    throw new Error(`${name} must be a single value`);
  }
  return param;
}

// Parse token and slot displayID to extract information
export function parseDisplayID(displayID: string): {
  type: "token" | "slot";
  doctorDisplayID: string;
  date: string; // YYYYMMDD
  sequence: number;
} {
  const parts = displayID.split("-");

  if (parts.length !== 4) {
    throw new Error("Invalid displayID format");
  }

  const prefix = parts[0];

  let type: "token" | "slot";
  if (prefix === "T") {
    type = "token";
  } else if (prefix === "S") {
    type = "slot";
  } else {
    throw new Error("Invalid displayID prefix (must start with T or S)");
  }

  const sequence = Number(parts[3]);
  if (!Number.isInteger(sequence)) {
    throw new Error("Invalid sequence number");
  }

  return {
    type,
    doctorDisplayID: parts[1],
    date: parts[2],
    sequence,
  };
}

/**
 * Format displayID date to human-readable format
 * Example: "20260201" → "01-02-2026"
 */
export function formatDisplayIDDate(yyyymmdd: string): string {
  const year = yyyymmdd.substring(0, 4);
  const month = yyyymmdd.substring(4, 6);
  const day = yyyymmdd.substring(6, 8);
  return `${day}-${month}-${year}`;
}

// Gives token or slot info according to displayID
export function getDisplayInfo(displayID: string): string {
  try {
    const parsed = parseDisplayID(displayID);
    const date = formatDisplayIDDate(parsed.date);

    const label = parsed.type === "token" ? "Token" : "Slot";

    return `Dr. ${parsed.doctorDisplayID}'s ${label} #${parsed.sequence} on ${date}`;
  } catch {
    return "Invalid displayID";
  }
}

/**
 * Validates if a displayID follows the correct format (XXX999)
 */
export function isValidDisplayIDFormat(displayID: string): boolean {
  // Must be exactly 6 characters
  if (displayID.length !== 6) return false;

  // First 3 must be uppercase letters
  const letters = displayID.substring(0, 3);
  if (!/^[A-Z]{3}$/.test(letters)) return false;

  // Last 3 must be digits
  const numbers = displayID.substring(3);
  if (!/^\d{3}$/.test(numbers)) return false;

  return true;
}

/**
 * Validates Token displayID format
 * Format: T-XXX999-YYYYMMDD-NNN
 */
export function isValidTokenDisplayIDFormat(displayID: string): boolean {
  const regex = /^T-[A-Z]{3}\d{3}-\d{8}-\d{3}$/;
  return regex.test(displayID);
}

/**
 * Validates Slot displayID format
 * Format: S-XXX999-YYYYMMDD-NNN
 */
export function isValidSlotDisplayIDFormat(displayID: string): boolean {
  const regex = /^S-[A-Z]{3}\d{3}-\d{8}-\d{3}$/;
  return regex.test(displayID);
}
