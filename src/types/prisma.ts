// src/types/prisma.ts
import { Prisma } from "../generated/prisma/client";
import { TokenStatus } from "../generated/prisma/enums";

export const slotWithAllocatedTokensInclude = {
  tokens: {
    where: {
      status: TokenStatus.ALLOCATED,
    },
  },
} satisfies Prisma.SlotInclude;
