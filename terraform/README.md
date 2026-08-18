# CMHub Infrastructure-as-Code (Terraform)

Este directorio contiene las plantillas de **Terraform** para automatizar el aprovisionamiento y despliegue del frontend de Vercel y el backend de Render conectados a Supabase.

## 📋 Requisitos Previos

1. Instalar Terraform en tu sistema.
   * En macOS con Homebrew: `brew install hashicorp/tap/terraform`
2. Generar tokens de acceso API para las plataformas:
   * **Vercel:** Ve a `Vercel Dashboard -> Account Settings -> Tokens` y crea un token de acceso.
   * **Render:** Ve a `Render Dashboard -> Account Settings -> API Keys` y crea un token.

---

## 🚀 Instrucciones de Uso

### 1. Preparar Variables
Duplica el archivo de ejemplo de variables y renómbralo a `terraform.tfvars`:
```bash
cp terraform.tfvars.example terraform.tfvars
```
Abre `terraform.tfvars` con tu editor y coloca tus claves API, contraseñas y configuraciones reales.

### 2. Inicializar Terraform
Descarga los proveedores necesarios (Vercel, Render, Supabase) ejecutando:
```bash
terraform init
```

### 3. Planificar Cambios
Visualiza los recursos que se van a crear sin realizar ningún cambio real:
```bash
terraform plan
```

### 4. Aplicar Cambios (Desplegar)
Crea y conecta automáticamente toda tu infraestructura en la nube:
```bash
terraform apply
```
*(Escribe `yes` cuando te pida confirmación).*

---

## 🛡️ Notas de Seguridad

* **Nunca guardes `terraform.tfvars` en tu repositorio de GitHub.** El archivo ya está incluido en `.gitignore` para evitar filtraciones accidentales de tus claves privadas.
