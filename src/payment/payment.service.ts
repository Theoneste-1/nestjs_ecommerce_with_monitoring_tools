import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Stripe from 'stripe';
import { Payment, PaymentStatus } from './entities/payment.entity';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class PaymentService {
  private stripe: Stripe;

  constructor(
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @Inject('RABBITMQ_CLIENT') private rabbitmqClient: ClientProxy,
  ) {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not defined');
    }
    this.stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-08-27.basil', // Use latest Stripe API version
    });
  }

  async createStripePaymentIntent(orderId: string, amount: number) {
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Amount in cents
      currency: 'usd',
      metadata: { orderId },
      automatic_payment_methods: { enabled: true },
    });
    return paymentIntent;
  }

  async handleStripeWebhook(event: any, signature: string) {
    // Verify webhook signature (implement signature verification)
    const sig = signature; // process.env.STRIPE_WEBHOOK_SECRET for verification
    // Stripe.webhookEndpoints.constructEvent(event, sig, process.env.STRIPE_WEBHOOK_SECRET);

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      const orderId = paymentIntent.metadata.orderId;

      await this.paymentRepository.update(
        { stripePaymentIntentId: paymentIntent.id },
        { status: PaymentStatus.SUCCEEDED },
      );

      // Emit PaymentSuccessfulEvent
      this.emitPaymentEvent('payment.confirmed', {
        orderId,
        userId: paymentIntent.metadata.userId, // Assume stored in metadata
        paymentId: paymentIntent.id,
        amount: paymentIntent.amount / 100,
      });
    } else if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object;
      const orderId = paymentIntent.metadata.orderId;

      await this.paymentRepository.update(
        { stripePaymentIntentId: paymentIntent.id },
        { status: PaymentStatus.FAILED },
      );

      // Emit PaymentFailedEvent
      this.emitPaymentEvent('payment.failed', {
        orderId,
        userId: paymentIntent.metadata.userId,
        paymentId: paymentIntent.id,
        error: event.data.object.last_payment_error?.message,
      });
    }
  }

  async savePaymentRecord(orderId: string, stripePaymentIntentId: string, amount: number) {
    const payment = this.paymentRepository.create({
      orderId,
      stripePaymentIntentId,
      amount,
      status: PaymentStatus.PENDING,
    });
    await this.paymentRepository.save(payment);
  }

  async getOrderDetails(orderId: string) {
    // TCP call to Order Service to fetch order details
    // Placeholder: Implement via ClientProxy
    return { totalAmount: 100 }; // Replace with actual call
  }

  emitPaymentEvent(event: string, data: any) {
    this.rabbitmqClient.emit(event, data);
  }
}