import { Controller, Get, Post, Body, Query } from '@nestjs/common';
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
}
