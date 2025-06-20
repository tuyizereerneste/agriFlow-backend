import { Router } from 'express';
import AuthController from '../Controllers/Admin/AuthController';
import FarmerController from '../Controllers/Farmer/FarmerController';
import { authorizeType, verifyToken } from '../Middleware/Verify';
import { authorizeRole } from '../Middleware/Verify';
import SearchController from '../Controllers/Farmer/SearchController';
import QrCodeController from '../Controllers/Farmer/QrCodeController';
import GenerateExcel from '../Controllers/Farmer/generateExcel';
import ProjectController from '../Controllers/Project-Management/Project/ProjectController';
import EnrollmentController from '../Controllers/Project-Management/Enrollments/EnrollmentController';
import ActivityController from '../Controllers/Project-Management/Activities/ActivityController';
import { attendanceUpload, logoUpload } from '../Middleware/uploads';
import AttendanceController from '../Controllers/Project-Management/Attendance/AttendanceController';
import ProjectSearchController from '../Controllers/Project-Management/Project/SearchProject';
import GenerateProjectExcel from '../Controllers/Project-Management/Project/generateProjectExcel';
import CompanyController from '../Controllers/Company/CampanyController';
import VolunteerController from '../Controllers/VolunteerController/VolunteerController';
import PracticeFarmersExcel from '../Controllers/Project-Management/Project/generateFarmerExcel';
import CompanyProjectsController from '../Controllers/Company/CompanyProjects';
import StatsController from '../Controllers/Project-Management/Enrollments/StatsController';

const router = Router();

router.post('/auth/register', AuthController.UserRegister);
router.post('/auth/login', AuthController.UserLogin);
router.get('/auth/me', verifyToken, authorizeRole('Admin'), AuthController.UserProfile);

router.post('/farmer/create-farmer', verifyToken, authorizeRole('Admin'), FarmerController.createFarmer);
router.get('/farmer/all-farmers', verifyToken, authorizeRole('Admin'), FarmerController.getAllFarmers);
router.get('/farmer/get-farmer/:id', FarmerController.getFarmerById);
//router.put('/farmer/update-farmer/:farmerId', verifyToken, authorizeRole('Admin'), FarmerController.updateFarmer);
router.delete('/farmer/delete-farmer/:farmerId', verifyToken, authorizeRole('Admin'), FarmerController.deleteFarmer);
router.get('/farmer/farmer-land/:farmerId', verifyToken, authorizeRole('Admin'), FarmerController.getFarmerLands);

router.get('/search', verifyToken, authorizeRole('Admin'), SearchController.searchFarmers);
router.get('/project/search', verifyToken, authorizeRole('Admin'), ProjectSearchController.searchProjects);
router.get('/project/project-practices/:projectId', verifyToken, authorizeRole('Admin'), ProjectController.getProjectPractices);
router.get('/project/practice-activities/:practiceId', verifyToken, authorizeRole('Admin'), ProjectController.getPracticeActivities);
router.get("/farmers/export-excel", async (req, res) => {
    await GenerateExcel.generateExcelExport(res);
});
router.get('/projects/export-excel', async (req, res) => {
    await GenerateProjectExcel.generateExcelExport(req, res);
});

router.get('/farmer/generate-qrcode/:farmerId', verifyToken, authorizeRole('Admin'), QrCodeController.generateQrCode);

router.post('/project/create-project', verifyToken, authorizeRole('Admin'), ProjectController.createProject);
router.get('/project/all-projects', verifyToken, authorizeRole('Admin'), ProjectController.getAllProjects);
router.get('/project/get-project/:projectId', verifyToken, authorizeRole('Admin'), ProjectController.getProjectById);

router.get('/project/get-company-projects/:userId', verifyToken, authorizeRole('Admin'), ProjectController.getCompanyProjects);
router.get('/project/get-practice-farmers/:practiceId', verifyToken, authorizeRole('Admin'), EnrollmentController.getEnrollmentByPractice);
//router.get('/projest/project-details/:id', verifyToken, authorizeRole('Admin'), ProjectController.getProjectById);

router.post('/project/enroll-farmer', verifyToken, authorizeRole('Admin'), EnrollmentController.enrollFarmerInProject);
router.post('/project/excel-export', async (req, res) => {
    await PracticeFarmersExcel.generatePracticeFarmersExcel(req, res);
});
router.post('/project/attendance', verifyToken, authorizeRole('Admin'), attendanceUpload.array("photos"), AttendanceController.registerAttendance);
router.get('/project/attendance/:activityId', verifyToken, authorizeRole('Admin'), AttendanceController.getValidAttendanceByActivity);
router.get('/project/farmer-attendance/:farmerId', verifyToken, authorizeRole('Admin'), AttendanceController.getAttendanceByFarmer);
router.get('/project-stats', verifyToken, authorizeRole('Admin'), StatsController.getStats);

// Company routes

router.post('/company/register-company', verifyToken, authorizeRole("Admin"), logoUpload.single('logo'), CompanyController.createCompany);
router.get('/company/all', verifyToken, authorizeRole("Admin"), CompanyController.getAllCompanies);
router.get('/company/get-company/:id', verifyToken, authorizeRole("Admin"), CompanyController.getCompanyById);
router.delete('/company/delete-company/:id', verifyToken, authorizeRole("Admin"), CompanyController.deleteCompany);
router.put('/company/update-company/:id', verifyToken, authorizeRole("Admin"), logoUpload.single('logo'), CompanyController.updateCompany);

router.get('/company/get-company-projects/', verifyToken, authorizeType("company"), CompanyProjectsController.getCompanyProjects);

// Volunteer routes
router.post('/volunteer/register-volunteer', verifyToken, authorizeRole("Admin"), VolunteerController.createVolunteer);
router.get('/volunteer/get-all-volunteers', verifyToken, authorizeRole("Admin"), VolunteerController.getAllVolunteers);
router.get('/volunteer/get-volunteer/:id', verifyToken, authorizeRole("Admin"), VolunteerController.getVolunteerById);
router.delete('/volunteer/delete-volunteer/:id', verifyToken, authorizeRole("Admin"), VolunteerController.deleteVolunteer);
router.put('/volunteer/update-volunteer/:id', verifyToken, authorizeRole("Admin"), VolunteerController.updateVolunteer);

export default router;