import express from "express";
import {
  createSlot,
  getSlotById,
  getSlotsByDoctor,
  getSlotAvailability,
  updateSlotCapacity,
  deleteSlot,
} from "../controllers/slotControllers";
import {
  validateCreateSlot,
  validateDoctorId,
  validateSlotId,
} from "../middlewares/validator";
import { asyncHandler } from "../middlewares/errorHandler";

const router = express.Router();

// Create a new slot
router.post("/", validateCreateSlot, asyncHandler(createSlot));

// Get slot by ID
router.get("/:slotId", validateSlotId, asyncHandler(getSlotById));

// Get all slots for a doctor on a specific date
// Query: ?date=DD-MM-YYYY
router.get(
  "/doctor/:doctorId",
  validateDoctorId,
  asyncHandler(getSlotsByDoctor),
);

// Get slot availability with detailed stats
router.get(
  "/:slotId/availability",
  validateSlotId,
  asyncHandler(getSlotAvailability),
);

// Update slot capacity
router.patch(
  "/:slotId/capacity",
  validateSlotId,
  asyncHandler(updateSlotCapacity),
);

// Delete/deactivate a slot
router.delete("/:slotId", validateSlotId, asyncHandler(deleteSlot));

export default router;
