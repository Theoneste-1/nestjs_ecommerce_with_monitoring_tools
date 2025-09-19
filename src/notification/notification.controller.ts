import { Controller, Get, Put, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { Roles } from 'src/auth/roles.decorator';
import { RolesGuard } from 'src/auth/roles.guard';
import { NotificationService } from './notifications.service';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @Roles('CLIENT', 'SELLER', 'ADMIN', 'SYSTEM_ADMIN')
  @UseGuards(RolesGuard)
  async listNotifications(@Request() req: any) {
    return this.notificationService.handleListNotifications(req.user.userId);
  }

  @Put(':id/read')
  @Roles('CLIENT', 'SELLER', 'ADMIN', 'SYSTEM_ADMIN')
  @UseGuards(RolesGuard)
  async markAsRead(@Param('id') id: string, @Request() req: any) {
    return this.notificationService.handleMarkAsRead(id, req.user.userId);
  }

  @Delete(':id')
  @Roles('CLIENT', 'SELLER', 'ADMIN', 'SYSTEM_ADMIN')
  @UseGuards(RolesGuard)
  async deleteNotification(@Param('id') id: string, @Request() req: any) {
    return this.notificationService.handleDeleteNotification(id, req.user.userId);
  }
}