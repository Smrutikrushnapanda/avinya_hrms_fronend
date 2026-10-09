import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getFullName(user?: {
  firstName?: string | null
  middleName?: string | null
  lastName?: string | null
} | null, fallback = "—") {
  if (!user) return fallback
  const name = [user.firstName, user.middleName, user.lastName]
    .filter((part) => part && part.trim())
    .join(" ")
    .trim()
  return name || fallback
}
