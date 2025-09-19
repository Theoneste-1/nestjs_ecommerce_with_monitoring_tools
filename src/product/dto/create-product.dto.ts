// services/product-service/src/product/dto/create-product.dto.ts
import {
  IsString,
  IsNumber,
  IsUUID,
  IsArray,
  IsOptional,
  IsPositive,
  MinLength,
  MaxLength,
  IsUrl,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class DimensionsDto {
  @ApiProperty({ description: 'Length in cm' })
  @IsNumber()
  @IsPositive()
  length: number;

  @ApiProperty({ description: 'Width in cm' })
  @IsNumber()
  @IsPositive()
  width: number;

  @ApiProperty({ description: 'Height in cm' })
  @IsNumber()
  @IsPositive()
  height: number;
}

export class CreateProductDto {
  @ApiProperty({ description: 'Product name', minLength: 2, maxLength: 200 })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @ApiProperty({ description: 'Product description', minLength: 10 })
  @IsString()
  @MinLength(10)
  description: string;

  @ApiProperty({ description: 'Product price', minimum: 0.01 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Transform(({ value }) => parseFloat(value))
  price: number;

  @ApiProperty({ description: 'Product SKU (unique identifier)' })
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  sku: string;

  @ApiProperty({ description: 'Category UUID' })
  @IsUUID()
  categoryId: string;

  @ApiProperty({ 
    description: 'Array of image URLs',
    type: [String],
    example: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg']
  })
  @IsArray()
  @IsString({ each: true })
  @IsUrl({}, { each: true })
  images: string[];

  @ApiPropertyOptional({ description: 'Product brand' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  brand?: string;

  @ApiPropertyOptional({ description: 'Product specifications (JSON string)' })
  @IsOptional()
  @IsString()
  specifications?: string;

  @ApiPropertyOptional({ description: 'Product weight in kg', minimum: 0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Transform(({ value }) => value ? parseFloat(value) : undefined)
  weight?: number;

  @ApiPropertyOptional({ description: 'Product dimensions', type: DimensionsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DimensionsDto)
  dimensions?: DimensionsDto;
}
