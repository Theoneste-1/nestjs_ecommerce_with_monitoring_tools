import { Controller, Logger, Inject } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { ClientProxy } from '@nestjs/microservices';
import { PaymentService } from './payment.service';

@Controller()
export class PaymentEventsController {
  private readonly logger = new Logger(PaymentEventsController.name);

  constructor(
    private readonly paymentService: PaymentService,
    @Inject('ORDER_SERVICE') private readonly orderClient: ClientProxy,
  ) {}

  @EventPattern('order.created')
  async handleOrderCreated(@Payload() data: { orderId: string; userId: string; cartId: string; timestamp: string }) {
    try {
      this.logger.log({ message: `Handling OrderCreatedEvent for order: ${data.orderId}`, userId: data.userId });

      // Create payment intent for the order
      const order = await this.paymentService.getOrderDetails(data.orderId);
      const intent = await this.paymentService.createStripePaymentIntent(data.orderId, order.totalAmount);

      // Save payment record
      await this.paymentService.savePaymentRecord(data.orderId, intent.id, order.totalAmount);

      // Emit PaymentInitiatedEvent (optional, for notifications)
      this.paymentService.emitPaymentEvent('payment.initiated', {
        orderId: data.orderId,
        userId: data.userId,
        paymentId: intent.id,
        amount: order.totalAmount,
      });

      this.logger.log({ message: `Payment intent created for order: ${data.orderId}` });
    } catch (error) {
      this.logger.error({ message: `Failed to handle OrderCreatedEvent for order: ${data.orderId}`, error: error.message, stack: error.stack });
    }
  }
}