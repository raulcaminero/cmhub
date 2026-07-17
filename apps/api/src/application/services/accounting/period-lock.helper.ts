import { BadRequestException } from '@nestjs/common';

export function checkPeriodLock(
  lockDate: Date | string | null | undefined,
  date: Date | string,
): void {
  if (lockDate) {
    const txDate = new Date(date);
    const companyLockDate = new Date(lockDate);
    
    // Normalize both dates to start-of-day for fair comparison
    const txTime = new Date(txDate.getFullYear(), txDate.getMonth(), txDate.getDate()).getTime();
    const lockTime = new Date(companyLockDate.getFullYear(), companyLockDate.getMonth(), companyLockDate.getDate()).getTime();

    if (txTime <= lockTime) {
      throw new BadRequestException(
        `El período contable hasta el ${companyLockDate.toLocaleDateString()} está cerrado. No se permiten registros ni modificaciones en esta fecha.`,
      );
    }
  }
}
