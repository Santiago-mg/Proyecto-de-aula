#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# enable-remote-access.sh — Abre el Postgres local a la red para el equipo.
#
#   ⚠️  NO EJECUTAR A CIEGAS. Lee esto primero.
#
# Estado de fábrica de Postgres.app (el que tienes ahora):
#   listen_addresses = localhost   → solo tu Mac puede conectarse
#   pg_hba.conf      = trust       → CUALQUIERA que alcance el puerto entra
#                                     como CUALQUIER rol, SIN contraseña.
#
# Esas dos cosas juntas son seguras solo porque la primera tapa a la segunda.
# En cuanto abres la red, `trust` se vuelve una puerta abierta. Por eso este
# script hace SIEMPRE las dos cosas a la vez: abre la red Y exige contraseña.
#
# Qué hace exactamente:
#   1. Respalda postgresql.conf y pg_hba.conf con fecha.
#   2. listen_addresses = '*'  (acepta conexiones de red)
#   3. Exige scram-sha-256 a todo lo que venga de fuera del equipo,
#      limitado a rangos privados: LAN + Tailscale. NO abre a 0.0.0.0/0.
#   4. Deja el socket local en `trust` para no romper tus herramientas.
#
# Requiere reiniciar Postgres.app al terminar (listen_addresses no se recarga).
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

PGDATA="${PGDATA:-$HOME/Library/Application Support/Postgres/var-18}"
HBA="$PGDATA/pg_hba.conf"
CONF="$PGDATA/postgresql.conf"
STAMP="$(date +%Y%m%d_%H%M%S)"

[ -f "$HBA" ]  || { echo "No encuentro $HBA"; exit 1; }
[ -f "$CONF" ] || { echo "No encuentro $CONF"; exit 1; }

echo "==> Respaldos"
cp "$HBA"  "$HBA.bak.$STAMP"
cp "$CONF" "$CONF.bak.$STAMP"
echo "    $HBA.bak.$STAMP"
echo "    $CONF.bak.$STAMP"

echo "==> listen_addresses = '*'"
if grep -qE "^\s*listen_addresses" "$CONF"; then
  sed -i '' "s|^\s*listen_addresses.*|listen_addresses = '*'|" "$CONF"
else
  printf "\nlisten_addresses = '*'\n" >> "$CONF"
fi

echo "==> Reglas de autenticación para la red"
if ! grep -q "CelularPro equipo" "$HBA"; then
  cat >> "$HBA" <<'RULES'

# ─── CelularPro equipo — acceso remoto con contraseña obligatoria ───────────
# scram-sha-256 = la contraseña se verifica de verdad (a diferencia de trust).
# Solo rangos privados: LAN doméstica/universitaria y Tailscale (100.64/10).
host    celularpro      all             10.0.0.0/8              scram-sha-256
host    celularpro      all             172.16.0.0/12           scram-sha-256
host    celularpro      all             192.168.0.0/16          scram-sha-256
host    celularpro      all             100.64.0.0/10           scram-sha-256
RULES
fi

echo
echo "==> Hecho. Reinicia Postgres.app para que tome listen_addresses."
echo
echo "    ⚠️  TRAMPA IMPORTANTE: si usas un túnel que termina en 127.0.0.1"
echo "        (ngrok tcp, socat, ssh -L), las conexiones llegan como loopback"
echo "        y caen en la regla 'trust' de fábrica → entran SIN contraseña."
echo "        Si vas por esa vía, cambia también estas dos líneas del pg_hba:"
echo "          host all all 127.0.0.1/32  trust   →   scram-sha-256"
echo "          host all all ::1/128       trust   →   scram-sha-256"
echo "        y antes ponle contraseña a tu rol: ALTER ROLE $(whoami) PASSWORD '...';"
echo "        (si no, te quedas fuera de tu propia base)."
echo
echo "    Revertir todo:"
echo "      cp '$HBA.bak.$STAMP' '$HBA'"
echo "      cp '$CONF.bak.$STAMP' '$CONF'"
