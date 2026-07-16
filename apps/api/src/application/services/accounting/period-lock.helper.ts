import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma/prisma.service';

export async function checkPeriodLock(
  prisma: PrismaService,
  companyId: string,
  date: Date | string,
): Promise<void> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { lockDate: true },
  });

  if (company?.lockDate) {
    const txDate = new Date(date);
    const lockDate = new Date(company.lockDate);
    
    // Normalize both dates to start-of-day for fair comparison
    const txTime = new Date(txDate.getFullYear(), txDate.getMonth(), txDate.getDate()).getTime();
    const lockTime = new Date(lockDate.getFullYear(), lockDate.getMonth(), lockDate.getDate()).getTime();

    if (txTime <= lockTime) {
      throw new BadRequestException(
        `El período contable hasta el ${lockDate.toLocaleDateString()} está cerrado. No se permiten registros ni modificaciones en esta fecha.`,
      );
    }
  }
}
