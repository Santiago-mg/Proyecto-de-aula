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
                    npm ci

        		    service postgresql start

                    psql -U postgres -c "CREATE USER celularproapi WITH PASSWORD 'password' CREATEDB;"

                    cp .env.example .env
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
    }
}
