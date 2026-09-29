// ─────────────────────────────────────────────────────────────────────────────
// Pipeline del BACKEND de CelularPro            (job en Jenkins: celularpro-backend)
//
//   Entorno → Instalar dependencias → Typecheck → Pruebas y cobertura
//          → SonarQube (análisis + Quality Gate) → Build → Imagen Docker
//
// - Corre dentro del agente de Dockerfile.jenkins (idea de Andrés): la máquina
//   de Jenkins solo necesita Docker.
// - Las pruebas son la suite de todo el equipo (tests/unit + tests/escenarios)
//   y usan un doble de Prisma: no hace falta base de datos.
// - Este job NO despliega. El despliegue (Docker + Vercel) lo hace el
//   orquestador (Jenkinsfile.orquestador, en el repo del front) solo cuando el
//   back y el front pasaron todo.
//
// Plugins: Pipeline, Git, Docker Pipeline, SonarQube Scanner, JUnit, Timestamper
// ─────────────────────────────────────────────────────────────────────────────

pipeline {
    agent {
        dockerfile {
            filename 'Dockerfile.jenkins'
            // Socket de Docker del host: para construir la imagen de la API.
            // -u root: para poder usar ese socket dentro del contenedor.
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
                // npm ci también corre `prisma generate` (postinstall).
                sh 'npm ci --no-audit --no-fund'
            }
        }

        stage('Typecheck') {
            steps {
                // Revisa los tipos de src/ y también de tests/.
                sh 'npm run typecheck'
            }
        }

        stage('Pruebas y cobertura') {
            steps {
                // Esta es la suite de regresión: se corre completa en cada
                // cambio. Si una sola prueba falla, el pipeline se detiene aquí.
                sh '''
                    npx vitest run --coverage \
                        --reporter=default \
                        --reporter=junit \
                        --outputFile.junit=reports/junit.xml
                '''
            }
            post {
                always {
                    // Pestaña "Test Result" del build, con cada prueba.
                    junit testResults: 'reports/junit.xml', allowEmptyResults: true
                }
            }
        }

        stage('SonarQube') {
            steps {
                // 'SonarQube' es el servidor configurado en Manage Jenkins →
                // System (el mismo nombre que usa el pipeline de Andrés).
                // withSonarQubeEnv le entrega al scanner la URL y el token.
                //
                // sonar.qualitygate.wait=true: el scanner espera el resultado
                // del Quality Gate y, si no pasa, la etapa falla y no se sigue.
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
                // La usa el orquestador para levantar la app con Docker.
                sh 'docker build -t "$IMAGEN:$BUILD_NUMBER" -t "$IMAGEN:latest" .'
            }
        }
    }

    post {
        success {
            echo "Backend OK: pruebas, SonarQube e imagen ${env.IMAGEN}:${env.BUILD_NUMBER} listos."
        }
        failure {
            echo 'Backend FALLÓ: revisa la etapa en rojo. El orquestador no sigue con el front.'
        }
        always {
            // Borra lo que generó esta corrida. Va con sh para que corra dentro
            // del contenedor como root, que es quien creó esos archivos.
            sh 'rm -rf node_modules dist coverage reports .scannerwork'
        }
    }
}
