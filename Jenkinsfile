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
        IMAGE_NAME = 'celular_pro_api:latest'
        CONTAINER_NAME = 'celular-pro-api'
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

                    cp .env.example .env
                    npm ci

        		    service postgresql start

                    sed -i 's/local   all             all                                     peer/local   all             all                                     md5/' /etc/postgresql/14/main/pg_hba.conf

                    service postgresql restart

                    su - postgres << 'EOF'
                        psql -c "CREATE USER user WITH PASSWORD 'password' CREATEDB;"
                    EOF

                    echo "password" | su - root

                    sed -i 's|DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/celularpro"|DATABASE_URL="postgresql://celularproapi:password@127.0.0.1:5432/celularpro"|' .env


                    sed -i 's/JWT_SECRET=cambia_esto_por_una_clave_aleatoria_segura/JWT_SECRET=ilwkfwufrfr/' .env

                    npx prisma migrate dev --name init
                    npm run db:seed
                '''
            }
        }

        stage('Tesing and coverage') {
            steps {
                sh '''
                    set -e

                    npm run test
                    npm run test:coverage
                '''
            }
        }

        stage('SonarQube Analysis') {
            steps {
                sh '''
                    withSonarQubeEnv('SonarQube') {
                        set -e

                        sonar-scanner
                    }
                '''
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
