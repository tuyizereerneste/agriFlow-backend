import { Request, Response } from "express";
import { prisma } from "../../../config/db";


class AttendanceController {


  static async registerAttendance(req: Request, res: Response): Promise<void> {
    try {
      console.log('Request body:', req.body); // Log the request body
      console.log('Request files:', req.files); // Log the request files

      const { farmerId, activityId, notes } = req.body;
      const photos = req.files ? (req.files as Express.Multer.File[]).map(file => file.filename) : [];

      if (!farmerId || !activityId) {
        console.log('Missing required fields'); // Log missing fields
        res.status(400).json({ message: "Missing required fields" });
        return;
      }

      const existing = await prisma.attendance.findFirst({
        where: { farmerId, activityId },
      });
      if (existing) {
        console.log('Attendance already recorded for this activity'); // Log existing attendance
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
        console.log('Activity not found'); // Log activity not found
        res.status(404).json({ message: "Activity not found" });
        return;
      }

      const projectId = activity.targetPractice.projectId;

      const isEnrolled = await prisma.projectEnrollment.findFirst({
        where: { projectId, farmerId },
      });

      if (!isEnrolled) {
        console.log('Farmer is not enrolled in this project'); // Log farmer not enrolled
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
  
      // Get the activity, practice, and project
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
  
      // Get farmers enrolled in the project
      const enrolledFarmers = await prisma.projectEnrollment.findMany({
        where: { projectId },
        select: { farmerId: true },
      });
  
      const enrolledFarmerIds = new Set(enrolledFarmers.map(e => e.farmerId));
  
      // Get attendance records for the activity
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
  
      // Filter only those farmers who are enrolled in the project
      const validAttendance = attendanceRecords.filter(record =>
        enrolledFarmerIds.has(record.farmer.id)
      );
  
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