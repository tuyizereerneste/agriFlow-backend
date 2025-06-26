import { Request, Response } from "express";
import { prisma } from "../../../config/db";

class StatsController {
    static async getStats(req: Request, res: Response): Promise<void> {
        try {
          // Count total projects
          const totalProjects = await prisma.project.count();
    
          // Count total practices
          const totalPractices = await prisma.targetPractice.count();
    
          // Count total activities
          const totalActivities = await prisma.activity.count();

          // Count total Attendance records
          const distinctAttendance = await prisma.attendance.findMany({
            select: {
              farmerId: true,
            },
            distinct: ["farmerId"],
          });
          const totalAttendance = distinctAttendance.length;

    
          // Count distinct enrolled farmers
          const distinctFarmers = await prisma.projectEnrollment.findMany({
            select: {
              farmerId: true,
            },
            distinct: ["farmerId"],
          });
          const totalEnrolledFarmers = distinctFarmers.length;
    
          // Send response
          res.status(200).json({
            message: "Statistics retrieved successfully",
            data: {
              totalProjects,
              totalPractices,
              totalActivities,
              totalEnrolledFarmers,
              totalAttendance,
            },
          });
        } catch (error) {
          console.error("Error retrieving stats:", error);
          res.status(500).json({
            message: "Failed to retrieve statistics",
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }
}

export default StatsController;