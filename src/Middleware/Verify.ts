import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface AuthRequest extends Request {
    user?: {
        id: string;
        role: string;
    };
}

export const verifyToken = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.header("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ message: "No token, authorization denied" });
        return;
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string };
        const user = await prisma.user.findUnique({ where: { id: decoded.id } });

        if (!user) {
            res.status(401).json({ message: "User not found" });
            return;
        }

        req.user = { id: decoded.id, role: user.role };
        next();
    } catch (error) {
        res.status(401).json({ message: "Token is not valid" });
    }
};

export const authorizeRole = (role: string) => {
    return (req: AuthRequest, res: Response, next: NextFunction): void => {
        if (req.user && req.user.role === role) {
            next();
        } else {
            res.status(403).json({ message: "Access denied. Insufficient permissions." });
        }
    };
};