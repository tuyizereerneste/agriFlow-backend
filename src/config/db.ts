import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

const connectDB = async () => {
  try {
    await prisma.$connect();
    console.log("Prisma connected to Atlas database successfully");
  } catch (error) {
    console.error("Prisma connection failed:", error);
    process.exit(1);
  }
};

export default connectDB;