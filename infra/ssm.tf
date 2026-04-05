# Secrets stored as SecureString — Lambda reads these at runtime via env var injection
# (values are resolved by Terraform, not fetched by Lambda at startup)

resource "aws_ssm_parameter" "gemini_api_key" {
  name        = "/findmethis/gemini_api_key"
  description = "Google Gemini API key for image identification"
  type        = "SecureString"
  value       = var.gemini_api_key

  tags = local.tags
}

# Cognito values are written here after Cognito resources are created,
# so Lambda and any other consumers can read them from a consistent location.

resource "aws_ssm_parameter" "serpapi_key" {
  name        = "/findmethis/serpapi_key"
  description = "SerpAPI key for Google Shopping search"
  type        = "SecureString"
  value       = var.serpapi_key

  tags = local.tags
}

resource "aws_ssm_parameter" "cognito_user_pool_id" {
  name        = "/findmethis/cognito_user_pool_id"
  description = "Cognito User Pool ID"
  type        = "SecureString"
  value       = aws_cognito_user_pool.main.id

  tags = local.tags
}

resource "aws_ssm_parameter" "cognito_client_id" {
  name        = "/findmethis/cognito_client_id"
  description = "Cognito User Pool Client ID"
  type        = "SecureString"
  value       = aws_cognito_user_pool_client.spa.id

  tags = local.tags
}

resource "aws_ssm_parameter" "recaptcha_secret_key" {
  name        = "/findmethis/recaptcha_secret_key"
  description = "Google reCAPTCHA v2 secret key for contact form"
  type        = "SecureString"
  value       = var.recaptcha_secret_key

  tags = local.tags
}

resource "aws_ssm_parameter" "contact_email" {
  name        = "/findmethis/contact_email"
  description = "SES-verified email address for contact form submissions"
  type        = "SecureString"
  value       = var.contact_email

  tags = local.tags
}
