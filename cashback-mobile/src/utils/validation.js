export const isValidMobile = value => /^\d{10}$/.test(String(value || ""));

export const isValidEmail = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());

export const normalizeMobile = value => String(value || "").replace(/\D/g, "").slice(0, 10);
