// services/product-service/src/product/entities/product.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Category } from './category.entity';

@Entity('products')
@Index(['name', 'description'], { fulltext: true })
@Index(['isActive', 'categoryId'])
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column('text')
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ unique: true })
  sku: string;

  @Column('uuid')
  categoryId: string;

  @Column('uuid')
  sellerId: string;

  @Column('text', { array: true, default: [] })
  images: string[];

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  brand?: string;

  @Column('text', { nullable: true })
  specifications?: string;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  weight?: number;

  @Column('simple-json', { nullable: true })
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };

  @ManyToOne(() => Category, (category) => category.products)
  @JoinColumn({ name: 'categoryId' })
  category: Category;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

