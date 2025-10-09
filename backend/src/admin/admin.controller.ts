import { Controller, Patch, Param, Body } from '@nestjs/common';
import { AdminService } from './admin.service';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Patch('approve/:id')
  async approveUser(@Param('id') id: string, @Body() body: { type: string }) {
    return this.adminService.approveUser(id, body.type);
  }
}
