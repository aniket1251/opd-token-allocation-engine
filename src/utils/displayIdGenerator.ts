/**
 * displayID Generator for OPD Token Allocation Engine
 * Generates unique, human-readable doctor identifiers
 * Format: XXX999 (3 letters + 3 numbers, always 6 characters)
 */

import { prisma } from "../config/prisma";
import {
  extractNumber,
  formatDate,
  formatDateForDisplayID,
  formatNumber,
} from "./helper";

/**
 * Preprocesses doctor name for displayID generation
 * - Strips prefixes (Dr., Doctor, Doc)
 * - Converts to uppercase
 * - Trims extra spaces
 * - Validates only English alphabets and spaces
 */
function preprocessName(name: string): string {
  // List of common titles and prefixes to remove
  const titlesToRemove = [
    "DR",
    "DOCTOR",
    "PROF",
    "PROFESSOR",
    "MR",
    "MISTER",
    "MRS",
    "MS",
    "MISS",
    "SIR",
    "MADAM",
    "LORD",
    "LADY",
  ];

  // Convert to uppercase first
  let processed = name.trim().toUpperCase();

  // Remove titles (check each title)
  titlesToRemove.forEach((title) => {
    // Remove title at the beginning with optional dot and space
    const regex = new RegExp(`^${title}\\.?\\s+`, "i");
    processed = processed.replace(regex, "");
  });

  // Replace multiple spaces with single space
  processed = processed.replace(/\s+/g, " ").trim();

  return processed;
}

/**
 * Extracts first 3 letters from a word
 * If word is shorter than 3 letters, returns the word as-is
 */
function getFirstThreeLetters(word: string): string {
  return word.substring(0, 3);
}

/**
 * Extracts 3-letter code based on word count
 * - 1 word: First 3 letters (e.g., MADONNA → MAD)
 * - 2 words: 2 from 1st + 1 from 2nd (e.g., ANIKET GAUTAM → ANG)
 *   Special: If 1st word is 1 letter, take 1 from 1st + 2 from 2nd (A GAUTAM → AGA)
 * - 3+ words: 1st initial + 2nd initial + last initial (e.g., ANIKET KUMAR GAUTAM → AKG)
 */
function extractLetters(words: string[]): string {
  const wordCount = words.length;

  if (wordCount === 1) {
    // Single word: first 3 letters
    return getFirstThreeLetters(words[0]);
  } else if (wordCount === 2) {
    // Two words
    const firstWord = words[0];
    const secondWord = words[1];

    if (firstWord.length === 1) {
      // Special case: 1-letter first word
      // Take 1 from 1st + 2 from 2nd
      return firstWord.charAt(0) + secondWord.substring(0, 2);
    } else {
      // Normal case: 2 from 1st + 1 from 2nd
      return firstWord.substring(0, 2) + secondWord.charAt(0);
    }
  } else {
    // 3+ words: 1st initial + 2nd initial + last initial
    return (
      words[0].charAt(0) +
      words[1].charAt(0) +
      words[words.length - 1].charAt(0)
    );
  }
}

/**
 *
 */

/**
 * Doctor displayID generation function
 * Returns a unique 6-character displayID (XXX999)
 */
export async function generateDoctorDisplayID(name: string): Promise<string> {
  // Step 1: Preprocess name
  const processedName = preprocessName(name);

  // Split into words
  const words = processedName.split(" ").filter((word) => word.length > 0);

  if (words.length === 0) {
    throw new Error("Invalid name: No valid words found");
  }

  // Step 2: Filter out single-letter words (middle initials like "K.", "R.", etc.)
  const significantWords = words.filter((word) => word.length > 1);

  // Determine which words to use for prefix generation
  const wordsForPrefix =
    significantWords.length >= 2 ? significantWords : words;

  let prefix: string;

  // Step 3: Determine prefix based on word count
  if (wordsForPrefix.length === 1) {
    // Case 2: Single word - take first 3 letters
    prefix = wordsForPrefix[0].substring(0, 3).toUpperCase();
  } else if (wordsForPrefix.length === 2) {
    // Case 4: Two words - first 2 letters of first word + first letter of last word
    const firstTwo = wordsForPrefix[0].substring(0, 2).toUpperCase();
    const lastOne = wordsForPrefix[1].substring(0, 1).toUpperCase();
    prefix = firstTwo + lastOne;
  } else {
    // Case 1: Three or more words - initials from first, second, and last word
    const firstInitial = wordsForPrefix[0].substring(0, 1).toUpperCase();
    const secondInitial = wordsForPrefix[1].substring(0, 1).toUpperCase();
    const lastInitial = wordsForPrefix[wordsForPrefix.length - 1]
      .substring(0, 1)
      .toUpperCase();
    prefix = firstInitial + secondInitial + lastInitial;
  }

  // Step 4: Check for duplicate names (Case 3)
  const duplicateDoctor = await prisma.doctor.findFirst({
    where: {
      name: processedName,
    },
    orderBy: {
      displayID: "desc",
    },
  });

  if (duplicateDoctor) {
    // Duplicate name found - increment the number from the last displayID
    const currentNumber = extractNumber(duplicateDoctor.displayID);
    const nextNumber = currentNumber + 1;
    return duplicateDoctor.displayID.substring(0, 3) + formatNumber(nextNumber);
  }

  // Step 5: Check for existing displayIDs with same prefix
  const existingWithPrefix = await prisma.doctor.findFirst({
    where: {
      displayID: {
        startsWith: prefix,
      },
    },
    orderBy: {
      displayID: "desc",
    },
  });

  if (!existingWithPrefix) {
    // No existing displayID with this prefix - start with 001
    return prefix + "001";
  } else {
    // Increment from the last number
    const currentNumber = extractNumber(existingWithPrefix.displayID);
    const nextNumber = currentNumber + 1;
    return prefix + formatNumber(nextNumber);
  }
}

// Generates unique displayID for Token
// Example: T-AKG001-20260201-001, T-AKG001-20260201-002

export async function generateTokenDisplayID(
  doctorId: string,
  date: Date,
): Promise<string> {
  // Get doctor displayID
  const doctor = await prisma.doctor.findUnique({
    where: { id: doctorId },
    select: { displayID: true },
  });

  if (!doctor) {
    throw new Error("Doctor not found");
  }

  // Use CURRENT DATE (when token is created)
  const currentDate = formatDate(date);
  const formattedDate = formatDateForDisplayID(currentDate);
  const prefix = `T-${doctor.displayID}-${formattedDate}`;

  // Find last token for this doctor on this date
  const lastToken = await prisma.token.findFirst({
    where: {
      displayID: {
        startsWith: prefix,
      },
    },
    orderBy: {
      displayID: "desc",
    },
    select: {
      displayID: true,
    },
  });

  if (!lastToken) {
    // First token for this doctor today
    return `${prefix}-001`;
  }

  // Increment from last number
  const currentNumber = extractNumber(lastToken.displayID);
  const nextNumber = currentNumber + 1;
  return `${prefix}-${formatNumber(nextNumber)}`;
}

// Generates unique displayID for Slot
// Example: S-AKG001-20260201-001, S-AKG001-20260201-002

export async function generateSlotDisplayID(
  date: Date,
  doctorId: string,
): Promise<string> {
  // Get doctor displayID
  const doctor = await prisma.doctor.findUnique({
    where: { id: doctorId },
    select: { displayID: true },
  });

  if (!doctor) {
    throw new Error("Doctor not found");
  }
  const dateString = formatDate(date);
  const formattedDate = formatDateForDisplayID(dateString);
  const prefix = `S-${doctor.displayID}-${formattedDate}`;

  // Find last slot for this doctor on this date
  const lastSlot = await prisma.slot.findFirst({
    where: {
      displayID: {
        startsWith: prefix,
      },
    },
    orderBy: {
      displayID: "desc",
    },
    select: {
      displayID: true,
    },
  });

  if (!lastSlot) {
    // First slot for this doctor on this date
    return `${prefix}-001`;
  }

  // Increment from last number
  const currentNumber = extractNumber(lastSlot.displayID);
  const nextNumber = currentNumber + 1;
  return `${prefix}-${formatNumber(nextNumber)}`;
}
