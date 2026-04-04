resource "aws_amplify_app" "frontend" {
  name         = var.app_name
  repository   = "https://github.com/${var.github_repo}"
  access_token = var.github_token

  build_spec = file("${path.module}/../amplify.yml")

  environment_variables = {
    VITE_API_URL                = "https://${aws_apigatewayv2_api.main.id}.execute-api.${var.aws_region}.amazonaws.com"
    VITE_COGNITO_USER_POOL_ID   = aws_cognito_user_pool.main.id
    VITE_COGNITO_CLIENT_ID      = aws_cognito_user_pool_client.spa.id
  }

  # Redirect all paths to index.html for React client-side routing
  custom_rule {
    source = "</^[^.]+$|\\.(?!(css|gif|ico|jpg|jpeg|js|png|txt|svg|woff|woff2|ttf|map|json|webp)$)([^.]+$)/>"
    status = "200"
    target = "/index.html"
  }

  tags = local.tags
}

resource "aws_amplify_branch" "main_branch" {
  app_id      = aws_amplify_app.frontend.id
  branch_name = var.amplify_branch

  # Auto-build on push to this branch
  enable_auto_build = true

  environment_variables = {
    VITE_API_URL                = "https://${aws_apigatewayv2_api.main.id}.execute-api.${var.aws_region}.amazonaws.com"
    VITE_COGNITO_USER_POOL_ID   = aws_cognito_user_pool.main.id
    VITE_COGNITO_CLIENT_ID      = aws_cognito_user_pool_client.spa.id
  }

  tags = local.tags
}
