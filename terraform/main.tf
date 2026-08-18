provider "render" {
  api_key  = var.render_api_key
  owner_id = var.render_owner_id != "" ? var.render_owner_id : null
}

provider "vercel" {
  api_token = var.vercel_api_token
}

# 1. Render API Backend Service (NestJS in Docker)
resource "render_web_service" "api" {
  name        = "cmhub-api-${var.environment}"
  plan        = "free"
  region      = "ohio" # us-east-2 region matching Supabase Ohio
  runtime     = "docker"
  repo        = var.github_repo_url
  branch      = var.github_branch

  # Docker deployment context
  docker_context  = "."
  dockerfile_path = "apps/api/Dockerfile"

  env_vars = {
    NODE_ENV        = "production"
    PORT            = "3001"
    ALLOWED_ORIGINS = "*"
    GEMINI_API_KEY  = var.gemini_api_key
    RESEND_API_KEY  = var.resend_api_key
    
    # Supabase Connection Pooler (Ohio us-east-2)
    DATABASE_URL = "postgresql://postgres.${var.supabase_project_ref}:${var.supabase_db_password}@aws-0-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true"
    DIRECT_URL   = "postgresql://postgres.${var.supabase_project_ref}:${var.supabase_db_password}@aws-0-us-east-2.pooler.supabase.com:5432/postgres"
  }
}

# 2. Vercel Web Frontend Service (NextJS UI)
resource "vercel_project" "web" {
  name            = "cmhub-web-${var.environment}"
  framework       = "nextjs"
  root_directory  = "apps/web"
  
  git_repository = {
    type = "github"
    repo = replace(var.github_repo_url, "https://github.com/", "")
  }
}

# 3. Environment Variable Binding Vercel UI -> Render API URL
resource "vercel_project_environment_variable" "api_url" {
  project_id = vercel_project.web.id
  key        = "NEXT_PUBLIC_API_URL"
  value      = "${render_web_service.api.url}/api"
  target     = ["production", "preview", "development"]
}
