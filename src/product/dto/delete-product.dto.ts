import { IsString } from 'class-validator';

export class DeleteProductDto {
  @IsString()
  id: string;
}