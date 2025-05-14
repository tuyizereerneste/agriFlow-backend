import { Request, Response } from 'express';
import ExcelJS from 'exceljs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

class GenerateProjectExcel {
  static formatDate(date: Date): string {
    const d = new Date(date);
    const month = `${d.getMonth() + 1}`.padStart(2, '0');
    const day = `${d.getDate()}`.padStart(2, '0');
    const year = d.getFullYear();
    return `${year}-${month}-${day}`;
  }

  static async generateExcelExport(req: Request, res: Response): Promise<void> {
    try {
      const { projectId, practiceId, activityId } = req.body;

      const whereClause: any = {};

      if (projectId) {
        whereClause.id = projectId;
      }

      const projects = await prisma.project.findMany({
        where: whereClause,
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
          farmers: {
            include: {
              farmer: true,
            },
          },
          targetPractices: {
            where: practiceId ? { id: practiceId } : {},
            include: {
              activities: {
                where: activityId ? { id: activityId } : {},
              },
              lands: {
                include: {
                  land: {
                    include: {
                      locations: {
                        include: {
                          location: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Projects');

      worksheet.columns = [
        { header: 'Project ID', key: 'projectId', width: 20 },
        { header: 'Title', key: 'title', width: 30 },
        { header: 'Description', key: 'description', width: 30 },
        { header: 'Owner', key: 'owner', width: 25 },
        { header: 'Start Date', key: 'startDate', width: 15 },
        { header: 'End Date', key: 'endDate', width: 15 },
        { header: 'Objectives', key: 'objectives', width: 30 },
        { header: 'Farmer Names', key: 'farmerNames', width: 30 },
        { header: 'Target Practice', key: 'practice', width: 25 },
        { header: 'Activity Title', key: 'activityTitle', width: 25 },
        { header: 'Activity Description', key: 'activityDescription', width: 30 },
        { header: 'Activity Start Date', key: 'activityStartDate', width: 15 },
        { header: 'Activity End Date', key: 'activityEndDate', width: 15 },
        { header: 'Land Size', key: 'landSize', width: 15 },
        { header: 'Land Location', key: 'landLocation', width: 35 },
      ];

      for (const project of projects) {
        const farmerNames = project.farmers.map(f => f.farmer.names).join(', ') || 'N/A';
        const practices = project.targetPractices.length ? project.targetPractices : [null];

        const ownerName =
          project.owner?.name ||
          project.owner?.company?.tin ||
          project.owner?.email ||
          'N/A';

        for (const practice of practices) {
          const activities = practice?.activities?.length ? practice.activities : [null];
          const lands = practice?.lands?.length ? practice.lands : [null];
          const maxRows = Math.max(activities.length, lands.length);

          for (let i = 0; i < maxRows; i++) {
            const activity = activities[i] || { title: '', description: '', startDate: null, endDate: null };
            const land = lands[i]?.land as { locations?: { location?: any }[] } || {};
            const landLocation = land.locations?.[0]?.location || {};

            worksheet.addRow({
              projectId: i === 0 ? project.id : '',
              title: i === 0 ? project.title : '',
              description: i === 0 ? project.description : '',
              owner: i === 0 ? ownerName : '',
              startDate: i === 0 ? this.formatDate(project.startDate) : '',
              endDate: i === 0 ? this.formatDate(project.endDate) : '',
              objectives: i === 0 ? project.objectives : '',
              farmerNames: i === 0 ? farmerNames : '',
              practice: practice?.title || '',
              activityTitle: activity?.title || '',
              activityDescription: activity?.description || '',
              activityStartDate: activity?.startDate ? this.formatDate(activity.startDate) : '',
              activityEndDate: activity?.endDate ? this.formatDate(activity.endDate) : '',
              landSize: (lands[i]?.land as any)?.size || '',
              landLocation: landLocation?.province
                ? `${landLocation.province}, ${landLocation.district}, ${landLocation.sector}, ${landLocation.cell}, ${landLocation.village}`
                : '',
            });
          }
        }
      }

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=projects.xlsx');

      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error('Error generating project Excel:', error);
      res.status(500).send('Internal Server Error');
    }
  }
}

export default GenerateProjectExcel;