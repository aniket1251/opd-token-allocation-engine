import { Request, Response } from "express";
import { CreateDoctorInput } from "../types/domain";
import { prisma } from "../config/prisma";
import { generateDoctorDisplayID } from "../utils/displayIdGenerator";
import { getParam } from "../utils/helper";

// Create a new doctor
export async function createDoctor(req: Request, res: Response) {
  const input: CreateDoctorInput = {
    name: req.body.name,
    specialization: req.body.specialization,
  };
  const displayID = await generateDoctorDisplayID(input.name);
  const doctor = await prisma.doctor.create({
    data: {
      name: input.name,
      displayID,
      specialization: input.specialization,
    },
  });

  res.status(201).json({
    success: true,
    data: doctor,
    message: "Doctor created successfully",
  });
}

// Get doctor by ID
export async function getDoctorById(req: Request, res: Response) {
  const doctorId = getParam(req.params.doctorId, "doctorId");

  const doctor = await prisma.doctor.findUnique({
    where: { id: doctorId },
  });

  if (!doctor) {
    return res.status(404).json({
      success: false,
      error: "Doctor not found",
    });
  }

  res.json({
    success: true,
    data: doctor,
  });
}

// Get all doctors
export async function getAllDoctors(req: Request, res: Response) {
  const { isActive } = req.query;

  const doctors = await prisma.doctor.findMany({
    where: {
      isActive: isActive === "false" ? false : true,
    },
    orderBy: {
      displayID: "asc",
    },
  });

  res.json({
    success: true,
    data: doctors,
    count: doctors.length,
  });
}

// Activate doctor
export async function activateDoctor(req: Request, res: Response) {
  const doctorId = getParam(req.params.doctorId, "doctorId");

  const doctor = await prisma.doctor.update({
    where: { id: doctorId },
    data: {
      isActive: true,
    },
  });

  res.json({
    success: true,
    data: doctor,
    message: "Doctor activated successfully",
  });
}

// Deactivate doctor
export async function deactivateDoctor(req: Request, res: Response) {
  const doctorId = getParam(req.params.doctorId, "doctorId");

  const doctor = await prisma.doctor.update({
    where: { id: doctorId },
    data: {
      isActive: false,
    },
  });

  res.json({
    success: true,
    data: doctor,
    message: "Doctor deactivated successfully",
  });
}
