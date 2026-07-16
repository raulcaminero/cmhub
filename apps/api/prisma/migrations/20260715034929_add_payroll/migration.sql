-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "cedula" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "salary" DECIMAL(18,2) NOT NULL,
    "jobTitle" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payroll" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "grossSalary" DECIMAL(18,2) NOT NULL,
    "sfsEmployee" DECIMAL(18,2) NOT NULL,
    "sfsEmployer" DECIMAL(18,2) NOT NULL,
    "afpEmployee" DECIMAL(18,2) NOT NULL,
    "afpEmployer" DECIMAL(18,2) NOT NULL,
    "arlEmployer" DECIMAL(18,2) NOT NULL,
    "isrDeduction" DECIMAL(18,2) NOT NULL,
    "netSalary" DECIMAL(18,2) NOT NULL,
    "journalEntryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payroll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollItem" (
    "id" TEXT NOT NULL,
    "payrollId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "grossSalary" DECIMAL(18,2) NOT NULL,
    "sfsEmployee" DECIMAL(18,2) NOT NULL,
    "afpEmployee" DECIMAL(18,2) NOT NULL,
    "isrDeduction" DECIMAL(18,2) NOT NULL,
    "netSalary" DECIMAL(18,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Employee_companyId_cedula_key" ON "Employee"("companyId", "cedula");

-- CreateIndex
CREATE UNIQUE INDEX "Payroll_companyId_period_key" ON "Payroll"("companyId", "period");

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payroll" ADD CONSTRAINT "Payroll_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payroll" ADD CONSTRAINT "Payroll_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollItem" ADD CONSTRAINT "PayrollItem_payrollId_fkey" FOREIGN KEY ("payrollId") REFERENCES "Payroll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollItem" ADD CONSTRAINT "PayrollItem_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
