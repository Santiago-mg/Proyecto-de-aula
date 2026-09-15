#!/bin/bash
# Analisis de SonarQube limitado a las 6 funcionalidades de Santiago:
# 13 (recomendacion), 26 (banear), 27 (desbanear), 28 (consultar usuarios),
# 29 (panel estadisticas), 30 (administracion de catalogo).
#
# Uso: SONAR_TOKEN=tu_token ./sonar-santiago.sh

set -e

TESTS=(
  tests/escenarios/esc-13-recomendacion-productos.test.ts
  tests/escenarios/esc-26-banear-usuario.test.ts
  tests/escenarios/esc-27-desbanear-usuario.test.ts
  tests/escenarios/esc-28-consultar-usuarios.test.ts
  tests/escenarios/esc-29-panel-estadisticas.test.ts
  tests/escenarios/esc-30-administracion-catalogo.test.ts
  tests/unit/catalogo/recomendaciones.test.ts
  tests/unit/catalogo/phones.use-cases.test.ts
  tests/unit/control-roles/admin.use-cases.test.ts
  tests/unit/gestion-perfil/ban.controller.test.ts
  tests/unit/gestion-perfil/unban.controller.test.ts
)

npx prisma generate

# Corre SOLO estos 11 archivos de test, para que el lcov.info (y por lo
# tanto el % de cobertura que ve Sonar) salga unicamente de tus pruebas y
# no arrastre cobertura generada por pruebas de otras funcionalidades que
# comparten archivo (ej. changeUserRole.use-case.test.ts tocando lineas de
# admin.use-cases.ts).
npx vitest run --coverage "${TESTS[@]}"

npx --yes sonarqube-scanner \
  -Dsonar.projectKey=CelularPro-Backend-Santiago \
  -Dsonar.projectName="CelularPro API - Funcionalidades Santiago (13, 26-30)" \
  -Dsonar.inclusions="src/domain/recomendaciones.ts,src/application/use-cases/phones.use-cases.ts,src/application/use-cases/admin.use-cases.ts,src/application/dtos/admin.dto.ts,src/application/dtos/phone.dto.ts,src/infrastructure/repositories/AdminRepository.ts,src/infrastructure/repositories/PhoneRepository.ts,src/infrastructure/repositories/phone-mapper.ts,src/interface/controllers/admin.controller.ts,src/interface/controllers/phones.controller.ts,src/interface/routes/admin.routes.ts,src/interface/routes/phones.routes.ts,src/interface/middlewares/validate.middleware.ts" \
  -Dsonar.test.inclusions="tests/escenarios/esc-13-recomendacion-productos.test.ts,tests/escenarios/esc-26-banear-usuario.test.ts,tests/escenarios/esc-27-desbanear-usuario.test.ts,tests/escenarios/esc-28-consultar-usuarios.test.ts,tests/escenarios/esc-29-panel-estadisticas.test.ts,tests/escenarios/esc-30-administracion-catalogo.test.ts,tests/unit/catalogo/recomendaciones.test.ts,tests/unit/catalogo/phones.use-cases.test.ts,tests/unit/control-roles/admin.use-cases.test.ts,tests/unit/gestion-perfil/ban.controller.test.ts,tests/unit/gestion-perfil/unban.controller.test.ts"
