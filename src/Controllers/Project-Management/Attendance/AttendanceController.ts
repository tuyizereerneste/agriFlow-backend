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
}

export default AttendanceController;