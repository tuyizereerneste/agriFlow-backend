import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const connectDB = async () => {
  try {
    await prisma.$connect();
    console.log('Prisma connected to Atlas database successfully');
  } catch (error) {
    console.error('Prisma connection failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
};

export default connectDB;
export { prisma };