provider "aws" {
  region = var.aws_region
}

locals {
  repositories = toset([
    "user-service",
    "product-service",
    "order-service"
  ])
}

resource "aws_ecr_repository" "microservices" {
  for_each = local.repositories

  name                 = each.value
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = {
    Project     = "Microservices-DevOps"
    Environment = "Development"
    ManagedBy   = "Terraform"
  }
}

output "ecr_repository_urls" {
  value = {
    for name, repository in aws_ecr_repository.microservices :
    name => repository.repository_url
  }
}
