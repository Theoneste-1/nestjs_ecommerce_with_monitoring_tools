import { Injectable, Inject, HttpException, HttpStatus } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class PaymentService {
  constructor(
    @Inject('PAYMENT_SERVICE') private readonly paymentClient: ClientProxy,
  ) {}

  async handleCreatePaymentIntent(data: { orderId: string; amount: number }, user: { userId: string; role: string }) {
    try {
      return await firstValueFrom(
        this.paymentClient.send({ cmd: 'payment.createIntent' }, { ...data, user }),
      );
    } catch (error) {
      throw new HttpException(error.message || 'Payment service error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async handleStripeWebhook(event: any, signature: string) {
    try {
      return await firstValueFrom(
        this.paymentClient.send({ cmd: 'payment.webhook' }, { event, signature }),
      );
    } catch (error) {
      throw new HttpException('Failed to handle webhook', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}