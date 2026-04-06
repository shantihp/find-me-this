# Build the Lambda deployment package.
# Installs Python dependencies into a staging dir, copies app source, then zips.
# Re-runs whenever requirements.txt or any app source file changes.

locals {
  backend_dir  = "${path.module}/../backend"
  build_dir    = "${path.module}/.build"
  zip_path     = "${path.module}/.build.zip"

  backend_hash = sha256(join("", [
    filesha256("${local.backend_dir}/requirements.txt"),
    filesha256("${local.backend_dir}/handler.py"),
  ]))
}

resource "null_resource" "lambda_build" {
  triggers = {
    backend_hash = local.backend_hash
    app_sources = sha256(join("", [
      for f in sort(fileset("${local.backend_dir}/app", "**/*.py")) :
      filesha256("${local.backend_dir}/app/${f}")
    ]))
  }

  provisioner "local-exec" {
    command = <<-EOT
      set -e
      rm -rf "${local.build_dir}"
      mkdir -p "${local.build_dir}"
      pip3 install \
        --quiet \
        --requirement "${local.backend_dir}/requirements.txt" \
        --target "${local.build_dir}" && \
      pip3 install \
        --quiet \
        --platform manylinux2014_x86_64 \
        --implementation cp \
        --python-version 3.12 \
        --only-binary=:all: \
        --upgrade \
        "pydantic==2.8.2" "pydantic-core==2.20.1" \
        --target "${local.build_dir}"
      cp -r "${local.backend_dir}/app" "${local.build_dir}/app"
      cp "${local.backend_dir}/handler.py" "${local.build_dir}/handler.py"
    EOT
  }
}

data "archive_file" "lambda" {
  type        = "zip"
  source_dir  = local.build_dir
  output_path = local.zip_path

  depends_on = [null_resource.lambda_build]
}

# S3 bucket for Lambda code — avoids the 70MB direct-upload limit
resource "aws_s3_bucket" "lambda_code" {
  bucket        = lower("${var.app_name}-lambda-code-${data.aws_caller_identity.current.account_id}")
  force_destroy = true

  tags = local.tags
}

resource "aws_s3_bucket_versioning" "lambda_code" {
  bucket = aws_s3_bucket.lambda_code.id
  versioning_configuration {
    status = "Enabled"
  }
}

data "aws_caller_identity" "current" {}

resource "aws_s3_object" "lambda_zip" {
  bucket = aws_s3_bucket.lambda_code.id
  key    = "FindMeThis-Api.zip"
  source = data.archive_file.lambda.output_path
  etag   = data.archive_file.lambda.output_md5

  depends_on = [data.archive_file.lambda]
}

resource "aws_lambda_function" "api" {
  function_name    = "${var.app_name}-Api"
  role             = aws_iam_role.lambda.arn
  runtime          = "python3.12"
  handler          = "handler.handler"
  s3_bucket        = aws_s3_bucket.lambda_code.id
  s3_key           = aws_s3_object.lambda_zip.key
  source_code_hash = data.archive_file.lambda.output_base64sha256
  timeout          = var.lambda_timeout
  memory_size      = var.lambda_memory

  environment {
    variables = {
      AWS_REGION_NAME       = var.aws_region
      RATE_LIMIT_TABLE      = aws_dynamodb_table.rate_limits.name
      USER_DATA_TABLE       = aws_dynamodb_table.user_data.name
      GEMINI_API_KEY        = var.gemini_api_key
      SERPAPI_KEY           = var.serpapi_key
      COGNITO_USER_POOL_ID  = aws_cognito_user_pool.main.id
      COGNITO_CLIENT_ID     = aws_cognito_user_pool_client.spa.id
      SAMPLES_BUCKET        = aws_s3_bucket.samples.id
      RECAPTCHA_SECRET_KEY  = var.recaptcha_secret_key
      CONTACT_EMAIL         = var.contact_email
    }
  }

  tags = local.tags
}

resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/${aws_lambda_function.api.function_name}"
  retention_in_days = 14

  tags = local.tags
}
