resource "aws_cognito_user_pool" "main" {
  name = "${var.app_name}-Users"

  # Use email as the login identifier
  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  username_configuration {
    case_sensitive = false
  }

  password_policy {
    minimum_length                   = 8
    require_lowercase                = true
    require_numbers                  = true
    require_symbols                  = false
    require_uppercase                = false
    temporary_password_validity_days = 7
  }

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  email_configuration {
    email_sending_account = "COGNITO_DEFAULT"
  }

  schema {
    name                     = "email"
    attribute_data_type      = "String"
    required                 = true
    mutable                  = true

    string_attribute_constraints {
      min_length = 5
      max_length = 254
    }
  }

  tags = local.tags
}

# SPA client — no secret (public client, PKCE flow)
resource "aws_cognito_user_pool_client" "spa" {
  name         = "${var.app_name}-SPA"
  user_pool_id = aws_cognito_user_pool.main.id

  generate_secret = false

  # Token validity
  access_token_validity  = 1   # hours
  id_token_validity      = 1   # hours
  refresh_token_validity = 30  # days

  token_validity_units {
    access_token  = "hours"
    id_token      = "hours"
    refresh_token = "days"
  }

  explicit_auth_flows = [
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
  ]

  supported_identity_providers = ["COGNITO"]

  # Callback URLs — Amplify URL is added here; update after first Amplify deploy
  callback_urls = [
    "http://localhost:3000",
    "https://${var.amplify_branch}.${aws_amplify_app.frontend.default_domain}",
  ]

  logout_urls = [
    "http://localhost:3000",
    "https://${var.amplify_branch}.${aws_amplify_app.frontend.default_domain}",
  ]

  allowed_oauth_flows                  = ["code"]
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_scopes                 = ["openid", "email", "profile"]

  prevent_user_existence_errors = "ENABLED"
}

# Hosted UI domain — users can sign in via Cognito's built-in UI
resource "aws_cognito_user_pool_domain" "main" {
  domain       = lower("${var.app_name}-auth")
  user_pool_id = aws_cognito_user_pool.main.id
}
