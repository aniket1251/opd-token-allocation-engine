import express from "express";
import {
  createDoctor,
  getDoctorById,
  getAllDoctors,
  deactivateDoctor,
  activateDoctor,
} from "../controllers/doctorControllers";
import {
  validateCreateDoctor,
  validateDoctorId,
} from "../middlewares/validator";
import { asyncHandler } from "../middlewares/errorHandler";

const router = express.Router();

// Create a new doctor
router.post("/", validateCreateDoctor, asyncHandler(createDoctor));

// Get all doctors
// Query: ?isActive=true/false (optional, defaults to true)
router.get("/", asyncHandler(getAllDoctors));

// Get doctor by ID
router.get("/:doctorId", validateDoctorId, asyncHandler(getDoctorById));

// Update doctor
router.patch(
  "/:doctorId/activate",
  validateDoctorId,
  asyncHandler(activateDoctor),
);

// Deactivate doctor
router.patch(
  "/:doctorId/deactivate",
  validateDoctorId,
  asyncHandler(deactivateDoctor),
);

export default router;
