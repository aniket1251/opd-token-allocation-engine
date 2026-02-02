import { Request, Response } from "express";
import {
  createToken,
  cancelToken,
  markNoShow,
  completeToken,
  expireWaitingTokens,
} from "../utils/allocationEngine";
import { CreateTokenInput } from "../types/domain";
import { prisma } from "../config/prisma";
import { Priority, Source, TokenStatus } from "../generated/prisma/enums";
import { getParam, parseDate } from "../utils/helper";

// Create a new token
export async function createPatientToken(req: Request, res: Response) {
  const input: CreateTokenInput = {
    patientName: req.body.patientName,
    patientPhone: req.body.patientPhone,
    patientAge: req.body.patientAge,
    doctorId: req.body.doctorId,
    date: req.body.date,
    source: req.body.source as Source,
    priority: req.body.priority as Priority,
    idempotencyKey: req.body.idempotencyKey,
    notes: req.body.notes,
  };

  const result = await createToken(input);

  res.status(201).json({
    success: true,
    data: result,
    message: result.message,
  });
}

// Get token by ID
export async function getPatientTokenById(req: Request, res: Response) {
  const tokenId = getParam(req.params.tokenId, "tokenId");

  const token = await prisma.token.findUnique({
    where: { id: tokenId },
    include: {
      slot: true,
    },
  });

  if (!token) {
    return res.status(404).json({
      success: false,
      error: "Token not found",
    });
  }

  res.json({
    success: true,
    data: token,
  });
}

// Get all tokens for a doctor on a specific date
export async function getPatientsTokensByDoctor(req: Request, res: Response) {
  const doctorId = getParam(req.params.doctorId, "doctorId");
  const { date } = req.query;

  if (!date || typeof date !== "string") {
    return res.status(400).json({
      success: false,
      error: "Date query parameter is required (DD-MM-YYYY)",
    });
  }

  // Parse DD-MM-YYYY to Date
  const parsedDate = parseDate(date);

  const tokens = await prisma.token.findMany({
    where: {
      doctorId,
      date: parsedDate,
    },
    include: {
      slot: true,
    },
    orderBy: [{ status: "asc" }, { priority: "asc" }, { createdAt: "asc" }],
  });

  res.json({
    success: true,
    data: tokens,
    count: tokens.length,
  });
}

// Cancel a token
export async function cancelPatientToken(req: Request, res: Response) {
  const tokenId = getParam(req.params.tokenId, "tokenId");

  const result = await cancelToken(tokenId);

  res.json({
    success: true,
    data: result,
    message: result.message,
  });
}

// Mark token as no-show
export async function markPatientTokenNoShow(req: Request, res: Response) {
  const tokenId = getParam(req.params.tokenId, "tokenId");

  const result = await markNoShow(tokenId);

  res.json({
    success: true,
    data: result,
    message: result.message,
  });
}

// Mark token as completed
export async function markPatientTokenComplete(req: Request, res: Response) {
  const tokenId = getParam(req.params.tokenId, "tokenId");

  await completeToken(tokenId);

  res.json({
    success: true,
    message: "Token marked as completed",
  });
}

// Expire waiting tokens for a doctor on a specific date
export async function expireWaitingPatientsTokens(req: Request, res: Response) {
  const doctorId = getParam(req.params.doctorId, "doctorId");
  const { date } = req.body;

  if (!date || typeof date !== "string") {
    return res.status(400).json({
      success: false,
      error: "Date is required in body (DD-MM-YYYY)",
    });
  }

  const expiredCount = await expireWaitingTokens(doctorId, date);

  res.json({
    success: true,
    message: `${expiredCount} waiting tokens expired`,
    data: {
      expiredCount,
    },
  });
}

// Get waiting tokens for a doctor
export async function getWaitingPatientsTokens(req: Request, res: Response) {
  const doctorId = getParam(req.params.doctorId, "doctorId");
  const { date } = req.query;

  if (!date || typeof date !== "string") {
    return res.status(400).json({
      success: false,
      error: "Date query parameter is required (DD-MM-YYYY)",
    });
  }

  // Parse DD-MM-YYYY to Date
  const parsedDate = parseDate(date);

  const waitingTokens = await prisma.token.findMany({
    where: {
      doctorId,
      date: parsedDate,
      status: "WAITING",
    },
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
  });

  res.json({
    success: true,
    data: waitingTokens,
    count: waitingTokens.length,
  });
}
