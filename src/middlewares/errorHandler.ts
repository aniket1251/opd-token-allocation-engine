import { Request, Response, NextFunction } from "express";

// Custom error object (not a class)
export interface AppError extends Error {
  statusCode: number;
  code?: string;
  details?: Record<string, unknown>;
}

// Factory function to create AppError
export function createAppError(
  statusCode: number,
  message: string,
  code?: string,
  details?: Record<string, unknown>,
): AppError {
  const error = new Error(message) as AppError;
  error.name = "AppError";
  error.statusCode = statusCode;
  error.code = code;
  error.details = details;
  Error.captureStackTrace(error, createAppError);
  return error;
}

// Error handler middleware
export function errorHandler(
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  // Default error values
  let statusCode = 500;
  let message = "Internal server error";
  let code = "INTERNAL_ERROR";
  let details = undefined;

  // Handle custom AppError
  if (err.name === "AppError") {
    const appErr = err as AppError;
    statusCode = appErr.statusCode;
    message = appErr.message;
    code = appErr.code || "APP_ERROR";
    details = appErr.details;
  }
  // Handle Prisma errors
  else if (err.name === "PrismaClientKnownRequestError") {
    statusCode = 400;
    const prismaError = err as any;

    if (prismaError.code === "P2002") {
      message = "Duplicate entry found";
      code = "DUPLICATE_ENTRY";
    } else if (prismaError.code === "P2025") {
      message = "Record not found";
      code = "NOT_FOUND";
    } else {
      message = "Database error";
      code = "DATABASE_ERROR";
    }
  }
  // Handle validation errors
  else if (err.name === "ValidationError") {
    statusCode = 400;
    message = err.message;
    code = "VALIDATION_ERROR";
  }

  // Log error in development
  if (process.env.NODE_ENV === "development") {
    console.error("Error:", {
      statusCode,
      code,
      message,
      details,
      stack: err.stack,
    });
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: message,
    code,
    details,
  });
}

// Async handler wrapper to catch errors in async routes
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
