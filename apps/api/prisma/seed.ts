import { PrismaClient, UserRole, TaxRegime, ProductType, QuotationStatus, AccountType, NcfType, ContactType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando la siembra de datos de prueba para CMHub...');

  // 1. Limpiar datos existentes en orden de cascada
  console.log('🧹 Limpiando registros antiguos...');
  await prisma.bankTransaction.deleteMany({});
  await prisma.payrollItem.deleteMany({});
  await prisma.payroll.deleteMany({});
  await prisma.employee.deleteMany({});
  await prisma.expense.deleteMany({});
  await prisma.invoiceLine.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.quotationLine.deleteMany({});
  await prisma.quotation.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.contact.deleteMany({});
  await prisma.ncfSequence.deleteMany({});
  await prisma.journalEntryLine.deleteMany({});
  await prisma.journalEntry.deleteMany({});
  await prisma.account.deleteMany({});
  await prisma.taxRate.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.userCompanyRole.deleteMany({});
  await prisma.company.deleteMany({});
  await prisma.user.deleteMany({});

  // 2. Contraseña común hasheada para todos los usuarios demo
  const passwordHash = await bcrypt.hash('Password123!', 12);

  // 3. Crear Usuarios demo (Admin, Contador, Auxiliar)
  console.log('👤 Creando usuarios demo (admin@demo.com, contador@demo.com, auxiliar@demo.com)...');
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@demo.com',
      passwordHash,
      firstName: 'Carlos',
      lastName: 'Administrador',
      isEmailVerified: true,
    },
  });

  const accountantUser = await prisma.user.create({
    data: {
      email: 'contador@demo.com',
      passwordHash,
      firstName: 'Laura',
      lastName: 'Contadora',
      isEmailVerified: true,
    },
  });

  const auxiliaryUser = await prisma.user.create({
    data: {
      email: 'auxiliar@demo.com',
      passwordHash,
      firstName: 'Pedro',
      lastName: 'Auxiliar',
      isEmailVerified: true,
    },
  });

  // 4. Crear Empresa Principal (República Dominicana)
  console.log('🏢 Creando empresa demo "Constructora & Soluciones Tech SRL"...');
  const company = await prisma.company.create({
    data: {
      name: 'Constructora & Soluciones Tech SRL',
      rnc: '131888999',
      tradeName: 'CMHub Soluciones',
      taxRegime: TaxRegime.ORDINARIO,
      address: 'Av. Winston Churchill #101, Torre Empresarial SD',
      phone: '809-555-0199',
      email: 'contacto@constructora.com.do',
      country: 'DO',
      currency: 'DOP',
    },
  });

  // 5. Asignar Roles de Usuario a la Empresa
  await prisma.userCompanyRole.createMany({
    data: [
      { userId: adminUser.id, companyId: company.id, role: UserRole.ADMIN },
      { userId: accountantUser.id, companyId: company.id, role: UserRole.CONTADOR },
      { userId: auxiliaryUser.id, companyId: company.id, role: UserRole.VIEWER },
    ],
  });

  // 6. Crear Cuentas Contables Estándar (Activos, Pasivos, Capital, Ingresos, Gastos)
  console.log('📚 Sembrando catálogo de cuentas contables...');
  const accountsData = [
    // Activos (100)
    { code: '1101', name: 'Efectivo en Banco Banreservas', type: AccountType.ASSET },
    { code: '1102', name: 'Cuentas por Cobrar Clientes', type: AccountType.ASSET },
    { code: '1103', name: 'Inventario de Mercancías', type: AccountType.ASSET },
    { code: '1104', name: 'ITBIS Adelantado / Pagado en Compras', type: AccountType.ASSET },
    
    // Pasivos (200)
    { code: '2101', name: 'Cuentas por Pagar Proveedores', type: AccountType.LIABILITY },
    { code: '2102', name: 'ITBIS Retenido y por Pagar DGII', type: AccountType.LIABILITY },
    { code: '2103', name: 'ISR Retenido a Terceros', type: AccountType.LIABILITY },
    { code: '2104', name: 'TSS por Pagar (SFS + AFP + SRL)', type: AccountType.LIABILITY },
    
    // Capital (300)
    { code: '3101', name: 'Capital Social Autorizado y Pagado', type: AccountType.EQUITY },
    { code: '3102', name: 'Resultados Acumulados', type: AccountType.EQUITY },
    
    // Ingresos (400)
    { code: '4101', name: 'Ventas de Servicios de Desarrollo & Consultoría', type: AccountType.REVENUE },
    { code: '4102', name: 'Ventas de Productos y Licencias ERP', type: AccountType.REVENUE },
    
    // Gastos (500)
    { code: '5101', name: 'Gastos de Alquiler Comercial', type: AccountType.EXPENSE },
    { code: '5102', name: 'Gastos de Sueldos y Salarios', type: AccountType.EXPENSE },
    { code: '5103', name: 'Gastos de Servicios Públicos', type: AccountType.EXPENSE },
    { code: '5104', name: 'Gastos de Materiales de Oficina', type: AccountType.EXPENSE },
  ];

  const createdAccounts: Record<string, any> = {};
  for (const acc of accountsData) {
    const created = await prisma.account.create({
      data: {
        companyId: company.id,
        code: acc.code,
        name: acc.name,
        type: acc.type,
      },
    });
    createdAccounts[acc.code] = created;
  }

  // 7. Crear Secuencias de Comprobantes Fiscales NCF (DGII)
  console.log('🏷️ Sembrando secuencias NCF (B01, B02, B14, B15)...');
  await prisma.ncfSequence.createMany({
    data: [
      { companyId: company.id, type: NcfType.B01, prefix: 'B01', current: 3, max: 100, expiresAt: new Date('2027-12-31') },
      { companyId: company.id, type: NcfType.B02, prefix: 'B02', current: 1, max: 200, expiresAt: new Date('2027-12-31') },
      { companyId: company.id, type: NcfType.B14, prefix: 'B14', current: 1, max: 50, expiresAt: new Date('2027-12-31') },
      { companyId: company.id, type: NcfType.B15, prefix: 'B15', current: 1, max: 50, expiresAt: new Date('2027-12-31') },
    ],
  });

  // 8. Crear Contactos (Clientes y Proveedores)
  console.log('📇 Creando clientes y proveedores...');
  const client1 = await prisma.contact.create({
    data: {
      companyId: company.id,
      name: 'Constructora del Caribe SRL',
      rnc: '101001122',
      type: ContactType.CLIENT,
      email: 'facturacion@caribecorp.com.do',
      phone: '809-555-8811',
      address: 'Av. Abraham Lincoln #402, Santo Domingo',
    },
  });

  const client2 = await prisma.contact.create({
    data: {
      companyId: company.id,
      name: 'Inversiones Plaza Real SAS',
      rnc: '130998877',
      type: ContactType.CLIENT,
      email: 'compras@plazareal.com.do',
      phone: '809-555-9922',
      address: 'Av. 27 de Febrero #88, Santiago',
    },
  });

  const vendor1 = await prisma.contact.create({
    data: {
      companyId: company.id,
      name: 'Suplidora Industrial Dominicana SRL',
      rnc: '102334455',
      type: ContactType.PROVIDER,
      email: 'ventas@suplidoradom.com.do',
      phone: '809-555-3344',
      address: 'Zona Industrial de Haina',
    },
  });

  // 9. Crear Catálogo de Productos y Servicios
  console.log('📦 Creando catálogo de productos y servicios...');
  const prod1 = await prisma.product.create({
    data: {
      companyId: company.id,
      code: 'SERV-01',
      name: 'Consultoría de Software y Desarrollo Web',
      type: ProductType.SERVICE,
      price: 50000,
      taxRate: 18,
      revenueAccountId: createdAccounts['4101'].id,
    },
  });

  const prod2 = await prisma.product.create({
    data: {
      companyId: company.id,
      code: 'SERV-02',
      name: 'Asesoría Financiera y Contable Mensual',
      type: ProductType.SERVICE,
      price: 25000,
      taxRate: 18,
      revenueAccountId: createdAccounts['4101'].id,
    },
  });

  const prod3 = await prisma.product.create({
    data: {
      companyId: company.id,
      code: 'PROD-01',
      name: 'Licencia Anual ERP CMHub Pro',
      type: ProductType.DIGITAL,
      price: 15000,
      taxRate: 18,
      revenueAccountId: createdAccounts['4102'].id,
    },
  });

  // 10. Crear Cotizaciones
  console.log('📜 Creando cotizaciones comerciales...');
  await prisma.quotation.create({
    data: {
      companyId: company.id,
      number: 'COT-2026-001',
      clientRnc: client1.rnc,
      clientName: client1.name,
      clientEmail: client1.email,
      status: QuotationStatus.ACCEPTED,
      validUntil: new Date('2026-09-30'),
      notes: 'Validez de oferta 30 días. Pago 50% al iniciar.',
      subtotal: 50000,
      itbis: 9000,
      total: 59000,
      lines: {
        create: [
          { productId: prod1.id, description: 'Consultoría de Software y Desarrollo Web', quantity: 1, unitPrice: 50000, discount: 0, taxRate: 18, subtotal: 50000, itbis: 9000, total: 59000 },
        ],
      },
    },
  });

  await prisma.quotation.create({
    data: {
      companyId: company.id,
      number: 'COT-2026-002',
      clientRnc: client2.rnc,
      clientName: client2.name,
      clientEmail: client2.email,
      status: QuotationStatus.SENT,
      validUntil: new Date('2026-10-15'),
      notes: 'Incluye soporte técnico de 3 meses gratis.',
      subtotal: 25000,
      itbis: 4500,
      total: 29500,
      lines: {
        create: [
          { productId: prod2.id, description: 'Asesoría Financiera y Contable Mensual', quantity: 1, unitPrice: 25000, discount: 0, taxRate: 18, subtotal: 25000, itbis: 4500, total: 29500 },
        ],
      },
    },
  });

  // 11. Crear Facturas de Venta (Invoices con NCF B01)
  console.log('🧾 Creando facturas de venta con NCFs...');
  await prisma.invoice.create({
    data: {
      companyId: company.id,
      createdByUserId: adminUser.id,
      clientRnc: client1.rnc,
      clientName: client1.name,
      ncf: 'B0100000001',
      ncfType: NcfType.B01,
      date: new Date('2026-08-01'),
      paymentDate: new Date('2026-08-10'),
      amount: 59000,
      itbis: 9000,
      paymentMethod: 'TRANSFER',
      lines: {
        create: [
          { productId: prod1.id, description: 'Consultoría de Software y Desarrollo Web', quantity: 1, unitPrice: 50000, discount: 0, taxRate: 18, subtotal: 50000, itbis: 9000, total: 59000 },
        ],
      },
    },
  });

  await prisma.invoice.create({
    data: {
      companyId: company.id,
      createdByUserId: adminUser.id,
      clientRnc: client2.rnc,
      clientName: client2.name,
      ncf: 'B0100000002',
      ncfType: NcfType.B01,
      date: new Date('2026-08-05'),
      amount: 29500,
      itbis: 4500,
      paymentMethod: 'TRANSFER',
      lines: {
        create: [
          { productId: prod2.id, description: 'Asesoría Financiera y Contable Mensual', quantity: 1, unitPrice: 25000, discount: 0, taxRate: 18, subtotal: 25000, itbis: 4500, total: 29500 },
        ],
      },
    },
  });

  // 12. Crear Gastos y Compras Registradas (Expenses 606)
  console.log('💳 Creando gastos y compras registradas (606)...');
  await prisma.expense.create({
    data: {
      companyId: company.id,
      createdByUserId: accountantUser.id,
      providerRnc: vendor1.rnc,
      providerName: vendor1.name,
      ncf: 'B0100005511',
      expenseType: 'Alquiler Comercial',
      date: new Date('2026-08-02'),
      paymentDate: new Date('2026-08-02'),
      amount: 40000,
      itbis: 7200,
      itbisRetained: 7200,
      isrRetained: 4000,
      paymentMethod: 'CHEQUE',
    },
  });

  await prisma.expense.create({
    data: {
      companyId: company.id,
      createdByUserId: accountantUser.id,
      providerRnc: '103445566',
      providerName: 'OfiSoluciones SRL',
      ncf: 'B0100008822',
      expenseType: 'Materiales de Oficina',
      date: new Date('2026-08-04'),
      paymentDate: new Date('2026-08-04'),
      amount: 12500,
      itbis: 2250,
      paymentMethod: 'TRANSFER',
    },
  });

  // 13. Crear Empleados y Nómina Procesada
  console.log('👥 Creando empleados y nómina procesada...');
  const emp1 = await prisma.employee.create({
    data: {
      companyId: company.id,
      cedula: '00118887766',
      name: 'Juan Carlos Pérez',
      jobTitle: 'Desarrollador Full Stack Senior',
      salary: 85000,
    },
  });

  const emp2 = await prisma.employee.create({
    data: {
      companyId: company.id,
      cedula: '00115554433',
      name: 'María Altagracia Rodríguez',
      jobTitle: 'Asistente Contable',
      salary: 45000,
    },
  });

  await prisma.payroll.create({
    data: {
      companyId: company.id,
      period: '202608',
      grossSalary: 130000,
      sfsEmployee: 3952,
      sfsEmployer: 9217,
      afpEmployee: 3731,
      afpEmployer: 9230,
      arlEmployer: 1430,
      isrDeduction: 8250,
      netSalary: 114067,
      items: {
        create: [
          { employeeId: emp1.id, grossSalary: 85000, sfsEmployee: 2584, afpEmployee: 2439.50, isrDeduction: 6250, netSalary: 73726.50 },
          { employeeId: emp2.id, grossSalary: 45000, sfsEmployee: 1368, afpEmployee: 1291.50, isrDeduction: 2000, netSalary: 40340.50 },
        ],
      },
    },
  });

  // 14. Crear Transacciones Bancarias (para Conciliación)
  console.log('🏦 Creando transacciones bancarias...');
  await prisma.bankTransaction.createMany({
    data: [
      { companyId: company.id, accountId: createdAccounts['1101'].id, date: new Date('2026-08-01'), description: 'Depósito Transferencia Constructora del Caribe (INV-2026-001)', amount: 59000, reference: 'TRF-9011', reconciled: true },
      { companyId: company.id, accountId: createdAccounts['1101'].id, date: new Date('2026-08-02'), description: 'Cheque Renta Local Comercial (B0100005511)', amount: -47200, reference: 'CH-4091', reconciled: true },
      { companyId: company.id, accountId: createdAccounts['1101'].id, date: new Date('2026-08-05'), description: 'Transferencia Inversiones Plaza Real (INV-2026-002)', amount: 29500, reference: 'TRF-9088', reconciled: false },
    ],
  });

  console.log('');
  console.log('🎉 ¡Siembra de datos completada exitosamente!');
  console.log('=========================================================');
  console.log('🔑 Credenciales de Usuarios Demo:');
  console.log('   1. ADMINISTRADOR: admin@demo.com    / Password123!');
  console.log('   2. CONTADOR:      contador@demo.com / Password123!');
  console.log('   3. AUXILIAR:       auxiliar@demo.com / Password123!');
  console.log('');
  console.log('🏢 Empresa Demo:     Constructora & Soluciones Tech SRL (RNC: 131888999)');
  console.log('=========================================================');
}

main()
  .catch((e) => {
    console.error('❌ Error durante la siembra de datos:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
