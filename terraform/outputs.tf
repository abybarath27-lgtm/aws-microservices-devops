output "aws_region" {
  value = var.aws_region
}

output "repository_urls" {
  value = aws_ecr_repository.microservices
}

output "ec2_instance_id" {
  description = "Existing EC2 instance ID"
  value       = aws_instance.app.id
}

output "ec2_public_ip" {
  description = "Public IP of the EC2 instance"
  value       = aws_instance.app.public_ip
}

output "security_group_id" {
  description = "Existing application security group ID"
  value       = aws_security_group.app.id
}

output "deployment_role_arn" {
  description = "Existing EC2 deployment IAM role ARN"
  value       = data.aws_iam_role.deployment.arn
}

output "instance_profile_arn" {
  description = "Existing EC2 IAM instance profile ARN"
  value       = data.aws_iam_instance_profile.deployment.arn
}
