import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface AuthRequest extends Request {
  user?: {
    id: string;
    role?: string; // Role is optional for companies
    type: string;
  };
}

export const verifyToken = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  console.log("verifyToken middleware called");

  const authHeader = req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.error("No token, authorization denied");
    res.status(401).json({ message: "No token, authorization denied" });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string };
    console.log("Token decoded:", decoded);

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });

    if (!user) {
      console.error("User not found");
      res.status(401).json({ message: "User not found" });
      return;
    }

    // Convert null role to undefined
    const role = user.role ?? undefined;

    req.user = { id: decoded.id, role, type: user.type };
    console.log("User verified:", req.user);
    next();
  } catch (error) {
    console.error("Token verification failed:", error);
    res.status(401).json({ message: "Token is not valid" });
  }
};

export const authorizeRole = (role: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    console.log("authorizeRole middleware called for role:", role);

    if (req.user && req.user.role === role) {
      console.log("Role authorized");
      next();
    } else {
      console.error("Access denied. Insufficient permissions.");
      res.status(403).json({ message: "Access denied. Insufficient permissions." });
    }
  };
};

export const authorizeType = (type: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    console.log("authorizeType middleware called for type:", type);

    if (req.user && req.user.type === type) {
      console.log("Type authorized");
      next();
    } else {
      console.error("Access denied. Insufficient permissions.");
      res.status(403).json({ message: "Access denied. Insufficient permissions." });
    }
  };
};