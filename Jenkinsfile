pipeline {
    agent {
        dockerfile {
            filename 'Dockerfile'
            args '-v /var/run/docker.sock:/var/run/docker.sock -u root'
        }
    }

    options {
        timestamps()
        disableConcurrentBuilds()
        timeout(time: 30, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }

    environment {
        SONAR_PROJECT_KEY = 'andresmendoza59_celular-pro-api'
        SONAR_PROJECT_NAME = 'celular-pro-api'
        IMAGE_NAME = 'celular_pro_api'
        CONTAINER_NAME = 'celular-pro-api'
        DATABASE_URL = 'postgresql://celularproapi:password@127.0.0.1:5432/celularpro'
        JWT_SECRET = 'ilwkfwufrfr'
    }

    stages {
        stage('Verify environment') {
            steps {
                sh '''
                    set -e

                    node --version
                    npm --version
                    psql --version
                '''
            }
        }

        stage('Install dependencies') {
            steps {
                sh '''
                    set -e

                    # Create .env file from example
                    if [ -f .env.example ]; then
                        cp .env.example .env
                    else
                        echo "ERROR: .env.example not found in workspace"
                        exit 1
                    fi

                    # Verify .env was created
                    if [ ! -f .env ]; then
                        echo "ERROR: Failed to create .env file"
                        exit 1
                    fi

                    npm ci

                    # Start PostgreSQL service
                    service postgresql start || true
                    sleep 3

                    # Restart PostgreSQL to apply changes
                    service postgresql restart
                    sleep 3

                    cat > /tmp/setup.sql << 'EOF'
CREATE USER celularproapi WITH PASSWORD 'password' CREATEDB;
CREATE DATABASE celularpro OWNER celularproapi;
EOF

                    # 4. Run as postgres user
                    su postgres -c "psql -f /tmp/setup.sql"

                    # 5. Cleanup
                    rm /tmp/setup.sql

                    # Update .env file with database credentials
                    sed -i "s|DATABASE_URL=.*|DATABASE_URL=\"postgresql://celularproapi:password@127.0.0.1:5432/celularpro\"|g" .env

                    # Update JWT secret
                    sed -i "s/JWT_SECRET=.*/JWT_SECRET=ilwkfwufrfr/g" .env

                    # Verify .env was updated correctly
                    echo "=== .env file content ==="
                    cat .env
                    echo "=========================="

                    # Run database migrations and seed
                    npx prisma migrate dev --name init
                    npm run db:seed
                '''
            }
        }

        stage('Testing and coverage') {
            steps {
                sh '''
                    set -e

                    npm run test
                    npm run test:coverage
                '''
            }
        }

        stage('SonarQube Analysis') {
            agent {
                docker {
                    image 'sonarsource/sonar-scanner-cli:latest'
                    args '-v "${WORKSPACE}:/workspace" -v /var/run/docker/.sock:/var/run/docker.sock -u root'
                    reuseNode true
                }
            }
            steps {
                withSonarQubeEnv('SonarQube') {
                    sh '''
                        set -e
                        cd /workspace
                        sonar-scanner \
                            -Dsonar.projectKey=$SONAR_PROJECT_KEY \
                            -Dsonar.projectName="$SONAR_PROJECT_NAME" \
                            -Dsonar.sources=backend,frontend \
                            -Dsonar.host.url=$SONAR_HOST_URL \
                            -Dsonar.login=$SONAR_AUTH_TOKEN
                    '''
                }
            }
        }

        stage('Quality Gate') {
            steps {
                timeout(time: 5, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                sh '''
                    set -e
                    docker build \
                        --pull \
                        -t "$IMAGE_NAME:$BUILD_NUMBER" \
                        -t "$IMAGE_NAME:latest" \
                        .
                '''
            }
        }

        stage('Deploy API') {
            steps {
                sh '''
                    set -e

                    docker rm -f "$CONTAINER_NAME" \
                        2>/dev/null || true

                    docker run -d \
                        --name "$CONTAINER_NAME" \
                        --restart unless-stopped \
                        -p 8000:8000 \
                        "$IMAGE_NAME:$BUILD_NUMBER"
                '''
            }
        }

        stage('Verify API') {
            steps {
                sh '''
                    set -e

                    for attempt in $(seq 1 12); do
                        HEALTH_STATUS=$(docker inspect \
                            --format='{{.State.Health.Status}}' \
                            "$CONTAINER_NAME" \
                            2>/dev/null || true)

                        echo "Estado: $HEALTH_STATUS"

                        if [ "$HEALTH_STATUS" = "healthy" ]; then
                            exit 0
                        fi

                        if [ "$HEALTH_STATUS" = "unhealthy" ]; then
                            docker logs "$CONTAINER_NAME"
                            exit 1
                        fi

                        sleep 5
                    done

                    docker logs "$CONTAINER_NAME"
                    echo "El contenedor no alcanzo el estado healthy."
                    exit 1
                '''
            }
        }
    }
}
