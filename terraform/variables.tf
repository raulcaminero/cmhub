variable "environment" {
  description = "The deployment environment (e.g. production, staging, dev)"
  type        = string
  default     = "production"
}

variable "github_repo_url" {
  description = "The URL of the GitHub repository"
  type        = string
  default     = "https://github.com/raulcaminero/cmhub"
}

variable "github_branch" {
  description = "The GitHub branch to deploy"
  type        = string
  default     = "main"
}

variable "supabase_project_ref" {
  description = "The Supabase project reference code"
  type        = string
  default     = "rzumdrqyerlwdiftxzxb"
}

variable "supabase_db_password" {
  description = "The password for the Supabase database"
  type        = string
  sensitive   = true
}

variable "gemini_api_key" {
  description = "API key for Gemini AI assistant"
  type        = string
  sensitive   = true
}

variable "resend_api_key" {
  description = "API key for Resend email notifications"
  type        = string
  sensitive   = true
}

variable "vercel_api_token" {
  description = "API token for Vercel authorization"
  type        = string
  sensitive   = true
}

variable "render_api_key" {
  description = "API key for Render authorization"
  type        = string
  sensitive   = true
}

variable "render_owner_id" {
  description = "The owner ID for Render account/team (found in Render dashboard URL/settings)"
  type        = string
  default     = ""
}
