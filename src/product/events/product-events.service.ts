// services/product-service/src/events/events.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';

// Event interfaces
export interface ProductCreatedEvent {
  productId: string;
  sellerId: string;
  categoryId: string;
  name: string;
  price: number;
  sku: string;
  createdAt?: Date;
}

export interface ProductUpdatedEvent {
  productId: string;
  sellerId: string;
  updatedBy: string;
  changes: Record<string, any>;
  updatedAt?: Date;
}

export interface ProductDeletedEvent {
  productId: string;
  sellerId: string;
  deletedBy: string;
  name: string;
  sku: string;
  deletedAt?: Date;
}

export interface CategoryCreatedEvent {
  categoryId: string;
  name: string;
  slug: string;
  parentId?: string;
  createdBy: string;
  createdAt?: Date;
}

export interface CategoryUpdatedEvent {
  categoryId: string;
  name: string;
  slug: string;
  parentId?: string;
  updatedBy: string;
  changes: Record<string, any>;
  updatedAt?: Date;
}

export interface CategoryDeletedEvent {
  categoryId: string;
  name: string;
  slug: string;
  deletedBy: string;
  deletedAt?: Date;
}

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);
  private connection: amqp.Connection;
  private channel: amqp.Channel;
  private readonly exchangeName = 'ecommerce.events';

  constructor(private readonly configService: ConfigService) {
    this.initializeRabbitMQ();
  }

  private async initializeRabbitMQ(): Promise<void> {
    try {
      const rabbitmqUrl = this.configService.get<string>('RABBITMQ_URL') || 'amqp://localhost:5672';
      
      this.connection = await amqp.connect(rabbitmqUrl);
      this.channel = await this.connection.createChannel();

      // Create exchange
      await this.channel.assertExchange(this.exchangeName, 'topic', { durable: true });

      // Handle connection errors
      this.connection.on('error', (err) => {
        this.logger.error('RabbitMQ connection error:', err);
      });

      this.connection.on('close', () => {
        this.logger.warn('RabbitMQ connection closed');
        setTimeout(() => this.initializeRabbitMQ(), 5000); // Retry after 5 seconds
      });

      this.logger.log('RabbitMQ initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize RabbitMQ:', error.message);
      setTimeout(() => this.initializeRabbitMQ(), 5000); // Retry after 5 seconds
    }
  }

  private async publishEvent(routingKey: string, eventData: any): Promise<void> {
    try {
      if (!this.channel) {
        this.logger.warn('RabbitMQ channel not available, reinitializing...');
        await this.initializeRabbitMQ();
        return;
      }

      const message = {
        ...eventData,
        timestamp: new Date().toISOString(),
        service: 'product-service',
      };

      const success = this.channel.publish(
        this.exchangeName,
        routingKey,
        Buffer.from(JSON.stringify(message)),
        {
          persistent: true,
          contentType: 'application/json',
        },
      );

      if (success) {
        this.logger.log(`Event published successfully: ${routingKey}`, {
          routingKey,
          eventId: message.productId || message.categoryId,
        });
      } else {
        this.logger.warn(`Failed to publish event: ${routingKey}`, {
          routingKey,
          eventId: message.productId || message.categoryId,
        });
      }
    } catch (error) {
      this.logger.error(`Error publishing event ${routingKey}:`, error.message, {
        routingKey,
        error: error.message,
        eventData,
      });
    }
  }

  // Product Events
  async emitProductCreated(event: ProductCreatedEvent): Promise<void> {
    const eventWithTimestamp = {
      ...event,
      createdAt: event.createdAt || new Date(),
    };
    await this.publishEvent('product.created', eventWithTimestamp);
  }

  async emitProductUpdated(event: ProductUpdatedEvent): Promise<void> {
    const eventWithTimestamp = {
      ...event,
      updatedAt: event.updatedAt || new Date(),
    };
    await this.publishEvent('product.updated', eventWithTimestamp);
  }

  async emitProductDeleted(event: ProductDeletedEvent): Promise<void> {
    const eventWithTimestamp = {
      ...event,
      deletedAt: event.deletedAt || new Date(),
    };
    await this.publishEvent('product.deleted', eventWithTimestamp);
  }

  // Category Events
  async emitCategoryCreated(event: CategoryCreatedEvent): Promise<void> {
    const eventWithTimestamp = {
      ...event,
      createdAt: event.createdAt || new Date(),
    };
    await this.publishEvent('category.created', eventWithTimestamp);
  }

  async emitCategoryUpdated(event: CategoryUpdatedEvent): Promise<void> {
    const eventWithTimestamp = {
      ...event,
      updatedAt: event.updatedAt || new Date(),
    };
    await this.publishEvent('category.updated', eventWithTimestamp);
  }

  async emitCategoryDeleted(event: CategoryDeletedEvent): Promise<void> {
    const eventWithTimestamp = {
      ...event,
      deletedAt: event.deletedAt || new Date(),
    };
    await this.publishEvent('category.deleted', eventWithTimestamp);
  }

  // Cleanup method
  async onModuleDestroy(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
      this.logger.log('RabbitMQ connection closed successfully');
    } catch (error) {
      this.logger.error('Error closing RabbitMQ connection:', error.message);
    }
  }
}
