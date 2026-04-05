resource "aws_s3_bucket" "samples" {
  bucket        = lower("${var.app_name}-samples-${data.aws_caller_identity.current.account_id}")
  force_destroy = true

  tags = local.tags
}

resource "aws_s3_bucket_public_access_block" "samples" {
  bucket                  = aws_s3_bucket.samples.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "samples" {
  bucket = aws_s3_bucket.samples.id

  rule {
    id     = "auto-delete-after-5-days"
    status = "Enabled"

    expiration {
      days = 5
    }
  }
}
