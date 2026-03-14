// import { Request, Response, NextFunction } from "express";

// // Extend Request type to include user
// interface AuthRequest extends Request {
//   user?: {
//     id: string;
//     role: string;
//   };
// }

// // Mock verifyToken middleware
// export const mockVerifyToken = (
//   req: AuthRequest,
//   res: Response,
//   next: NextFunction
// ) => {
//   req.user = {
//     id: "test-user-id",
//     role: "Admin", // Add the required role
//   };
//   next();
// };

// // Mock authorizeRole middleware
// export const mockAuthorizeRole = () => {
//   return (req: AuthRequest, res: Response, next: NextFunction) => {
//     next();
//   };
// };