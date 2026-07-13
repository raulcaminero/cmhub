-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "providerRnc" TEXT NOT NULL,
    "providerName" TEXT NOT NULL,
    "ncf" TEXT NOT NULL,
    "expenseType" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "paymentDate" DATE,
    "amount" DECIMAL(18,2) NOT NULL,
    "itbis" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "itbisRetained" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "isrRetained" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "paymentMethod" TEXT NOT NULL,
    "journalEntryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Expense_journalEntryId_key" ON "Expense"("journalEntryId");

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
