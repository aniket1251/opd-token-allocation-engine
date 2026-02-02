import express from "express";
import {
  createPatientToken,
  getPatientTokenById,
  getPatientsTokensByDoctor,
  cancelPatientToken,
  markPatientTokenNoShow,
  markPatientTokenComplete,
  expireWaitingPatientsTokens,
  getWaitingPatientsTokens,
} from "../controllers/tokenControllers";
import {
  validateCreateToken,
  validateDoctorId,
  validateTokenId,
} from "../middlewares/validator";
import { asyncHandler } from "../middlewares/errorHandler";

const router = express.Router();

// Create a new token
router.post("/", validateCreateToken, asyncHandler(createPatientToken));

// Get token by ID
router.get("/:tokenId", validateTokenId, asyncHandler(getPatientTokenById));

// Get all tokens for a doctor on a specific date
// Query: ?date=DD-MM-YYYY
router.get(
  "/doctor/:doctorId",
  validateDoctorId,
  asyncHandler(getPatientsTokensByDoctor),
);

// Get waiting tokens for a doctor
// Query: ?date=DD-MM-YYYY
router.get(
  "/doctor/:doctorId/waiting",
  validateDoctorId,
  asyncHandler(getWaitingPatientsTokens),
);

// Cancel a token
router.patch(
  "/:tokenId/cancel",
  validateTokenId,
  asyncHandler(cancelPatientToken),
);

// Mark token as no-show
router.patch(
  "/:tokenId/no-show",
  validateTokenId,
  asyncHandler(markPatientTokenNoShow),
);

// Mark token as completed
router.patch(
  "/:tokenId/complete",
  validateTokenId,
  asyncHandler(markPatientTokenComplete),
);

// Expire waiting tokens for a doctor on a specific date
router.post(
  "/doctor/:doctorId/expire",
  validateDoctorId,
  asyncHandler(expireWaitingPatientsTokens),
);

export default router;
