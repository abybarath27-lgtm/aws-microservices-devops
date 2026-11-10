
pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
        timeout(time: 30, unit: 'MINUTES')
    }

    environment {
        AWS_REGION = 'ap-southeast-2'
        AWS_ACCOUNT_ID = '660083831844'
        ECR_REGISTRY = '660083831844.dkr.ecr.ap-southeast-2.amazonaws.com'
        AWS_PAGER = ''
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm

                // Remove stale rollback data from an earlier build.
                sh 'rm -f rollback.env'

                script {
                    def commitId = sh(
                        script: 'git rev-parse --short=7 HEAD',
                        returnStdout: true
                    ).trim()

                    env.IMAGE_TAG = "${BUILD_NUMBER}-${commitId}"

                    echo "Image tag: ${env.IMAGE_TAG}"
                }
            }
        }

        stage('Validate') {
            steps {
                sh '''
                    set -e

                    echo "Checking required files..."

                    test -f docker-compose.yml
                    test -f nginx/nginx.conf
                    test -f services/user-service/Dockerfile
                    test -f services/product-service/Dockerfile
                    test -f services/order-service/Dockerfile

                    echo "Validating Docker Compose..."

                    docker compose config --quiet

                    echo "Checking AWS identity..."

                    aws sts get-caller-identity

                    echo "Checking ECR repositories..."

                    aws ecr describe-repositories \
                      --repository-names user-service product-service order-service \
                      --region "$AWS_REGION"

                    echo "Validation completed."
                '''
            }
        }

        stage('Build Images') {
            steps {
                sh '''
                    set -e

                    echo "Building user-service..."

                    docker build \
                      -t "$ECR_REGISTRY/user-service:$IMAGE_TAG" \
                      ./services/user-service

                    echo "Building product-service..."

                    docker build \
                      -t "$ECR_REGISTRY/product-service:$IMAGE_TAG" \
                      ./services/product-service

                    echo "Building order-service..."

                    docker build \
                      -t "$ECR_REGISTRY/order-service:$IMAGE_TAG" \
                      ./services/order-service
                '''
            }
        }

        stage('Test Images') {
            steps {
                sh '''
                    set -e

                    NETWORK="ci-test-${BUILD_NUMBER}"

                    USER_CONTAINER="ci-user-${BUILD_NUMBER}"
                    PRODUCT_CONTAINER="ci-product-${BUILD_NUMBER}"
                    ORDER_CONTAINER="ci-order-${BUILD_NUMBER}"

                    cleanup() {
                        docker rm -f "$USER_CONTAINER" \
                            "$PRODUCT_CONTAINER" "$ORDER_CONTAINER" \
                            >/dev/null 2>&1 || true

                        docker network rm "$NETWORK" \
                            >/dev/null 2>&1 || true
                    }

                    cleanup

                    docker network create "$NETWORK"

                    trap cleanup EXIT

                    docker run -d \
                      --name "$USER_CONTAINER" \
                      --network "$NETWORK" \
                      --network-alias user-service \
                      -p 127.0.0.1:13001:3001 \
                      "$ECR_REGISTRY/user-service:$IMAGE_TAG"

                    docker run -d \
                      --name "$PRODUCT_CONTAINER" \
                      --network "$NETWORK" \
                      --network-alias product-service \
                      -p 127.0.0.1:13002:3002 \
                      "$ECR_REGISTRY/product-service:$IMAGE_TAG"

                    docker run -d \
                      --name "$ORDER_CONTAINER" \
                      --network "$NETWORK" \
                      -e USER_SERVICE_URL=http://user-service:3001 \
                      -e PRODUCT_SERVICE_URL=http://product-service:3002 \
                      -p 127.0.0.1:13003:3003 \
                      "$ECR_REGISTRY/order-service:$IMAGE_TAG"

                    wait_for() {
                        URL="$1"

                        for i in $(seq 1 30); do
                            if curl -fsS "$URL" >/dev/null; then
                                echo "Healthy: $URL"
                                return 0
                            fi

                            sleep 2
                        done

                        echo "Health check failed: $URL"
                        return 1
                    }

                    wait_for http://127.0.0.1:13001/health
                    wait_for http://127.0.0.1:13002/health
                    wait_for http://127.0.0.1:13003/health

                    echo "Testing APIs..."

                    curl -fsS http://127.0.0.1:13001/users
                    curl -fsS http://127.0.0.1:13002/products

                    ORDER_RESPONSE=$(curl -fsS \
                      http://127.0.0.1:13003/orders)

                    echo "$ORDER_RESPONSE"

                    echo "$ORDER_RESPONSE" | grep -q "Order Placed"

                    echo "All image tests passed."
                '''
            }
        }

        stage('Push to ECR') {
            steps {
                sh '''
                    set -e

                    echo "Logging into AWS ECR..."

                    aws ecr get-login-password \
                      --region "$AWS_REGION" |
                    docker login \
                      --username AWS \
                      --password-stdin "$ECR_REGISTRY"

                    echo "Pushing user-service..."

                    docker push "$ECR_REGISTRY/user-service:$IMAGE_TAG"

                    echo "Pushing product-service..."

                    docker push "$ECR_REGISTRY/product-service:$IMAGE_TAG"

                    echo "Pushing order-service..."

                    docker push "$ECR_REGISTRY/order-service:$IMAGE_TAG"

                    echo "ECR push completed."
                '''
            }
        }

        stage('Deploy') {
            steps {
                script {
                    // Capture currently running image references.
                    def previousUser = sh(
                        script: "docker inspect --format='{{.Config.Image}}' user-service",
                        returnStdout: true
                    ).trim()

                    def previousProduct = sh(
                        script: "docker inspect --format='{{.Config.Image}}' product-service",
                        returnStdout: true
                    ).trim()

                    def previousOrder = sh(
                        script: "docker inspect --format='{{.Config.Image}}' order-service",
                        returnStdout: true
                    ).trim()

                    echo "Previous user image: ${previousUser}"
                    echo "Previous product image: ${previousProduct}"
                    echo "Previous order image: ${previousOrder}"

                    // Persist previous images before starting deployment.
                    writeFile(
                        file: 'rollback.env',
                        text: """USER_IMAGE=${previousUser}
PRODUCT_IMAGE=${previousProduct}
ORDER_IMAGE=${previousOrder}
"""
                    )

                    // Set the new deployment image references.
                    env.USER_IMAGE =
                        "${env.ECR_REGISTRY}/user-service:${env.IMAGE_TAG}"

                    env.PRODUCT_IMAGE =
                        "${env.ECR_REGISTRY}/product-service:${env.IMAGE_TAG}"

                    env.ORDER_IMAGE =
                        "${env.ECR_REGISTRY}/order-service:${env.IMAGE_TAG}"
                }

                sh '''
                    set -e

                    echo "Pulling ECR images..."

                    docker compose -p aws-microservices-devops \
                      -f "$WORKSPACE/docker-compose.yml" pull

                    echo "Deploying microservices..."

                    docker compose -p aws-microservices-devops \
                      -f "$WORKSPACE/docker-compose.yml" \
                      up -d --no-build --remove-orphans

                    docker compose -p aws-microservices-devops \
                      -f "$WORKSPACE/docker-compose.yml" ps
                '''
            }
        }

        stage('Verify Deployment') {
            steps {
                sh '''
                    set -e

                    echo "Verifying user API..."

                    curl --retry 10 --retry-delay 3 \
                      --retry-connrefused -fsS \
                      http://127.0.0.1/api/users

                    echo "Verifying product API..."

                    curl --retry 10 --retry-delay 3 \
                      --retry-connrefused -fsS \
                      http://127.0.0.1/api/products

                    echo "Verifying order API..."

                    ORDER_RESPONSE=$(curl \
                      --retry 10 --retry-delay 3 \
                      --retry-connrefused -fsS \
                      http://127.0.0.1/api/orders)

                    echo "$ORDER_RESPONSE"

                    echo "$ORDER_RESPONSE" | grep -q "Order Placed"

                    echo "Checking container status..."

                    docker compose -p aws-microservices-devops \
                      -f "$WORKSPACE/docker-compose.yml" ps

                    echo "Deployment verified successfully."

                    echo "INTENTIONAL ROLLBACK TEST: forcing failure."
                    exit 1
                '''
            }
        }
    }

    post {

        success {
            echo "CI/CD pipeline completed successfully."
            echo "Image version: ${env.IMAGE_TAG}"
        }

        failure {
            echo "Pipeline failed."

            script {
                if (fileExists('rollback.env')) {

                    echo "Previous image references found."
                    echo "Attempting automatic rollback..."

                    def rollbackVariables =
                        readFile('rollback.env').readLines()

                    withEnv(rollbackVariables) {

                        sh '''
                            set -eu

                            echo "Pulling previous images..."

                            docker compose -p aws-microservices-devops \
                              -f "$WORKSPACE/docker-compose.yml" pull

                            echo "Restoring previous deployment..."

                            docker compose -p aws-microservices-devops \
                              -f "$WORKSPACE/docker-compose.yml" \
                              up -d --no-build

                            echo "Waiting for healthy containers..."

                            for service in user-service product-service order-service; do

                                healthy=false

                                for attempt in $(seq 1 30); do

                                    status=$(docker inspect \
                                      --format='{{.State.Health.Status}}' "$service" \
                                      2>/dev/null || echo "missing")

                                    if [ "$status" = "healthy" ]; then
                                        healthy=true
                                        break
                                    fi

                                    sleep 2
                                done

                                if [ "$healthy" != "true" ]; then
                                    echo "ROLLBACK FAILED: $service is not healthy."
                                    docker logs --tail 50 "$service" || true
                                    exit 1
                                fi

                                echo "$service is healthy."

                            done

                            echo "Verifying restored APIs..."

                            curl --retry 5 --retry-delay 2 \
                              --retry-connrefused -fsS \
                              http://127.0.0.1/api/users

                            curl --retry 5 --retry-delay 2 \
                              --retry-connrefused -fsS \
                              http://127.0.0.1/api/products

                            ORDER_RESPONSE=$(curl --retry 5 --retry-delay 2 \
                              --retry-connrefused -fsS \
                              http://127.0.0.1/api/orders)

                            echo "$ORDER_RESPONSE"

                            echo "$ORDER_RESPONSE" | grep -q "Order Placed"

                            echo "Rollback completed and verified successfully."

                            docker compose -p aws-microservices-devops \
                              -f "$WORKSPACE/docker-compose.yml" ps
                        '''
                    }

                } else {
                    echo "Rollback skipped: no previous deployment image references were saved."
                }
            }
        }

        always {
            echo "Pipeline execution finished."
        }
    }
}
