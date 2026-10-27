// ─────────────────────────────────────────────────────────────────────────────
// Pipeline del BACKEND de CelularPro              (job en Jenkins: celularpro-backend)
//
//   Entorno → Instalar dependencias → Typecheck → Pruebas y cobertura
//          → SonarQube (análisis + Quality Gate) → Build → Imagen Docker
//
// Mismo agente (Dockerfile.jenkins) y mismas etapas que el frontend. Este job
// NO despliega: lo hace el orquestador (Jenkinsfile.orquestador, en el
// frontend) cuando el back y el front pasaron todo.
//
// Plugins: Pipeline, Git, Docker Pipeline, SonarQube Scanner, JUnit, Timestamper
// ─────────────────────────────────────────────────────────────────────────────

pipeline {
    agent {
        dockerfile {
            filename 'Dockerfile.jenkins'
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
        // CI=true: Vitest genera además reports/junit.xml (ver vitest.config.ts)
        CI     = 'true'
        IMAGEN = 'celularpro-api'
    }

    stages {

        stage('Entorno') {
            steps {
                sh '''
                    node --version
                    npm --version
                    docker --version
                '''
            }
        }

        stage('Instalar dependencias') {
            steps {
                // El postinstall genera el cliente de Prisma
                sh 'npm ci --no-audit --no-fund'
            }
        }

        stage('Typecheck') {
            steps {
                sh 'npm run typecheck'
            }
        }

        stage('Pruebas y cobertura') {
            steps {
                // 426 pruebas: unitarias, escenarios de API, regresión,
                // seguridad y rendimiento. No necesitan Postgres (Prisma simulado).
                sh 'npm run test:coverage'
            }
            post {
                always {
                    junit testResults: 'reports/junit.xml', allowEmptyResults: true
                }
            }
        }

        stage('SonarQube') {
            steps {
                // Servidor 'SonarQube' configurado en Jenkins. El scanner espera
                // el Quality Gate: si no pasa, el pipeline se detiene aquí.
                withSonarQubeEnv('SonarQube') {
                    sh 'npx --yes sonarqube-scanner@5 -Dsonar.qualitygate.wait=true'
                }
            }
        }

        stage('Build') {
            steps {
                sh 'npm run build'
            }
        }

        stage('Imagen Docker') {
            steps {
                // La usa el orquestador (servicios `migraciones` y `api`)
                sh '''
                    docker build \
                        -t "$IMAGEN:$BUILD_NUMBER" \
                        -t "$IMAGEN:latest" \
                        .
                '''
            }
        }
    }

    post {
        success {
            echo "Backend OK: pruebas, SonarQube e imagen ${env.IMAGEN}:${env.BUILD_NUMBER} listos."
        }
        failure {
            echo 'Backend FALLÓ: revisa la etapa en rojo. El orquestador no despliega.'
        }
        always {
            sh 'rm -rf node_modules dist coverage reports .scannerwork'
        }
    }
}
