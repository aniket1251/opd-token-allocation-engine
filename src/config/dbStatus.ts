import { prisma } from "./prisma";

export async function logDbStatus(): Promise<void> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log("DB connected successfully");
  } catch (error) {
    console.error("DB connection failed");
    console.error(error);
  }
}
