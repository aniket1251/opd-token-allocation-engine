import { Request, Response, NextFunction } from "express";
import { createAppError } from "./errorHandler";
import { isValidTimeFormat, isValidPhone } from "../utils/helper";
import { Priority, Source } from "../generated/prisma/enums";

// Validate create token request
export function validateCreateToken(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const { patientName, doctorId, date, source, priority, idempotencyKey } =
    req.body;

  // Required fields
  if (!patientName || typeof patientName !== "string") {
    throw createAppError(
      400,
      "Patient name is required and must be a string",
      "INVALID_PATIENT_NAME",
    );
  }

  if (!doctorId || typeof doctorId !== "string") {
    throw createAppError(
      400,
      "Doctor ID is required and must be a string",
      "INVALID_DOCTOR_ID",
    );
  }

  if (!date || typeof date !== "string") {
    throw createAppError(
      400,
      "Date is required and must be a string (DD-MM-YYYY)",
      "INVALID_DATE",
    );
  }

  // Validate date format DD-MM-YYYY
  const dateRegex = /^\d{2}-\d{2}-\d{4}$/;
  if (!dateRegex.test(date)) {
    throw createAppError(
      400,
      "Date must be in DD-MM-YYYY format",
      "INVALID_DATE_FORMAT",
    );
  }

  // Check if date is not in the past
  const [day, month, year] = date.split("-").map(Number);
  const requestDate = new Date(year, month - 1, day);
  requestDate.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (requestDate < today) {
    throw createAppError(
      400,
      "Cannot create tokens for past dates",
      "PAST_DATE",
    );
  }

  if (!source || !Object.values(Source).includes(source)) {
    throw createAppError(
      400,
      "Valid source is required (WALKIN or ONLINE)",
      "INVALID_SOURCE",
    );
  }

  if (!priority || !Object.values(Priority).includes(priority)) {
    throw createAppError(
      400,
      "Valid priority is required (EMERGENCY, PAID, FOLLOWUP, ONLINE, WALKIN)",
      "INVALID_PRIORITY",
    );
  }

  if (!idempotencyKey || typeof idempotencyKey !== "string") {
    throw createAppError(
      400,
      "Idempotency key is required",
      "INVALID_IDEMPOTENCY_KEY",
    );
  }

  // Optional fields validation
  if (req.body.patientPhone && !isValidPhone(req.body.patientPhone)) {
    throw createAppError(400, "Invalid phone number format", "INVALID_PHONE");
  }

  if (
    req.body.patientAge &&
    (typeof req.body.patientAge !== "number" || req.body.patientAge < 0)
  ) {
    throw createAppError(
      400,
      "Patient age must be a positive number",
      "INVALID_AGE",
    );
  }

  next();
}

// Validate create slot request
export function validateCreateSlot(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const { doctorId, date, startTime, endTime, capacity } = req.body;

  if (!doctorId || typeof doctorId !== "string") {
    throw createAppError(400, "Doctor ID is required", "INVALID_DOCTOR_ID");
  }

  if (!date || typeof date !== "string") {
    throw createAppError(400, "Date is required (DD-MM-YYYY)", "INVALID_DATE");
  }

  // Validate date format DD-MM-YYYY
  const dateRegex = /^\d{2}-\d{2}-\d{4}$/;
  if (!dateRegex.test(date)) {
    throw createAppError(
      400,
      "Date must be in DD-MM-YYYY format",
      "INVALID_DATE_FORMAT",
    );
  }

  // Check if date is not in the past
  const [day, month, year] = date.split("-").map(Number);
  const requestDate = new Date(year, month - 1, day);
  requestDate.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (requestDate < today) {
    throw createAppError(
      400,
      "Cannot create slots for past dates",
      "PAST_DATE",
    );
  }

  if (!startTime || !isValidTimeFormat(startTime)) {
    throw createAppError(
      400,
      "Valid start time is required (HH:MM)",
      "INVALID_START_TIME",
    );
  }

  if (!endTime || !isValidTimeFormat(endTime)) {
    throw createAppError(
      400,
      "Valid end time is required (HH:MM)",
      "INVALID_END_TIME",
    );
  }

  if (!capacity || typeof capacity !== "number" || capacity <= 0) {
    throw createAppError(
      400,
      "Capacity must be a positive number",
      "INVALID_CAPACITY",
    );
  }

  // Optional caps validation
  if (req.body.paidCap !== undefined) {
    if (typeof req.body.paidCap !== "number" || req.body.paidCap < 0) {
      throw createAppError(
        400,
        "Paid cap must be a non-negative number",
        "INVALID_PAID_CAP",
      );
    }
    if (req.body.paidCap > capacity) {
      throw createAppError(
        400,
        "Paid cap cannot exceed total capacity",
        "PAID_CAP_EXCEEDS_CAPACITY",
      );
    }
  }

  if (req.body.followUpCap !== undefined) {
    if (typeof req.body.followUpCap !== "number" || req.body.followUpCap < 0) {
      throw createAppError(
        400,
        "Follow-up cap must be a non-negative number",
        "INVALID_FOLLOWUP_CAP",
      );
    }
    if (req.body.followUpCap > capacity) {
      throw createAppError(
        400,
        "Follow-up cap cannot exceed total capacity",
        "FOLLOWUP_CAP_EXCEEDS_CAPACITY",
      );
    }
  }

  next();
}

// Validate create doctor request
export function validateCreateDoctor(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const { name } = req.body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    throw createAppError(400, "Doctor name is required", "INVALID_DOCTOR_NAME");
  }

  next();
}

// Validate token ID in params
export function validateTokenId(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const { tokenId } = req.params;

  if (!tokenId || typeof tokenId !== "string") {
    throw createAppError(400, "Valid token ID is required", "INVALID_TOKEN_ID");
  }

  next();
}

// Validate slot ID in params
export function validateSlotId(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const { slotId } = req.params;

  if (!slotId || typeof slotId !== "string") {
    throw createAppError(400, "Valid slot ID is required", "INVALID_SLOT_ID");
  }

  next();
}

// Validate slot ID in params
export function validateDoctorId(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const { doctorId } = req.params;

  if (!doctorId || typeof doctorId !== "string") {
    throw createAppError(
      400,
      "Valid doctor ID is required",
      "INVALID_DOCTOR_ID",
    );
  }

  next();
}
