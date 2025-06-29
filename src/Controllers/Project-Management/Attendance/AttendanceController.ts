import { Request, Response } from "express";
import { prisma } from "../../../config/db";


class AttendanceController {


  static async registerAttendance(req: Request, res: Response): Promise<void> {
    try {

      const { farmerId, activityId, notes } = req.body;
      const photos = req.files ? (req.files as Express.Multer.File[]).map(file => file.filename) : [];

      if (!farmerId || !activityId) {
        res.status(400).json({ message: "Missing required fields" });
        return;
      }

      const existing = await prisma.attendance.findFirst({
        where: { farmerId, activityId },
      });
      if (existing) {
        res.status(400).json({ message: "Attendance already recorded for this activity" });
        return;
      }

      const activity = await prisma.activity.findUnique({
        where: { id: activityId },
        include: {
          targetPractice: { select: { projectId: true } },
        },
      });

      if (!activity) {
        res.status(404).json({ message: "Activity not found" });
        return;
      }

      const projectId = activity.targetPractice.projectId;

      const isEnrolled = await prisma.projectEnrollment.findFirst({
        where: { projectId, farmerId },
      });

      if (!isEnrolled) {
        res.status(403).json({ message: "Farmer is not enrolled in this project" });
        return;
      }

      const attendance = await prisma.attendance.create({
        data: {
          farmerId,
          activityId,
          notes,
          photos,
        },
      });

      res.status(201).json({ message: "Attendance recorded", data: attendance });
    } catch (error) {
      console.error("Error registering attendance:", error);
      res.status(500).json({ message: "Error registering attendance", error });
    }
  }


  static async getValidAttendanceByActivity(req: Request, res: Response): Promise<void> {
    try {
      const { activityId } = req.params;
  
      if (!activityId) {
        res.status(400).json({ message: "Missing activityId parameter" });
        return;
      }
  
      const activity = await prisma.activity.findUnique({
        where: { id: activityId },
        include: {
          targetPractice: {
            include: {
              project: true,
            },
          },
        },
      });
  
      if (!activity || !activity.targetPractice || !activity.targetPractice.project) {
        res.status(404).json({ message: "Activity, practice, or project not found" });
        return;
      }
  
      const projectId = activity.targetPractice.projectId;
  
      const enrolledFarmers = await prisma.projectEnrollment.findMany({
        where: { projectId },
        select: { farmerId: true },
      });
  
      const enrolledFarmerIds = new Set(enrolledFarmers.map(e => e.farmerId));
  
      const attendanceRecords = await prisma.attendance.findMany({
        where: { activityId },
        include: {
          farmer: {
            select: {
              id: true,
              names: true,
              phones: true,
              farmerNumber: true,
              gender: true,
              dob: true,
              location: true,
            },
          },
        },
      });
  
      const validAttendance = attendanceRecords
        .filter(record => enrolledFarmerIds.has(record.farmer.id))
        .sort((a, b) => a.farmer.names.localeCompare(b.farmer.names));
  
      res.status(200).json({
        activity: {
          id: activity.id,
          title: activity.title,
        },
        practice: {
          id: activity.targetPractice.id,
          title: activity.targetPractice.title,
        },
        project: {
          id: activity.targetPractice.project.id,
          title: activity.targetPractice.project.title,
        },
        attendance: validAttendance,
      });
  
    } catch (error) {
      console.error("Error fetching attendance:", error);
      res.status(500).json({ message: "Error fetching attendance", error });
    }
  }
  
  static async getAttendanceByFarmer(req: Request, res: Response): Promise<void> {
    try {
      const { farmerId } = req.params;
  
      if (!farmerId) {
        res.status(400).json({ message: "Missing farmerId parameter" });
        return;
      }
  
      const attendanceRecords = await prisma.attendance.findMany({
        where: { farmerId },
        orderBy: { createdAt: "desc" },
        include: {
          farmer: true,
          activity: {
            include: {
              targetPractice: {
                include: {
                  project: {
                    include: {
                      owner: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
  
      if (!attendanceRecords || attendanceRecords.length === 0) {
        res.status(404).json({ message: "No attendance records found for this farmer" });
        return;
      }
  
      res.status(200).json({
        message: "Attendance records retrieved successfully",
        data: attendanceRecords,
      });
    } catch (error) {
      console.error("Error fetching attendance records:", error);
      res.status(500).json({ message: "Error fetching attendance records", error });
    }
  }
  

  

}

export default AttendanceController;