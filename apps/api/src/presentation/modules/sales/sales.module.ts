import { Module } from '@nestjs/common';
import { ProductController } from './product.controller';
import { QuotationController } from './quotation.controller';
import { ProductService } from '../../../application/services/product/product.service';
import { QuotationService } from '../../../application/services/quotation/quotation.service';

@Module({
  controllers: [ProductController, QuotationController],
  providers: [ProductService, QuotationService],
  exports: [ProductService, QuotationService],
})
export class SalesModule {}
