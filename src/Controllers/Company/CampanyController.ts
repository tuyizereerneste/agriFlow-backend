import { Request, Response } from 'express';
import { prisma } from '../../config/db';
import bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';

interface Location {
  id?: string;
  province: string;
  district: string;
  sector: string;
  cell: string;
  village: string;
}

interface CreateCompanyRequestBody {
  name: string;
  email: string;
  password: string;
  tin: string;
  locations: Location[];
}

class CompanyController {
  static async createCompany(req: Request, res: Response): Promise<void> {
    const { name, email, password, tin, locations }: CreateCompanyRequestBody = req.body;
    const logo = req.file?.filename;
  
    try {
      if (!name || !email || !password || !tin) {
        res.status(400).json({ message: 'Name, email, password, and TIN are required' });
        return;
      }
  
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        res.status(400).json({ message: 'User with this email already exists' });
        return;
      }
  
      const hashedPassword = await bcrypt.hash(password, 10);
      const locationsArray: Location[] = typeof locations === 'string' ? JSON.parse(locations) : [];
  
      const result = await prisma.$transaction(async (tx) => {
        // Step 1: Create the user
        const user = await tx.user.create({
          data: {
            name,
            email,
            password: hashedPassword,
            type: 'company',
            role: null,
          },
        });
  
        // Step 2: Create the company linked to the user
        const company = await tx.company.create({
          data: {
            logo,
            tin,
            userId: user.id,
          },
        });
  
        // Step 3: Create locations linked to the company
        const createdLocations = await Promise.all(
          locationsArray.map((loc) =>
            tx.location.create({
              data: {
                province: loc.province,
                district: loc.district,
                sector: loc.sector,
                cell: loc.cell,
                village: loc.village,
                companyId: company.id,
              },
            })
          )
        );
  
        return {
          user,
          company: {
            ...company,
            location: createdLocations,
          },
        };
      });
  
      res.status(201).json({
        message: 'Company created successfully',
        usercompany: result,
      });
    } catch (error) {
      console.error('Error creating company:', error);
      res.status(500).json({ message: 'Failed to create company' });
    }
  }

  static async getAllCompanies(req: Request, res: Response): Promise<void> {
    try {
      const companies = await prisma.company.findMany({
        include: {
          user: true,
          location: true,
        },
      });
      res.status(200).json({ message: 'Companies retrieved successfully', data: companies });
    } catch (error) {
      console.error('Error retrieving companies:', error);
      res.status(500).json({ message: 'Failed to retrieve companies' });
    }
  }
  static async getCompanyById(req: Request, res: Response): Promise<void> {
    const { id  } = req.params;
    const companyId = id as string;
    try {
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        include: {
          user: true,
          location: true,
        },
      });
  
      if (!company) {
        res.status(404).json({ message: 'Company not found' });
        return;
      }
  
      res.status(200).json({ company });
    } catch (error) {
      console.error('Error fetching company:', error);
      res.status(500).json({ message: 'Failed to fetch company' });
    }
  }

  static async deleteCompany(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const companyId = id as string;
  
    try {
      const company = await prisma.company.findUnique({
        where: { id: companyId },
      });
  
      if (!company) {
        res.status(404).json({ message: 'Company not found' });
        return;
      }
  
      await prisma.$transaction([
        prisma.location.deleteMany({ where: { companyId: companyId } }),
        prisma.company.delete({ where: { id: companyId } }),
        prisma.user.delete({ where: { id: company.userId } }),
      ]);
  
      res.status(200).json({ message: 'Company and associated user deleted successfully' });
    } catch (error) {
      console.error('Error deleting company:', error);
      res.status(500).json({ message: 'Failed to delete company' });
    }
  }

  static async updateCompany(req: Request, res: Response): Promise<void> {
    // Validate and assert `id` as string
    const { id } = req.params;
    if (typeof id !== "string") {
      res.status(400).json({ message: "Invalid company ID format" });
      return;
    }

    // Destructure request body and file
    const { name, email, tin, locations }: CreateCompanyRequestBody = req.body;
    const logo = req.file?.filename;

    try {
      // Check if company exists
      const company = await prisma.company.findUnique({ where: { id } });
      if (!company) {
        res.status(404).json({ message: "Company not found" });
        return;
      }

      // Check if associated user exists
      const user = await prisma.user.findUnique({ where: { id: company.userId } });
      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      // Prepare updated data for user and company
      const updatedUserData: Prisma.UserUpdateInput = {};
      if (name) updatedUserData.name = name;
      if (email) updatedUserData.email = email;

      const updatedCompanyData: Prisma.CompanyUpdateInput = {};
      if (tin) updatedCompanyData.tin = tin;
      if (logo) updatedCompanyData.logo = logo;

      // Parse locations safely
      const locationsArray: Location[] = typeof locations === "string" ? JSON.parse(locations) : [];

      // Update in a transaction
      await prisma.$transaction(async (tx) => {
        // Update user
        await tx.user.update({
          where: { id: user.id },
          data: updatedUserData,
        });

        // Update company
        await tx.company.update({
          where: { id },
          data: updatedCompanyData,
        });

        // Upsert locations
        for (const loc of locationsArray) {
          await tx.location.upsert({
            where: { id: loc.id },
            create: {
              province: loc.province,
              district: loc.district,
              sector: loc.sector,
              cell: loc.cell,
              village: loc.village,
              companyId: id,
            },
            update: {
              province: loc.province,
              district: loc.district,
              sector: loc.sector,
              cell: loc.cell,
              village: loc.village,
            },
          });
        }
      });

      res.status(200).json({ message: "Company updated successfully" });
    } catch (error) {
      console.error("Error updating company:", error);
      res.status(500).json({ message: "Failed to update company" });
    }
}

  

}

export default CompanyController;

