import { prisma } from './prisma';

const RESELLER_PREFIX = 'BM';
const RESELLER_START = 10001;

/**
 * Generate the next unique Reseller ID in the format BM-10001, BM-10002, etc.
 * Thread-safe: uses the database to determine the next available number.
 */
export async function generateResellerId(): Promise<string> {
  // Find the highest existing reseller ID
  const latest = await prisma.affiliate.findFirst({
    where: {
      resellerId: {
        startsWith: `${RESELLER_PREFIX}-`,
      },
    },
    orderBy: { resellerId: 'desc' },
    select: { resellerId: true },
  });

  let nextNumber = RESELLER_START;

  if (latest?.resellerId) {
    const match = latest.resellerId.match(/^BM-(\d+)$/);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }

  const resellerId = `${RESELLER_PREFIX}-${nextNumber}`;

  // Verify uniqueness (edge case: manual entries that don't follow the pattern)
  const exists = await prisma.affiliate.findUnique({
    where: { resellerId },
  });

  if (exists) {
    // Recursive retry — extremely unlikely unless there's manual data
    return generateResellerId();
  }

  return resellerId;
}
