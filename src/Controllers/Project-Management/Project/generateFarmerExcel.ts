import { Request, Response } from 'express';
import ExcelJS from 'exceljs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

class PracticeFarmersExcel {
  static formatDate(date: Date | null): string {
    if (!date) return '';
    const d = new Date(date);
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
  }

  static async generatePracticeFarmersExcel(req: Request, res: Response): Promise<void> {
    try {
      const { practiceId } = req.body;

      const practice = await prisma.targetPractice.findUnique({
        where: { id: practiceId },
        select: {
          id: true,
          title: true,
          projectId: true,
          project: {
            select: {
              title: true,
            },
          },
        },
      });

      if (!practice) {
        res.status(404).json({ message: "Practice not found" });
        return;
      }

      const enrollments = await prisma.projectEnrollment.findMany({
        where: { projectId: practice.projectId },
        include: {
          farmer: {
            select: {
              id: true,
              names: true,
              phones: true,
              farmerNumber: true,
              dob: true,
              gender: true,
              location: {
                select: {
                  province: true,
                  district: true,
                  sector: true,
                  cell: true,
                  village: true,
                },
              },
            },
          },
        },
      });

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Farmers');

      // Add headers for context (Project & Practice)
      worksheet.addRow(['Project Title:', practice.project.title]);
      worksheet.addRow(['Practice Title:', practice.title]);
      worksheet.addRow([]);

      // Define farmer table columns
      worksheet.columns = [
        { header: 'Farmer ID', key: 'id', width: 20 },
        { header: 'Name', key: 'names', width: 25 },
        { header: 'Phones', key: 'phones', width: 30 },
        { header: 'Farmer Number', key: 'farmerNumber', width: 15 },
        { header: 'Date of Birth', key: 'dob', width: 15 },
        { header: 'Gender', key: 'gender', width: 10 },
        { header: 'Province', key: 'province', width: 15 },
        { header: 'District', key: 'district', width: 15 },
        { header: 'Sector', key: 'sector', width: 15 },
        { header: 'Cell', key: 'cell', width: 15 },
        { header: 'Village', key: 'village', width: 15 },
      ];

      for (const { farmer } of enrollments) {
        worksheet.addRow({
          id: farmer.id,
          names: farmer.names,
          phones: farmer.phones.join(', '),
          farmerNumber: farmer.farmerNumber,
          dob: this.formatDate(farmer.dob),
          gender: farmer.gender,
          province: farmer.location?.[0]?.province || '',
          district: farmer.location?.[0]?.district || '',
          sector: farmer.location?.[0]?.sector || '',
          cell: farmer.location?.[0]?.cell || '',
          village: farmer.location?.[0]?.village || '',
        });
      }

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=practice_farmers.xlsx');

      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error('Error generating Excel:', error);
      res.status(500).send('Internal Server Error');
    }
  }
}

export default PracticeFarmersExcel;