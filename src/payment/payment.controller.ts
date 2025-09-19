import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';

@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('intent')
  @Roles('CLIENT')
  @UseGuards(RolesGuard)
  async createPaymentIntent(
    @Body() body: { orderId: string; amount: number },
    @Request() req: any,
  ) {
    return this.paymentService.handleCreatePaymentIntent(body, req.user);
  }

  @Post('webhook/stripe')
  async handleStripeWebhook(@Body() body: any, @Request() req: any) {
    const signature = req.headers['stripe-signature'];
    return this.paymentService.handleStripeWebhook(body, signature);
  }
}