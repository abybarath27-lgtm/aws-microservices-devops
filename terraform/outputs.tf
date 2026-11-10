output "aws_region" {
  value = var.aws_region
}

output "repository_urls" {
  value = aws_ecr_repository.microservices
}
