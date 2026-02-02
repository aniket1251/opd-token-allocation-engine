import { prisma } from "../config/prisma";
import {
  CreateTokenInput,
  AllocationResult,
  ReallocationResult,
  Token,
  Slot,
} from "../types/domain";
import { Priority, Source, TokenStatus } from "../generated/prisma/enums";
import {
  getPriorityOrder,
  findLowestPriorityToken,
  canAllocateToSlot,
  shouldPrioritizeWalkIn,
  hasSlotEnded,
  parseDate,
} from "../utils/helper";
import { createAppError } from "../middlewares/errorHandler";
import { generateTokenDisplayID } from "./displayIdGenerator";

// Create a new token and try to allocate it
export async function createToken(
  input: CreateTokenInput,
): Promise<AllocationResult> {
  return await prisma.$transaction(async (tx) => {
    // Check if idempotency key already exists
    const existingToken = await tx.token.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
      include: { slot: true },
    });

    if (existingToken) {
      return {
        success: true,
        token: existingToken,
        slot: existingToken.slot,
        message: "Token already exists (idempotent request)",
      };
    }

    // Verify doctor exists
    const doctor = await tx.doctor.findUnique({
      where: { id: input.doctorId, isActive: true },
    });

    if (!doctor) {
      throw createAppError(
        404,
        "Doctor not found or inactive",
        "DOCTOR_NOT_FOUND",
      );
    }

    const parsedDate = parseDate(input.date);

    // generate displayID for token
    const displayID = await generateTokenDisplayID(input.doctorId, parsedDate);

    // Create the token
    const token = await tx.token.create({
      data: {
        displayID,
        patientName: input.patientName,
        patientPhone: input.patientPhone,
        patientAge: input.patientAge,
        source: input.source,
        priority: input.priority,
        status: TokenStatus.WAITING,
        doctorId: input.doctorId,
        date: parseDate(input.date),
        idempotencyKey: input.idempotencyKey,
        notes: input.notes,
      },
    });

    // Try to allocate the token
    const allocationResult = await allocateToken(tx, token.id);

    // Log the operation
    await tx.auditLog.create({
      data: {
        operation: "CREATE_TOKEN",
        tokenId: token.id,
        doctorId: input.doctorId,
        details: {
          priority: input.priority,
          source: input.source,
          allocated: allocationResult.success,
        },
      },
    });

    return allocationResult;
  });
}

// Allocate a waiting token to the best available slot
async function allocateToken(
  tx: any,
  tokenId: string,
): Promise<AllocationResult> {
  const token = await tx.token.findUnique({
    where: { id: tokenId },
  });

  if (!token) {
    throw createAppError(404, "Token not found", "TOKEN_NOT_FOUND");
  }

  if (token.status !== TokenStatus.WAITING) {
    throw createAppError(
      400,
      "Token is not in waiting status",
      "INVALID_STATUS",
    );
  }

  // Get all active slots for this doctor on this date
  const slots = await tx.slot.findMany({
    where: {
      doctorId: token.doctorId,
      date: token.date,
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

  // Filter out slots that have already ended
  const availableSlots = slots.filter(
    (slot: Slot) => !hasSlotEnded(slot.endTime, slot.date),
  );

  if (availableSlots.length === 0) {
    return {
      success: false,
      token,
      slot: null,
      message: "No available slots",
    };
  }

  // Try to find a slot that can accommodate this token
  for (const slot of availableSlots) {
    const allocatedTokens = slot.tokens;
    const currentTotalCount = allocatedTokens.length;

    // Count by priority
    const paidCount = allocatedTokens.filter(
      (t: Token) => t.priority === Priority.PAID,
    ).length;
    const followUpCount = allocatedTokens.filter(
      (t: Token) => t.priority === Priority.FOLLOWUP,
    ).length;

    // Check if we can allocate to this slot
    const canAllocate = canAllocateToSlot(
      token.priority,
      paidCount,
      followUpCount,
      currentTotalCount,
      slot.capacity,
      slot.paidCap,
      slot.followUpCap,
    );

    if (canAllocate) {
      // Simple case: slot has space, just allocate
      if (currentTotalCount < slot.capacity) {
        await tx.token.update({
          where: { id: tokenId },
          data: {
            status: TokenStatus.ALLOCATED,
            slotId: slot.id,
            allocatedAt: new Date(),
          },
        });

        const updatedToken = await tx.token.findUnique({
          where: { id: tokenId },
          include: { slot: true },
        });

        return {
          success: true,
          token: updatedToken,
          slot: slot,
          message: "Token allocated successfully",
        };
      }

      // Slot is full, but token is EMERGENCY - need to displace someone
      if (
        token.priority === Priority.EMERGENCY &&
        currentTotalCount >= slot.capacity
      ) {
        const displacedTokenId = findLowestPriorityToken(allocatedTokens);

        if (!displacedTokenId) {
          continue; // No token to displace, try next slot
        }

        // Displace the lowest priority token
        await tx.token.update({
          where: { id: displacedTokenId },
          data: {
            status: TokenStatus.WAITING,
            slotId: null,
            allocatedAt: null,
          },
        });

        // Allocate emergency token
        await tx.token.update({
          where: { id: tokenId },
          data: {
            status: TokenStatus.ALLOCATED,
            slotId: slot.id,
            allocatedAt: new Date(),
          },
        });

        // Try to reallocate the displaced token
        await allocateToken(tx, displacedTokenId);

        const updatedToken = await tx.token.findUnique({
          where: { id: tokenId },
          include: { slot: true },
        });

        await tx.auditLog.create({
          data: {
            operation: "EMERGENCY_DISPLACEMENT",
            tokenId: tokenId,
            slotId: slot.id,
            doctorId: token.doctorId,
            details: {
              displacedTokenId,
            },
          },
        });

        return {
          success: true,
          token: updatedToken,
          slot: slot,
          message: "Emergency token allocated, displaced lower priority token",
        };
      }
    }
  }

  // No slot found
  return {
    success: false,
    token,
    slot: null,
    message: "All slots are full or capacity limits reached",
  };
}

// Cancel a token and reallocate waiting tokens
export async function cancelToken(
  tokenId: string,
): Promise<ReallocationResult> {
  return await prisma.$transaction(async (tx) => {
    const token = await tx.token.findUnique({
      where: { id: tokenId },
      include: { slot: true },
    });

    if (!token) {
      throw createAppError(404, "Token not found", "TOKEN_NOT_FOUND");
    }

    if (token.status === TokenStatus.CANCELLED) {
      throw createAppError(400, "Token already cancelled", "ALREADY_CANCELLED");
    }

    if (token.status === TokenStatus.COMPLETED) {
      throw createAppError(
        400,
        "Cannot cancel completed token",
        "CANNOT_CANCEL_COMPLETED",
      );
    }

    // Cancel the token
    await tx.token.update({
      where: { id: tokenId },
      data: {
        status: TokenStatus.CANCELLED,
        slotId: null,
        cancelledAt: new Date(),
      },
    });

    const movedTokens = [];

    // If token was allocated, try to fill the gap
    if (token.slotId && token.slot) {
      // Check if slot has already ended - if yes, skip reallocation
      if (hasSlotEnded(token.slot.endTime, token.slot.date)) {
        // Slot already ended, don't try to reallocate
        await tx.auditLog.create({
          data: {
            operation: "CANCEL_TOKEN",
            tokenId: tokenId,
            slotId: token.slotId,
            doctorId: token.doctorId,
            details: {
              movedTokensCount: 0,
              reason: "Slot already ended",
            },
          },
        });

        return {
          success: true,
          movedTokens: [],
          freedSlot: token.slot,
          message: "Token cancelled (slot already ended, no reallocation)",
        };
      }

      // Check if we should prioritize walk-ins based on timing
      const prioritizeWalkIn = shouldPrioritizeWalkIn(
        token.slot.startTime,
        token.slot.endTime,
        token.slot.date,
      );

      // Build where clause based on timing
      const whereClause: any = {
        doctorId: token.doctorId,
        date: token.date,
        status: TokenStatus.WAITING,
      };

      // If slot is soon, only consider walk-ins
      if (prioritizeWalkIn) {
        whereClause.source = Source.WALKIN;
      }

      // Get waiting tokens
      let waitingTokens = await tx.token.findMany({
        where: whereClause,
        orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
      });

      // Fallback: if no walk-ins found but slot is soon, try online too
      if (waitingTokens.length === 0 && prioritizeWalkIn) {
        waitingTokens = await tx.token.findMany({
          where: {
            doctorId: token.doctorId,
            date: token.date,
            status: TokenStatus.WAITING,
          },
          orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
        });
      }

      // Try to allocate waiting tokens
      for (const waitingToken of waitingTokens) {
        const result = await allocateToken(tx, waitingToken.id);
        if (result.success) {
          movedTokens.push(result.token);
        }
      }
    }

    // Log the operation
    await tx.auditLog.create({
      data: {
        operation: "CANCEL_TOKEN",
        tokenId: tokenId,
        slotId: token.slotId,
        doctorId: token.doctorId,
        details: {
          movedTokensCount: movedTokens.length,
        },
      },
    });

    return {
      success: true,
      movedTokens,
      freedSlot: token.slot,
      message: `Token cancelled. ${movedTokens.length} waiting tokens were reallocated.`,
    };
  });
}

// Mark token as no-show and reallocate waiting tokens
export async function markNoShow(tokenId: string): Promise<ReallocationResult> {
  return await prisma.$transaction(async (tx) => {
    const token = await tx.token.findUnique({
      where: { id: tokenId },
      include: { slot: true },
    });

    if (!token) {
      throw createAppError(404, "Token not found", "TOKEN_NOT_FOUND");
    }

    if (token.status !== TokenStatus.ALLOCATED) {
      throw createAppError(
        400,
        "Token must be allocated to mark as no-show",
        "INVALID_STATUS",
      );
    }

    // Mark as no-show
    await tx.token.update({
      where: { id: tokenId },
      data: {
        status: TokenStatus.NO_SHOW,
        slotId: null,
      },
    });

    const movedTokens = [];

    // If token had a slot, try to fill the gap
    if (token.slot) {
      // Check if slot has already ended - if yes, skip reallocation
      if (hasSlotEnded(token.slot.endTime, token.slot.date)) {
        // Slot already ended, don't try to reallocate
        await tx.auditLog.create({
          data: {
            operation: "NO_SHOW",
            tokenId: tokenId,
            slotId: token.slotId,
            doctorId: token.doctorId,
            details: {
              movedTokensCount: 0,
              reason: "Slot already ended",
            },
          },
        });

        return {
          success: true,
          movedTokens: [],
          freedSlot: token.slot,
          message:
            "Token marked as no-show (slot already ended, no reallocation)",
        };
      }

      // Check if we should prioritize walk-ins based on timing
      const prioritizeWalkIn = shouldPrioritizeWalkIn(
        token.slot.startTime,
        token.slot.endTime,
        token.slot.date,
      );

      // Build where clause based on timing
      const whereClause: any = {
        doctorId: token.doctorId,
        date: token.date,
        status: TokenStatus.WAITING,
      };

      // If slot is soon, only consider walk-ins
      if (prioritizeWalkIn) {
        whereClause.source = Source.WALKIN;
      }

      // Get waiting tokens
      let waitingTokens = await tx.token.findMany({
        where: whereClause,
        orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
      });

      // Fallback: if no walk-ins found but slot is soon, try online too
      if (waitingTokens.length === 0 && prioritizeWalkIn) {
        waitingTokens = await tx.token.findMany({
          where: {
            doctorId: token.doctorId,
            date: token.date,
            status: TokenStatus.WAITING,
          },
          orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
        });
      }

      // Try to allocate waiting tokens
      for (const waitingToken of waitingTokens) {
        const result = await allocateToken(tx, waitingToken.id);
        if (result.success) {
          movedTokens.push(result.token);
        }
      }
    }

    // Log the operation
    await tx.auditLog.create({
      data: {
        operation: "NO_SHOW",
        tokenId: tokenId,
        slotId: token.slotId,
        doctorId: token.doctorId,
        details: {
          movedTokensCount: movedTokens.length,
        },
      },
    });

    return {
      success: true,
      movedTokens,
      freedSlot: token.slot,
      message: `Token marked as no-show. ${movedTokens.length} waiting tokens were reallocated.`,
    };
  });
}

// Mark token as completed
export async function completeToken(tokenId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const token = await tx.token.findUnique({
      where: { id: tokenId },
    });

    if (!token) {
      throw createAppError(404, "Token not found", "TOKEN_NOT_FOUND");
    }

    if (token.status !== TokenStatus.ALLOCATED) {
      throw createAppError(
        400,
        "Only allocated tokens can be completed",
        "INVALID_STATUS",
      );
    }

    await tx.token.update({
      where: { id: tokenId },
      data: {
        status: TokenStatus.COMPLETED,
        completedAt: new Date(),
      },
    });

    await tx.auditLog.create({
      data: {
        operation: "COMPLETE_TOKEN",
        tokenId: tokenId,
        slotId: token.slotId,
        doctorId: token.doctorId,
      },
    });
  });
}

// Expire all waiting tokens at end of day
export async function expireWaitingTokens(
  doctorId: string,
  date: string,
): Promise<number> {
  const parsedDate = parseDate(date);

  const result = await prisma.token.updateMany({
    where: {
      doctorId,
      date: parsedDate,
      status: TokenStatus.WAITING,
    },
    data: {
      status: TokenStatus.EXPIRED,
    },
  });

  await prisma.auditLog.create({
    data: {
      operation: "EXPIRE_TOKENS",
      doctorId,
      details: {
        date,
        expiredCount: result.count,
      },
    },
  });

  return result.count;
}
