// Contact form: topics and limits shared by the form and the API.
export const CONTACT_TOPICS = ["general", "customer", "business", "account", "privacy", "advertising", "other"] as const;
export type ContactTopic = (typeof CONTACT_TOPICS)[number];
export const CONTACT_LIMITS = { name: 80, phone: 30, messageMin: 20, message: 3000 } as const;
