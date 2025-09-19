import { Injectable, Inject, HttpException, HttpStatus } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class NotificationService {
  constructor(
    @Inject('NOTIFICATION_SERVICE') private readonly notificationClient: ClientProxy,
  ) {}

  async handleListNotifications(userId: string) {
    try {
      return await firstValueFrom(
        this.notificationClient.send({ cmd: 'notification.list' }, { userId }),
      );
    } catch (error) {
      throw new HttpException(error.message || 'Notification service error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async handleMarkAsRead(id: string, userId: string) {
    try {
      return await firstValueFrom(
        this.notificationClient.send({ cmd: 'notification.markAsRead' }, { id, userId }),
      );
    } catch (error) {
      throw new HttpException(error.message || 'Notification service error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async handleDeleteNotification(id: string, userId: string) {
    try {
      return await firstValueFrom(
        this.notificationClient.send({ cmd: 'notification.delete' }, { id, userId }),
      );
    } catch (error) {
      throw new HttpException(error.message || 'Notification service error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}