import { Controller, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PaymentService } from './payment.service';
import { PaymentStatus } from './entities/payment.entity';

@Controller()
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  constructor(private readonly paymentService: PaymentService) {}

  @MessagePattern({ cmd: 'payment.createIntent' })
  async createPaymentIntent(@Payload() data: { orderId: string; amount: number; user: { userId: string; role: string } }) {
    try {
      const { orderId, amount, user } = data;
      this.logger.log({ message: `Creating payment intent for order: ${orderId}`, userId: user.userId, role: user.role });

      const intent = await this.paymentService.createStripePaymentIntent(orderId, amount);
      return { clientSecret: intent.client_secret, paymentId: intent.id };
    } catch (error) {
      this.logger.error({ message: `Failed to create payment intent for order: ${data.orderId}`, error: error.message, stack: error.stack });
      throw new HttpException('Failed to create payment intent', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @MessagePattern({ cmd: 'payment.webhook' })
  async handleStripeWebhook(@Payload() data: { event: any; signature: string }) {
    try {
      const { event, signature } = data;
      this.logger.log({ message: `Handling Stripe webhook: ${event.type}`, eventId: event.id });

      await this.paymentService.handleStripeWebhook(event, signature);
      return { received: true };
    } catch (error) {
      this.logger.error({ message: `Failed to handle Stripe webhook: ${data.event.type}`, error: error.message, stack: error.stack });
      throw new HttpException('Failed to handle webhook', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}