import { Request, Response } from "express";
import { prisma } from "../config/prisma";
import { getParam, hasSlotEnded, parseDate } from "../utils/helper";
import { TokenStatus } from "../generated/prisma/enums";
import { CreateSlotInput } from "../types/domain";
import { slotWithAllocatedTokensInclude } from "../types/prisma";
import { Prisma } from "../generated/prisma/client";
import { generateSlotDisplayID } from "../utils/displayIdGenerator";

// Create a new slot
export async function createSlot(req: Request, res: Response) {
  const input: CreateSlotInput = {
    doctorId: req.body.doctorId,
    date: req.body.date,
    startTime: req.body.startTime,
    endTime: req.body.endTime,
    capacity: req.body.capacity,
    paidCap: req.body.paidCap,
    followUpCap: req.body.followUpCap,
  };

  // Parse DD-MM-YYYY to Date
  const parsedDate = parseDate(input.date);

  // Generate displayID
  const displayID = await generateSlotDisplayID(parsedDate, input.doctorId);

  const slot = await prisma.slot.create({
    data: {
      displayID,
      doctorId: input.doctorId,
      date: parsedDate,
      startTime: input.startTime,
      endTime: input.endTime,
      capacity: input.capacity,
      paidCap: input.paidCap,
      followUpCap: input.followUpCap,
    },
    include: {
      doctor: true,
    },
  });

  res.status(201).json({
    success: true,
    data: slot,
    message: "Slot created successfully",
  });
}

// Get slot by ID
export async function getSlotById(req: Request, res: Response) {
  const slotId = getParam(req.params.slotId, "slotId");

  const slot = await prisma.slot.findUnique({
    where: { id: slotId },
    include: {
      doctor: true,
      tokens: {
        where: {
          status: TokenStatus.ALLOCATED,
        },
      },
    },
  });

  if (!slot) {
    return res.status(404).json({
      success: false,
      error: "Slot not found",
    });
  }

  res.json({
    success: true,
    data: slot,
  });
}

// Get slots by Date
export async function getSlotsByDate(req: Request, res: Response) {
  const { date } = req.query;

  if (!date || typeof date !== "string") {
    return res.status(400).json({
      success: false,
      error: "Date query parameter is required (DD-MM-YYYY)",
    });
  }

  // Parse DD-MM-YYYY to Date
  const parsedDate = parseDate(date);

  const slots = await prisma.slot.findMany({
    where: {
      date: parsedDate,
      isActive: true,
    },
    include: {
      doctor: true,
      tokens: {
        where: {
          status: {
            in: [TokenStatus.ALLOCATED, TokenStatus.WAITING],
          },
        },
      },
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });

  res.status(200).json({
    success: true,
    data: slots,
    count: slots.length,
  });
}

// Get all slots for a doctor on a specific date
export async function getSlotsByDoctor(req: Request, res: Response) {
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

  const slots = await prisma.slot.findMany({
    where: {
      doctorId,
      date: parsedDate,
      isActive: true,
    },
    include: {
      tokens: {
        where: {
          status: TokenStatus.ALLOCATED,
        },
      },
    },
    orderBy: {
      startTime: "asc",
    },
  });

  res.json({
    success: true,
    data: slots,
    count: slots.length,
  });
}

// Get slot availability with detailed stats
export async function getSlotAvailability(req: Request, res: Response) {
  const slotId = getParam(req.params.slotId, "slotId");

  const slot = (await prisma.slot.findUnique({
    where: { id: slotId },
    include: slotWithAllocatedTokensInclude,
  })) as Prisma.Result<
    Prisma.SlotDelegate,
    {
      where: { id: string };
      include: typeof slotWithAllocatedTokensInclude;
    },
    "findUnique"
  > | null;

  if (!slot) {
    return res.status(404).json({
      success: false,
      error: "Slot not found",
    });
  }

  // Check if slot has ended
  const slotEnded = hasSlotEnded(slot.endTime, slot.date);

  // Calculate stats
  const allocatedCount = slot.tokens.length;
  const availableCount = slot.capacity - allocatedCount;

  // Count by priority
  const emergencyCount = slot.tokens.filter(
    (t) => t.priority === "EMERGENCY",
  ).length;
  const paidCount = slot.tokens.filter((t) => t.priority === "PAID").length;
  const followUpCount = slot.tokens.filter(
    (t) => t.priority === "FOLLOWUP",
  ).length;

  // Check capacity constraints
  const canAcceptPaid = slot.paidCap === null || paidCount < slot.paidCap;
  const canAcceptFollowUp =
    slot.followUpCap === null || followUpCount < slot.followUpCap;
  const canAcceptRegular = availableCount > 0;

  const availability = {
    slotId: slot.id,
    doctorId: slot.doctorId,
    startTime: slot.startTime,
    endTime: slot.endTime,
    capacity: slot.capacity,
    allocatedCount,
    availableCount,
    paidCount,
    followUpCount,
    emergencyCount,
    canAcceptPaid,
    canAcceptFollowUp,
    canAcceptRegular,
    slotEnded,
  };

  res.json({
    success: true,
    data: availability,
  });
}

// Update slot capacity
export async function updateSlotCapacity(req: Request, res: Response) {
  const slotId = getParam(req.params.slotId, "slotId");
  const { capacity, paidCap, followUpCap } = req.body;

  // Validate new capacity
  const slot = (await prisma.slot.findUnique({
    where: { id: slotId },
    include: slotWithAllocatedTokensInclude,
  })) as Prisma.Result<
    Prisma.SlotDelegate,
    {
      where: { id: string };
      include: typeof slotWithAllocatedTokensInclude;
    },
    "findUnique"
  > | null;

  if (!slot) {
    return res.status(404).json({
      success: false,
      error: "Slot not found",
    });
  }

  const currentAllocated = slot.tokens.length;

  if (capacity && capacity < currentAllocated) {
    return res.status(400).json({
      success: false,
      error: `Cannot reduce capacity below current allocated count (${currentAllocated})`,
    });
  }

  const updatedSlot = await prisma.slot.update({
    where: { id: slotId },
    data: {
      capacity: capacity || slot.capacity,
      paidCap: paidCap !== undefined ? paidCap : slot.paidCap,
      followUpCap: followUpCap !== undefined ? followUpCap : slot.followUpCap,
    },
  });

  res.json({
    success: true,
    data: updatedSlot,
    message: "Slot updated successfully",
  });
}

// Delete/deactivate a slot
export async function deleteSlot(req: Request, res: Response) {
  const slotId = getParam(req.params.slotId, "slotId");

  // Check if slot has allocated tokens
  const slot = (await prisma.slot.findUnique({
    where: { id: slotId },
    include: slotWithAllocatedTokensInclude,
  })) as Prisma.Result<
    Prisma.SlotDelegate,
    {
      where: { id: string };
      include: typeof slotWithAllocatedTokensInclude;
    },
    "findUnique"
  > | null;

  if (!slot) {
    return res.status(404).json({
      success: false,
      error: "Slot not found",
    });
  }

  if (slot.tokens.length > 0) {
    return res.status(400).json({
      success: false,
      error: "Cannot delete slot with allocated tokens. Cancel tokens first.",
    });
  }

  // Soft delete by marking as inactive
  await prisma.slot.update({
    where: { id: slotId },
    data: {
      isActive: false,
    },
  });

  res.json({
    success: true,
    message: "Slot deactivated successfully",
  });
}
