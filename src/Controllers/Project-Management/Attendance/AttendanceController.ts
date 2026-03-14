import { Request, Response } from "express";
import { prisma } from "../../../config/db";


interface AuthRequest extends Request {
  user?: {
    id: string;
    role?: string;
  };
}

class AttendanceController {
  /**
   * Register attendance for a farmer in an activity.
   * 
   * This endpoint expects the following fields in the request body:
   * - farmerId: The ID of the farmer attending the activity.
   * - activityId: The ID of the activity the farmer is attending.
   * - notes: Optional notes about the farmer's attendance.
   * - photos: Optional array of file names for photos of the farmer's attendance.
   * 
   * The endpoint returns a JSON response with the newly created attendance record.
   * 
   * Only authorized users with the 'Admin' or 'Volunteer' role can access this endpoint.
   * 
   * If the user is a Volunteer, the endpoint checks that the user is assigned to the project
   * of the activity and that the farmer is enrolled in the project.
   * 
   * If the user is not authorized or does not have the required role, the endpoint returns a 401 Unauthorized response.
   * 
   * If the request body is missing required fields, the endpoint returns a 400 Bad Request response.
   * 
   * If the attendance record already exists for the given farmer and activity, the endpoint returns a 400 Bad Request response.
   * 
   * If an error occurs while registering the attendance, the endpoint returns a 500 Internal Server Error response.
   */
  static async registerAttendance(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { farmerId, activityId, notes } = req.body;
      const photos = req.files ? (req.files as Express.Multer.File[]).map(file => file.filename) : [];
  
      if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }
  
      if (!farmerId || !activityId) {
        res.status(400).json({ message: "Missing required fields" });
        return;
      }
  
      // ✅ Check if attendance already exists
      const existing = await prisma.attendance.findFirst({
        where: { farmerId, activityId },
      });
  
      if (existing) {
        res.status(400).json({ message: "Attendance already recorded for this activity" });
        return;
      }
  
      // ✅ Fetch activity to get projectId
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
  
      // ✅ Volunteer Project Assignment Check
      if (req.user?.role === 'Volunteer') {
        const isAssigned = await prisma.volunteerProjectAssignment.findFirst({
          where: {
            volunteerId: userId,
            projectId: projectId,
          },
        });
  
        if (!isAssigned) {
          res.status(403).json({
            message: "You are not assigned to this project. You cannot record attendance for its activities.",
          });
        }
      }
  
      // ✅ Farmer Enrollment Check
      const isEnrolled = await prisma.projectEnrollment.findFirst({
        where: { projectId, farmerId },
      });
  
      if (!isEnrolled) {
        res.status(403).json({ message: "Farmer is not enrolled in this project" });
        return;
      }
  
      // ✅ Save Attendance with createdById tracking
      const attendance = await prisma.attendance.create({
        data: {
          farmerId,
          activityId,
          notes,
          photos,
          createdById: userId,
        },
      });
  
      res.status(201).json({ message: "Attendance recorded ✅", data: attendance });
    } catch (error) {
      console.error("Error registering attendance:", error);
      res.status(500).json({ message: "Error registering attendance", error });
    }
  }
  


  /**
   * Fetches valid attendance records for a given activity.
   * @param {AuthRequest} req - The request object containing the activityId parameter and the user object.
   * @param {Response} res - The response object.
   * @returns {Promise<void>}
   * @throws {Error} If an error occurs while fetching attendance records.
   */
  static async getValidAttendanceByActivity(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { activityId } = req.params;
      const id = activityId as string;
      const userId = req.user?.id;
  
      if (!activityId) {
        res.status(400).json({ message: "Missing activityId parameter" });
        return;
      }
  
      // ✅ Load activity along with its practice and project
      const activity = await prisma.activity.findUnique({
        where: { id },
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
  
      // ✅ Get all farmers enrolled in this project
      const enrolledFarmers = await prisma.projectEnrollment.findMany({
        where: { projectId },
        select: { farmerId: true },
      });
  
      const enrolledFarmerIds = new Set(enrolledFarmers.map(e => e.farmerId));
  
      // ✅ Build attendance query filter
      const attendanceWhere: any = {
        activityId,
      };
  
      // ✅ If the user is a Volunteer, only get attendance that they recorded (createdById)
      if (req.user?.role === 'Volunteer') {
        attendanceWhere.createdById = userId;
      }
  
      const attendanceRecords = await prisma.attendance.findMany({
        where: attendanceWhere,
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
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true, // Include the role field
            },
          },
        },
      });
      
  
      // ✅ Filter out farmers not enrolled in the project (this keeps your existing logic)
      const validAttendance = attendanceRecords
        .filter(record => enrolledFarmerIds.has(record.farmer.id))
        .sort((a, b) => a.farmer.names.localeCompare(b.farmer.names));
  
      res.status(200).json({
        project: {
          id: activity.targetPractice.project.id,
          title: activity.targetPractice.project.title,
        },
        practice: {
          id: activity.targetPractice.id,
          title: activity.targetPractice.title,
        },
        activity: {
          id: activity.id,
          title: activity.title,
        },
        farmers: validAttendance.map(record => ({
          id: record.farmer.id,
          names: record.farmer.names,
          phones: record.farmer.phones,
          farmerNumber: record.farmer.farmerNumber,
          gender: record.farmer.gender,
          dob: record.farmer.dob,
          location: record.farmer.location,
          notes: record.notes,
          photos: record.photos,
          attendanceId: record.id,
          createdAt: record.createdAt,
          createdBy: record.createdBy
            ? {
                id: record.createdBy.id,
                name: record.createdBy.name,
                email: record.createdBy.email,
                role: record.createdBy.role,
              }
            : null,
        })),
      });
    } catch (error) {
      console.error("Error fetching attendance:", error);
      res.status(500).json({ message: "Error fetching attendance", error });
    }
  }
  
  
/**
 * Retrieves all attendance records for a given farmer.
 * 
 * @param {Request} req - Express request object.
 * @param {Response} res - Express response object.
 * @returns {Promise<void>} - Promise that resolves when the response has been sent.
 *
 * @example
 * GET /api/attendance/farmer/:farmerId
 * @example
 * GET /api/attendance/farmer/12345
 * 
 * @throws {Error} - If an error occurs while retrieving the attendance records.
 * @throws {Response} - If the farmerId parameter is missing or invalid.
 */
  static async getAttendanceByFarmer(req: Request, res: Response): Promise<void> {
    try {
      const { farmerId } = req.params;
      const id = farmerId as string;
  
      if (!farmerId) {
        res.status(400).json({ message: "Missing farmerId parameter" });
        return;
      }
  
      const attendanceRecords = await prisma.attendance.findMany({
        where: { farmerId: id },
        orderBy: { createdAt: "desc" },
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
          activity: {
            include: {
              targetPractice: {
                include: {
                  project: {
                    include: {
                      owner: {
                        select: {
                          name: true,
                          email: true,
                          company: {
                            select: {
                              tin: true,
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
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