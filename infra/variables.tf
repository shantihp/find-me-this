variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "ap-south-1"
}

variable "app_name" {
  description = "Application name used as a prefix for resource names"
  type        = string
  default     = "FindMeThis"
}

variable "gemini_api_key" {
  description = "Google Gemini API key for image identification (stored in SSM SecureString)"
  type        = string
  sensitive   = true
}

variable "github_repo" {
  description = "GitHub repository for Amplify (format: username/repo)"
  type        = string
  default     = "shantihp/find-me-this"
}

variable "github_token" {
  description = "GitHub personal access token for Amplify to pull the repo"
  type        = string
  sensitive   = true
}

variable "amplify_branch" {
  description = "Git branch Amplify deploys from"
  type        = string
  default     = "develop"
}

variable "cors_allow_origins" {
  description = "Allowed CORS origins for API Gateway. Tighten to Amplify domain in production."
  type        = list(string)
  default     = ["*"]
}

variable "lambda_timeout" {
  description = "Lambda function timeout in seconds"
  type        = number
  default     = 30
}

variable "lambda_memory" {
  description = "Lambda function memory in MB"
  type        = number
  default     = 512
}
