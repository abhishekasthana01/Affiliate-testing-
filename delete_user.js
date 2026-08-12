const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const result = await prisma.user.deleteMany({
      where: { email: 'abhishekasthanaofc@gmail.com' }
    });
    console.log(`Deleted ${result.count} users`);
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
