export function normalizeCommissionRate(rate: number | null | undefined, fallback = 0.2) {
  const numericRate = Number(rate);

  if (!Number.isFinite(numericRate) || numericRate <= 0) {
    return fallback;
  }

  return numericRate > 1 ? numericRate / 100 : numericRate;
}

export function calculateCommissionCents(amountCents: number, rate: number | null | undefined) {
  return Math.floor(amountCents * normalizeCommissionRate(rate));
}
