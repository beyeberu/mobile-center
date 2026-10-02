import { storeConfig } from './storeConfig.js';

export async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      ...(options.body && !(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
  return data;
}

export const money = (amount) => new Intl.NumberFormat('en-US', {
  style: 'currency', currency: storeConfig.currency, maximumFractionDigits: 0,
}).format(amount || 0);

export const whatsappLink = (message = `Hi ${storeConfig.shopName}, I have a question.`) =>
  storeConfig.whatsappNumber
    ? `https://wa.me/${storeConfig.whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`
    : '#contact';