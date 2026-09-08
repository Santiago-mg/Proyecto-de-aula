#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# setup-team-db.sh — Crea los roles de acceso a la base `celularpro`.
#
# Modelo de permisos:
#   celularpro_dev  → rol de GRUPO (NOLOGIN). Es el DUEÑO de la base y del
#                     esquema public. Concentra todos los privilegios.
#   <cada persona>  → rol de LOGIN con contraseña propia, miembro del grupo.
#
# Cada miembro hace `SET ROLE celularpro_dev` automáticamente al conectarse,
# así que todo lo que cree (tablas de migraciones incluidas) queda a nombre
# del grupo y no de la persona. Resultado: todos ven y modifican lo mismo,
# y revocar a alguien es borrar su rol, sin tocar los datos.
#
# Uso:
#   ./scripts/setup-team-db.sh santiago_dev maria_dev carlos_dev
#   (sin argumentos usa dev1 dev2 dev3)
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

export PATH="/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH"

DB_NAME="${DB_NAME:-celularpro}"
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-5432}"
ADMIN_USER="${ADMIN_USER:-$(whoami)}"
GROUP_ROLE="celularpro_dev"

MEMBERS=("$@")
if [ ${#MEMBERS[@]} -eq 0 ]; then
  MEMBERS=(dev1 dev2 dev3)
fi

OUT_FILE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/team-credentials.txt"

psqlx() { psql -h "$DB_HOST" -p "$DB_PORT" -U "$ADMIN_USER" -v ON_ERROR_STOP=1 "$@"; }

# Contraseña alfanumérica: evita %-encoding en la DATABASE_URL.
# Sin `head` en el pipe: cerrarlo temprano manda SIGPIPE y aborta el script.
genpass() {
  local raw
  raw="$(openssl rand -base64 48 | LC_ALL=C tr -dc 'A-Za-z0-9')"
  printf '%s' "${raw:0:24}"
}

echo "==> Creando rol de grupo '$GROUP_ROLE' y traspasando propiedad de '$DB_NAME'"
psqlx -d postgres -q <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '$GROUP_ROLE') THEN
    CREATE ROLE $GROUP_ROLE NOLOGIN;
  END IF;
END
\$\$;
ALTER DATABASE $DB_NAME OWNER TO $GROUP_ROLE;
SQL

psqlx -d "$DB_NAME" -q <<SQL
ALTER SCHEMA public OWNER TO $GROUP_ROLE;

-- Privilegios sobre la base y el esquema
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $GROUP_ROLE;
GRANT ALL PRIVILEGES ON SCHEMA public TO $GROUP_ROLE;

-- Todo lo que YA existe
GRANT ALL PRIVILEGES ON ALL TABLES    IN SCHEMA public TO $GROUP_ROLE;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $GROUP_ROLE;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO $GROUP_ROLE;

-- Todo lo que se CREE A FUTURO (nuevas migraciones de Prisma)
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL PRIVILEGES ON TABLES    TO $GROUP_ROLE;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL PRIVILEGES ON SEQUENCES TO $GROUP_ROLE;
SQL

{
  echo "# ─────────────────────────────────────────────────────────────"
  echo "# CREDENCIALES DE BASE DE DATOS — CelularPro"
  echo "# Generado: $(date '+%Y-%m-%d %H:%M:%S')"
  echo "#"
  echo "# ⚠️  ESTE ARCHIVO NO SE SUBE A GIT (está en .gitignore)."
  echo "#     Entrega cada credencial por un canal privado, una por persona."
  echo "# ─────────────────────────────────────────────────────────────"
  echo
} > "$OUT_FILE"

for MEMBER in "${MEMBERS[@]}"; do
  PASS="$(genpass)"
  echo "==> Rol de login: $MEMBER"
  psqlx -d "$DB_NAME" -q <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '$MEMBER') THEN
    CREATE ROLE $MEMBER LOGIN PASSWORD '$PASS';
  ELSE
    ALTER ROLE $MEMBER LOGIN PASSWORD '$PASS';
  END IF;
END
\$\$;

GRANT CONNECT ON DATABASE $DB_NAME TO $MEMBER;
GRANT $GROUP_ROLE TO $MEMBER;

-- Al conectarse, la sesión adopta el rol de grupo automáticamente:
-- lo que cree queda a nombre del grupo y es visible/editable por todos.
ALTER ROLE $MEMBER IN DATABASE $DB_NAME SET ROLE $GROUP_ROLE;
SQL

  {
    echo "Usuario:  $MEMBER"
    echo "Password: $PASS"
    echo "URL:      postgresql://$MEMBER:$PASS@\${HOST}:$DB_PORT/$DB_NAME"
    echo
  } >> "$OUT_FILE"
done

chmod 600 "$OUT_FILE"

echo
echo "==> Listo. Credenciales escritas en: $OUT_FILE (permisos 600)"
echo "==> Reemplaza \${HOST} por la IP/hostname con que cada quien te alcance."
