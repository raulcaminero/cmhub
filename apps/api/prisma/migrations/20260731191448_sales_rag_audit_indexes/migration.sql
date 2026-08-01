-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('SERVICE', 'PRODUCT', 'DIGITAL');

-- CreateEnum
CREATE TYPE "QuotationStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'CONVERTED');

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "lockDate" DATE;

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "createdByUserId" TEXT,
ADD COLUMN     "foreignCountry" TEXT,
ADD COLUMN     "foreignPaymentType" TEXT,
ADD COLUMN     "foreignTaxId" TEXT,
ADD COLUMN     "isForeignPayment" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isVoided" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "costOfGoodsSold" DECIMAL(18,2),
ADD COLUMN     "createdByUserId" TEXT,
ADD COLUMN     "isVoided" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isrRetained" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "itbisRetained" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "paymentDate" DATE;

-- AlterTable
ALTER TABLE "JournalEntry" ADD COLUMN     "createdByUserId" TEXT;

-- CreateTable
CREATE TABLE "TaxFiling" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "taxType" TEXT NOT NULL,
    "salesAmount" DECIMAL(18,2) NOT NULL,
    "salesItbis" DECIMAL(18,2) NOT NULL,
    "purchasesAmount" DECIMAL(18,2) NOT NULL,
    "purchasesItbis" DECIMAL(18,2) NOT NULL,
    "itbisToPay" DECIMAL(18,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'FILED',
    "filedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaxFiling_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxDocument" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxDocumentChunk" (
    "id" TEXT NOT NULL,
    "taxDocumentId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" vector(768) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaxDocumentChunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "sku" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "ProductType" NOT NULL DEFAULT 'SERVICE',
    "price" DECIMAL(18,2) NOT NULL,
    "cost" DECIMAL(18,2),
    "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 18,
    "unit" TEXT NOT NULL DEFAULT 'unidad',
    "revenueAccountId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quotation" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "clientRnc" TEXT,
    "clientName" TEXT NOT NULL,
    "clientEmail" TEXT,
    "status" "QuotationStatus" NOT NULL DEFAULT 'DRAFT',
    "validUntil" DATE,
    "notes" TEXT,
    "subtotal" DECIMAL(18,2) NOT NULL,
    "itbis" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(18,2) NOT NULL,
    "invoiceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quotation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuotationLine" (
    "id" TEXT NOT NULL,
    "quotationId" TEXT NOT NULL,
    "productId" TEXT,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unitPrice" DECIMAL(18,2) NOT NULL,
    "discount" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 18,
    "subtotal" DECIMAL(18,2) NOT NULL,
    "itbis" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "QuotationLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceLine" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "productId" TEXT,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unitPrice" DECIMAL(18,2) NOT NULL,
    "discount" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 18,
    "cost" DECIMAL(18,2),
    "subtotal" DECIMAL(18,2) NOT NULL,
    "itbis" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "InvoiceLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TaxFiling_companyId_period_taxType_key" ON "TaxFiling"("companyId", "period", "taxType");

-- CreateIndex
CREATE INDEX "TaxDocumentChunk_taxDocumentId_idx" ON "TaxDocumentChunk"("taxDocumentId");

-- CreateIndex
CREATE INDEX "Product_companyId_isActive_idx" ON "Product"("companyId", "isActive");

-- CreateIndex
CREATE INDEX "Product_companyId_code_idx" ON "Product"("companyId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Product_companyId_code_key" ON "Product"("companyId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Quotation_invoiceId_key" ON "Quotation"("invoiceId");

-- CreateIndex
CREATE INDEX "Quotation_companyId_status_idx" ON "Quotation"("companyId", "status");

-- CreateIndex
CREATE INDEX "Quotation_companyId_createdAt_idx" ON "Quotation"("companyId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Quotation_companyId_number_key" ON "Quotation"("companyId", "number");

-- CreateIndex
CREATE INDEX "QuotationLine_quotationId_idx" ON "QuotationLine"("quotationId");

-- CreateIndex
CREATE INDEX "InvoiceLine_invoiceId_idx" ON "InvoiceLine"("invoiceId");

-- CreateIndex
CREATE INDEX "BankTransaction_companyId_accountId_reconciled_idx" ON "BankTransaction"("companyId", "accountId", "reconciled");

-- CreateIndex
CREATE INDEX "BankTransaction_companyId_accountId_date_idx" ON "BankTransaction"("companyId", "accountId", "date");

-- CreateIndex
CREATE INDEX "Contact_companyId_name_idx" ON "Contact"("companyId", "name");

-- CreateIndex
CREATE INDEX "Employee_companyId_name_idx" ON "Employee"("companyId", "name");

-- CreateIndex
CREATE INDEX "Expense_companyId_date_idx" ON "Expense"("companyId", "date");

-- CreateIndex
CREATE INDEX "Expense_companyId_isVoided_date_idx" ON "Expense"("companyId", "isVoided", "date");

-- CreateIndex
CREATE INDEX "Expense_companyId_isForeignPayment_idx" ON "Expense"("companyId", "isForeignPayment");

-- CreateIndex
CREATE INDEX "Expense_companyId_ncf_idx" ON "Expense"("companyId", "ncf");

-- CreateIndex
CREATE INDEX "Invoice_companyId_date_idx" ON "Invoice"("companyId", "date");

-- CreateIndex
CREATE INDEX "Invoice_companyId_isVoided_date_idx" ON "Invoice"("companyId", "isVoided", "date");

-- CreateIndex
CREATE INDEX "Invoice_companyId_ncf_idx" ON "Invoice"("companyId", "ncf");

-- CreateIndex
CREATE INDEX "JournalEntry_companyId_status_idx" ON "JournalEntry"("companyId", "status");

-- CreateIndex
CREATE INDEX "JournalEntry_companyId_date_idx" ON "JournalEntry"("companyId", "date");

-- CreateIndex
CREATE INDEX "JournalEntry_companyId_reference_idx" ON "JournalEntry"("companyId", "reference");

-- CreateIndex
CREATE INDEX "JournalEntryLine_journalEntryId_idx" ON "JournalEntryLine"("journalEntryId");

-- CreateIndex
CREATE INDEX "JournalEntryLine_accountId_idx" ON "JournalEntryLine"("accountId");

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxFiling" ADD CONSTRAINT "TaxFiling_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxDocumentChunk" ADD CONSTRAINT "TaxDocumentChunk_taxDocumentId_fkey" FOREIGN KEY ("taxDocumentId") REFERENCES "TaxDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationLine" ADD CONSTRAINT "QuotationLine_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationLine" ADD CONSTRAINT "QuotationLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
