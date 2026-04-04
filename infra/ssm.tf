# Secrets stored as SecureString — Lambda reads these at runtime via env var injection
# (values are resolved by Terraform, not fetched by Lambda at startup)

resource "aws_ssm_parameter" "openai_api_key" {
  name        = "/findmethis/openai_api_key"
  description = "OpenAI API key for GPT-4o Vision"
  type        = "SecureString"
  value       = var.openai_api_key

  tags = local.tags
}

# Cognito values are written here after Cognito resources are created,
# so Lambda and any other consumers can read them from a consistent location.

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
