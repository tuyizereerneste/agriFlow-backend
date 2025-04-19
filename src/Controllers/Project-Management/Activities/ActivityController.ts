import { Request, Response } from "express";
import { prisma } from "../../../config/db";

class ActivityController {
  static async createActivity(req: Request, res: Response): Promise<void> {
    try {
      const { title, description, startDate, endDate, targetPracticeId } = req.body;

      // Validate required fields
      if (!title || !description || !startDate || !endDate || !targetPracticeId) {
        res.status(400).json({ message: "All fields are required." });
        return;
      }

      // Validate that targetPractice exists
      const targetPractice = await prisma.targetPractice.findUnique({
        where: { id: targetPracticeId },
      });

      if (!targetPractice) {
        res.status(404).json({ message: "Target Practice not found." });
        return;
      }

      // Create activity
      const activity = await prisma.activity.create({
        data: {
          title,
          description,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          targetPracticeId,
        },
      });

      res.status(201).json({ message: "Activity created successfully", data: activity });
    } catch (error) {
      console.error("Error creating activity:", error);
      res.status(500).json({ message: "Error creating activity", error });
    }
  }
}

export default ActivityController;
