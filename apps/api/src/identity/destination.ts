import { ApiException } from '../common/http';

export function normalizeDestination(raw: string): string {
  const value = raw.trim();
  if (value.includes('@')) {
    const email = value.toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new ApiException(400, 'INVALID_DESTINATION', 'Enter a valid email or phone number');
    }
    return email;
  }
  const phone = value.replace(/[^\d+]/g, '');
  if (!/^\+?\d{8,15}$/.test(phone)) {
    throw new ApiException(400, 'INVALID_DESTINATION', 'Enter a valid email or phone number');
  }
  return phone;
}

export function defaultDisplayName(destination: string): string {
  if (destination.includes('@')) return destination.split('@')[0];
  return destination.slice(-4);
}
