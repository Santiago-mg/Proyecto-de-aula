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
        DB_CONTAINER_NAME = 'celular-pro-db'
        DOCKER_NETWORK = 'celular-pro-net'
        API_PORT = '8000'
        DB_NAME = 'celularpro'
        DB_USER = 'celularproapi'
        DB_PASSWORD = 'password'
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
            steps {
                withSonarQubeEnv('SonarQube') {
                    sh '''
                        set -e
                        sonar-scanner
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
                    # OJO: se usa Dockerfile.app, NO el Dockerfile de la raiz.
                    # El Dockerfile de la raiz define el AGENTE de Jenkins
                    # (Node + PostgreSQL + sonar-scanner), no la aplicacion.
                    docker build \
                        --pull \
                        -f Dockerfile.app \
                        -t "$IMAGE_NAME:$BUILD_NUMBER" \
                        -t "$IMAGE_NAME:latest" \
                        .
                '''
            }
        }

        stage('Deploy Database') {
            steps {
                sh '''
                    set -e

                    # Red compartida: la API y Postgres se resuelven por nombre.
                    docker network inspect "$DOCKER_NETWORK" >/dev/null 2>&1 \
                        || docker network create "$DOCKER_NETWORK"

                    docker rm -f "$DB_CONTAINER_NAME" 2>/dev/null || true

                    docker run -d \
                        --name "$DB_CONTAINER_NAME" \
                        --restart unless-stopped \
                        --network "$DOCKER_NETWORK" \
                        -e POSTGRES_USER="$DB_USER" \
                        -e POSTGRES_PASSWORD="$DB_PASSWORD" \
                        -e POSTGRES_DB="$DB_NAME" \
                        postgres:16-alpine

                    for i in $(seq 1 30); do
                        if docker exec "$DB_CONTAINER_NAME" \
                            pg_isready -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1
                        then
                            echo "PostgreSQL listo (${i}s)"
                            exit 0
                        fi
                        sleep 1
                    done

                    docker logs "$DB_CONTAINER_NAME"
                    echo "PostgreSQL no respondio a tiempo."
                    exit 1
                '''
            }
        }

        stage('Apply Migrations') {
            steps {
                sh '''
                    set -e

                    # `prisma migrate deploy` desde la imagen de la API, con la
                    # DB alcanzable por el hostname del contenedor en la red.
                    docker run --rm \
                        --network "$DOCKER_NETWORK" \
                        -e DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_CONTAINER_NAME:5432/$DB_NAME" \
                        "$IMAGE_NAME:$BUILD_NUMBER" \
                        prisma migrate deploy
                '''
            }
        }

        stage('Deploy API') {
            steps {
                sh '''
                    set -e

                    docker rm -f "$CONTAINER_NAME" \
                        2>/dev/null || true

                    # DATABASE_URL apunta al nombre del contenedor de Postgres,
                    # no a 127.0.0.1: dentro de la red, 127.0.0.1 seria la
                    # propia API. El Postgres del agente (stage "Install
                    # dependencies") solo se usa para tests y migraciones de CI.
                    docker run -d \
                        --name "$CONTAINER_NAME" \
                        --restart unless-stopped \
                        --network "$DOCKER_NETWORK" \
                        -p "$API_PORT:$API_PORT" \
                        -e NODE_ENV=production \
                        -e PORT="$API_PORT" \
                        -e DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_CONTAINER_NAME:5432/$DB_NAME" \
                        -e JWT_SECRET="$JWT_SECRET" \
                        -e JWT_EXPIRES_IN=7d \
                        -e FRONTEND_URL=http://localhost:5173 \
                        "$IMAGE_NAME:$BUILD_NUMBER"
                '''
            }
        }

        stage('Verify API') {
            steps {
                sh '''
                    set -e

                    for attempt in $(seq 1 18); do
                        HEALTH_STATUS=$(docker inspect \
                            --format='{{.State.Health.Status}}' \
                            "$CONTAINER_NAME" \
                            2>/dev/null || true)

                        echo "Intento $attempt — Estado: ${HEALTH_STATUS:-<sin healthcheck>}"

                        if [ "$HEALTH_STATUS" = "healthy" ]; then
                            # El HEALTHCHECK ya proboa /health, pero se repite
                            # aqui desde el host para confirmar el puerto publicado.
                            curl -fsS "http://127.0.0.1:$API_PORT/health"
                            echo
                            echo "API desplegada y saludable en el puerto $API_PORT."
                            exit 0
                        fi

                        if [ "$HEALTH_STATUS" = "unhealthy" ]; then
                            echo "El contenedor quedo unhealthy."
                            docker logs "$CONTAINER_NAME"
                            exit 1
                        fi

                        # El contenedor puede morir antes de tener healthcheck.
                        if [ "$(docker inspect --format='{{.State.Running}}' "$CONTAINER_NAME" 2>/dev/null || echo false)" != "true" ]; then
                            echo "El contenedor no esta corriendo."
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
