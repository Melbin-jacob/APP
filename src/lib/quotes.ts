// Shared by the quote form and the API.
export const CONTACT_TIMES = ["WEEKDAY_MORNING", "WEEKDAY_AFTERNOON", "WEEKDAY_EVENING", "WEEKEND", "ANYTIME"] as const;
export type ContactTime = (typeof CONTACT_TIMES)[number];

export const QUOTE_LIMITS = { name: 80, phone: 20, address: 200, city: 80, description: 4000, descriptionMin: 20, note: 200 } as const;

export const PHONE_PATTERN = /^\+?[0-9 ().-]{7,20}$/;
