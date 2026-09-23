#!/bin/bash
# Mide el CPU consumido por endpoint, de verdad.
#
# El metodo de "top -pid X" no sirve aqui: cada peticion dura 6-60 ms y en la
# ventana de 1 segundo que muestrea top el proceso esta ocioso casi todo el
# tiempo, asi que siempre sale 0.0%. Lo que se mide aqui es el tiempo de CPU
# ACUMULADO del proceso de Node a lo largo de una rafaga de N peticiones, que
# es un dato real y reproducible.
#
# Antes de correrlo:
#   1. Levanta el servidor en otra terminal:  npm run dev
#   2. Ten Postgres corriendo con datos sembrados
#   3. Rellena EMAIL y PASSWORD de un usuario ADMIN
#
# Uso: ./medir-cpu.sh

set -e

API="http://localhost:3000/api/v1"
EMAIL="admin@celularpro.com"     # <-- cambia por tu admin
PASSWORD="tu_password"           # <-- cambia por tu password
N=500                            # peticiones por endpoint

# ── PID del proceso de Node que atiende la API ────────────────────────
PID=$(lsof -ti tcp:3000 | head -1)
if [ -z "$PID" ]; then
  echo "No encontre nada escuchando en el puerto 3000. Levanta el servidor con: npm run dev"
  exit 1
fi
echo "Proceso de Node: PID $PID"

# ── token de admin ────────────────────────────────────────────────────
TOKEN=$(curl -s -X POST "$API/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" \
  | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')

if [ -z "$TOKEN" ]; then
  echo "No pude iniciar sesion. Revisa EMAIL y PASSWORD arriba."
  exit 1
fi

# ── tiempo de CPU acumulado del proceso, en centesimas de segundo ─────
cpu_centesimas() {
  ps -o cputime= -p "$PID" | tr -d ' ' | awk -F: '
    NF==2 { split($2, s, "."); print ($1*60 + s[1])*100 + s[2] }
    NF==3 { split($3, s, "."); print ($1*3600 + $2*60 + s[1])*100 + s[2] }'
}

medir() {
  local etiqueta="$1"; shift
  # calentamiento: que V8 compile en caliente antes de contar
  for _ in $(seq 20); do curl -s -o /dev/null "$@" || true; done

  local antes despues delta ms_por_peticion
  antes=$(cpu_centesimas)
  for _ in $(seq $N); do curl -s -o /dev/null "$@" || true; done
  despues=$(cpu_centesimas)

  delta=$((despues - antes))                          # centesimas de segundo
  ms_por_peticion=$(echo "scale=2; $delta * 10 / $N" | bc)
  # a un ritmo de 1 peticion por segundo, el % de un nucleo es ms/1000*100
  local porcentaje
  porcentaje=$(echo "scale=3; $ms_por_peticion / 10" | bc)

  printf '%-42s %7s ms de CPU/peticion   %6s %% de un nucleo (a 1 pet/s)\n' \
    "$etiqueta" "$ms_por_peticion" "$porcentaje"
}

echo
echo "Midiendo $N peticiones por endpoint..."
echo

AUTH="-H Authorization:Bearer $TOKEN"

medir "28 - Consultar usuarios"    $AUTH "$API/admin/users"
medir "29 - Panel de estadisticas" $AUTH "$API/admin/stats"
medir "13 - Recomendacion"         "$API/phones/iphone-13-pro/similares?limit=4"

echo
echo "Para 26 (banear), 27 (desbanear) y 30 (crear/actualizar/eliminar) hace"
echo "falta un id de usuario y un celular de prueba: usa los mismos que usaste"
echo "para medir los tiempos de respuesta con curl y agregalos aqui con el"
echo "mismo patron (medir \"26 - Banear usuario\" -X PUT ... )."
