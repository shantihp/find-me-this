locals {
  tags = {
    Project     = var.app_name
    ManagedBy   = "terraform"
    Environment = "prod"
  }
}
