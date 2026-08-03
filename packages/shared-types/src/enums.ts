export enum AccountType {
  ASSET = 'ASSET',
  LIABILITY = 'LIABILITY',
  EQUITY = 'EQUITY',
  REVENUE = 'REVENUE',
  EXPENSE = 'EXPENSE',
}

export enum JournalEntryStatus {
  DRAFT = 'DRAFT',
  POSTED = 'POSTED',
  VOIDED = 'VOIDED',
}

export enum NcfType {
  B01 = 'B01',
  B02 = 'B02',
  B14 = 'B14',
  B15 = 'B15',
  B16 = 'B16',
  E31 = 'E31',
  E32 = 'E32',
  E33 = 'E33',
  E34 = 'E34',
  E41 = 'E41',
  E43 = 'E43',
  E44 = 'E44',
  E45 = 'E45',
}

export enum TaxRegime {
  ORDINARIO = 'ORDINARIO',
  RST = 'RST',
}

export enum UserRole {
  ADMIN = 'ADMIN',
  CONTADOR = 'CONTADOR',
  VIEWER = 'VIEWER',
}

export enum SystemModule {
  DR_FISCAL = 'DR_FISCAL',
  US_ACCOUNTING = 'US_ACCOUNTING',
  LATAM = 'LATAM',
  INTERNATIONAL = 'INTERNATIONAL',
}

export const MODULE_PRESETS = {
  DOMINICAN: [SystemModule.DR_FISCAL],
  USA: [SystemModule.US_ACCOUNTING],
  LATAM: [SystemModule.LATAM],
  RD_AND_USA: [SystemModule.DR_FISCAL, SystemModule.US_ACCOUNTING],
  INTERNATIONAL: [SystemModule.DR_FISCAL, SystemModule.US_ACCOUNTING, SystemModule.LATAM, SystemModule.INTERNATIONAL],
};

