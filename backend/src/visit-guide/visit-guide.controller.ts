import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { VisitGuideService } from './visit-guide.service';
import { CreateVisitStepDto, UpdateStepStatusDto } from './dto/visit-guide.dto';

@Controller('visit-guide')
export class VisitGuideController {
    constructor(private readonly service: VisitGuideService) { }

    @Get()
    getSteps(@Query('patientId') patientId: string) {
        return this.service.getSteps(patientId);
    }

    @Post()
    addStep(@Body() dto: CreateVisitStepDto) {
        return this.service.addStep(dto);
    }

    @Patch(':id')
    updateStatus(@Param('id') id: string, @Body() dto: UpdateStepStatusDto) {
        return this.service.updateStatus(id, dto);
    }

    @Delete(':id')
    deleteStep(@Param('id') id: string) {
        return this.service.deleteStep(id);
    }
}
