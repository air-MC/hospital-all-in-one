import { Controller, Get, Post, Body, Query, Param } from '@nestjs/common';
import { HospitalService } from './hospital.service';

@Controller('hospital')
export class HospitalController {
    constructor(private readonly hospitalService: HospitalService) { }

    @Get('departments')
    async getDepartments() {
        return this.hospitalService.getDepartments();
    }

    @Get('doctors')
    async getDoctors(@Query('departmentId') departmentId: string) {
        return this.hospitalService.getDoctors(departmentId);
    }

    @Post('departments')
    async createDepartment(@Body('name') name: string) {
        return this.hospitalService.createDepartment(name);
    }

    @Post('doctors')
    async createDoctor(@Body() body: { name: string, departmentId: string }) {
        return this.hospitalService.createDoctor(body.name, body.departmentId);
    }

    @Post('login')
    async login(@Body('phone') phone: string) {
        return this.hospitalService.findPatientByPhone(phone);
    }

    @Post('register')
    async register(@Body() data: any) {
        return this.hospitalService.registerPatient(data);
    }

    @Get('search')
    async search(@Query('query') query: string) {
        return this.hospitalService.searchPatients(query);
    }
    @Get('info')
    async getHospitalInfo() {
        return this.hospitalService.getHospitalInfo();
    }

    @Post('info/update')
    async updateHospitalInfo(@Body() body: { id: string, name: string }) {
        return this.hospitalService.updateHospitalInfo(body.id, body.name);
    }

    @Post('info/status')
    async updateHospitalStatus(@Body() body: { id: string, status: 'ACTIVE' | 'SUSPENDED' | 'CLOSED' }) {
        return this.hospitalService.updateHospitalStatus(body.id, body.status);
    }

    @Get('departments/:id/schedules')
    async getDepartmentSchedules(@Param('id') id: string) {
        return this.hospitalService.getDepartmentSchedules(id);
    }

    @Post('departments/:id/schedules')
    async updateDepartmentSchedule(@Param('id') id: string, @Body() body: any[]) {
        return this.hospitalService.updateDepartmentSchedule(id, body);
    }

    @Post('patients/:id/update')
    async updatePatient(@Param('id') id: string, @Body() data: { name?: string; phone?: string; birthDate?: string; gender?: string }) {
        return this.hospitalService.updatePatient(id, data);
    }

    @Get('doctors/:id/schedules')
    async getDoctorSchedules(@Param('id') id: string) {
        return this.hospitalService.getDoctorSchedules(id);
    }

    @Post('doctors/:id/schedules')
    async updateDoctorSchedule(@Param('id') id: string, @Body() body: any[]) {
        return this.hospitalService.updateDoctorSchedule(id, body);
    }

    // --- SUPER ADMIN ENDPOINTS ---

    @Get('all')
    async getAllHospitals() {
        return this.hospitalService.getAllHospitals();
    }

    @Post('create')
    async createHospital(@Body() body: { name: string, isMain?: boolean }) {
        return this.hospitalService.createHospital(body.name, body.isMain);
    }

    @Post('admin/create')
    async createHospitalAdmin(@Body() body: { hospitalId: string, username: string, name: string, password?: string }) {
        return this.hospitalService.createHospitalAdmin(body.hospitalId, body);
    }
}
