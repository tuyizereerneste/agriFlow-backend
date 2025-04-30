import { Request, Response } from 'express';
import { prisma } from '../../config/db';
import bcrypt from 'bcrypt';

interface Location {
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
    const { id } = req.params;
  
    try {
      const company = await prisma.company.findUnique({
        where: { id },
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
  
    try {
      const company = await prisma.company.findUnique({
        where: { id },
      });
  
      if (!company) {
        res.status(404).json({ message: 'Company not found' });
        return;
      }
  
      await prisma.$transaction([
        prisma.location.deleteMany({ where: { companyId: id } }),
        prisma.company.delete({ where: { id } }),
        prisma.user.delete({ where: { id: company.userId } }),
      ]);
  
      res.status(200).json({ message: 'Company and associated user deleted successfully' });
    } catch (error) {
      console.error('Error deleting company:', error);
      res.status(500).json({ message: 'Failed to delete company' });
    }
  }
  

}

export default CompanyController;

