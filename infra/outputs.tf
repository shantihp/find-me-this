output "api_url" {
  description = "API Gateway invoke URL — set this as VITE_API_URL in frontend"
  value       = "https://${aws_apigatewayv2_api.main.id}.execute-api.${var.aws_region}.amazonaws.com"
}

output "amplify_url" {
  description = "Amplify frontend URL"
  value       = "https://${var.amplify_branch}.${aws_amplify_app.frontend.default_domain}"
}

output "cognito_user_pool_id" {
  description = "Cognito User Pool ID"
  value       = aws_cognito_user_pool.main.id
}

output "cognito_client_id" {
  description = "Cognito SPA Client ID"
  value       = aws_cognito_user_pool_client.spa.id
}

output "cognito_hosted_ui_domain" {
  description = "Cognito Hosted UI base URL"
  value       = "https://${aws_cognito_user_pool_domain.main.domain}.auth.${var.aws_region}.amazoncognito.com"
}

output "lambda_function_name" {
  description = "Lambda function name"
  value       = aws_lambda_function.api.function_name
}
