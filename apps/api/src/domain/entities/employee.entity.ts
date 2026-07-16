export class EmployeeEntity {
  id: string;
  companyId: string;
  cedula: string;
  name: string;
  salary: number; // Cast from Decimal at domain level for easier calculation
  jobTitle: string | null;
  createdAt: Date;
  updatedAt: Date;
}
