import { format, isValid, parseISO } from "date-fns";

/**
 * Safely formats a date using date-fns format function
 * @param date - Date value (string, Date object, or null/undefined)
 * @param formatString - Format string for date-fns
 * @param fallback - Fallback string if date is invalid
 * @returns Formatted date string or fallback
 */
export const safeFormatDate = (
  date: string | Date | null | undefined,
  formatString: string = "MMM dd, yyyy",
  fallback: string = "Invalid Date"
): string => {
  try {
    // Handle null, undefined, or empty values
    if (!date) {
      return fallback;
    }

    let parsedDate: Date;

    // If it's already a Date object
    if (date instanceof Date) {
      parsedDate = date;
    } else if (typeof date === 'string') {
      // Handle empty strings
      if (date.trim() === '') {
        return fallback;
      }
      
      // Try to parse ISO string first
      if (date.includes('T') || date.includes('-')) {
        parsedDate = parseISO(date);
      } else {
        parsedDate = new Date(date);
      }
    } else {
      // Try to create date from other types
      parsedDate = new Date(date as any);
    }

    // Check if the parsed date is valid
    if (!isValid(parsedDate)) {
      console.warn(`Invalid date provided: ${date}`);
      return fallback;
    }

    return format(parsedDate, formatString);
  } catch (error) {
    console.error('Error formatting date:', error, 'Date:', date);
    return fallback;
  }
};

/**
 * Safely checks if a date value is valid
 * @param date - Date value to check
 * @returns boolean indicating if date is valid
 */
export const isValidDate = (date: string | Date | null | undefined): boolean => {
  if (!date) return false;
  
  try {
    let parsedDate: Date;
    
    if (date instanceof Date) {
      parsedDate = date;
    } else if (typeof date === 'string') {
      if (date.trim() === '') return false;
      parsedDate = date.includes('T') || date.includes('-') ? parseISO(date) : new Date(date);
    } else {
      parsedDate = new Date(date as any);
    }
    
    return isValid(parsedDate);
  } catch {
    return false;
  }
};

/**
 * Safely parses a date string or returns null
 * @param date - Date value to parse
 * @returns Date object or null if invalid
 */
export const safeParsedDate = (date: string | Date | null | undefined): Date | null => {
  if (!date) return null;
  
  try {
    let parsedDate: Date;
    
    if (date instanceof Date) {
      return isValid(date) ? date : null;
    } else if (typeof date === 'string') {
      if (date.trim() === '') return null;
      parsedDate = date.includes('T') || date.includes('-') ? parseISO(date) : new Date(date);
    } else {
      parsedDate = new Date(date as any);
    }
    
    return isValid(parsedDate) ? parsedDate : null;
  } catch {
    return null;
  }
};
