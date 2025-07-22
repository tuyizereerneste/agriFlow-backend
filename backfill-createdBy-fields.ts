import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function backfillCreatedBy() {
  const defaultAdminUserId = '681a05bd24467f3d346d4fec';

  console.log('Starting backfill...');

  await prisma.farmer.updateMany({
    data: { createdById: defaultAdminUserId },
  });

  await prisma.project.updateMany({
    data: { createdById: defaultAdminUserId },
  });

  await prisma.projectEnrollment.updateMany({
    data: { createdById: defaultAdminUserId },
  });

  await prisma.attendance.updateMany({
    data: { createdById: defaultAdminUserId },
  });

  console.log('Backfill complete ✅');
}

backfillCreatedBy()
  .catch((e) => {
    console.error('Backfill failed ❌', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
