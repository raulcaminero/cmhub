export function validarRNC(rnc: string): boolean {
  const clean = rnc.replace(/\D/g, '');
  if (clean.length !== 9) return false;

  const digitos = clean.split('').map(Number);
  const peso = [7, 9, 8, 6, 5, 4, 3, 2];
  let suma = 0;

  for (let i = 0; i < 8; i++) {
    suma += digitos[i] * peso[i];
  }

  const resto = suma % 11;
  let digitoCalculado;

  if (resto === 0) {
    digitoCalculado = 2;
  } else if (resto === 1) {
    digitoCalculado = 1;
  } else {
    digitoCalculado = 11 - resto;
  }

  return digitoCalculado === digitos[8];
}

export function validarCedula(cedula: string): boolean {
  const clean = cedula.replace(/\D/g, '');
  if (clean.length !== 11) return false;

  let suma = 0;
  for (let i = 0; i < 10; i++) {
    const digito = parseInt(clean[i]);
    const multiplicador = (i % 2 === 0) ? 1 : 2;
    const producto = digito * multiplicador;
    
    suma += (producto > 9) ? (Math.floor(producto / 10) + (producto % 10)) : producto;
  }

  const digitoVerificador = (10 - (suma % 10)) % 10;
  return digitoVerificador === parseInt(clean[10]);
}

export function validarDocFiscal(doc: string): boolean {
  const clean = doc.replace(/\D/g, '');
  if (clean.length === 9) {
    return validarRNC(clean);
  } else if (clean.length === 11) {
    return validarCedula(clean);
  }
  return false;
}
