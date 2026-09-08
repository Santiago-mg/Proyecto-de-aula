# Guía del equipo — Base de datos CelularPro

La base es **una sola, compartida**, alojada en el PostgreSQL local de Santiago.
Todos trabajan contra los mismos datos: lo que uno inserta, los demás lo ven.

## Cómo funcionan los permisos

```
celularpro_dev   ← rol de GRUPO. Dueño de la base y de las 8 tablas.
    ├── dev1     ← rol de login con contraseña propia
    ├── dev2
    └── dev3
```

Cada persona entra con su usuario y, al conectarse, la sesión adopta
automáticamente el rol de grupo. Consecuencias prácticas:

- Todos pueden hacer CRUD completo y correr migraciones de Prisma.
- Lo que cualquiera cree queda a nombre del grupo, no de la persona, así que
  nadie termina con tablas que los demás no puedan modificar.
- Sacar a alguien del proyecto es borrar su rol: `DROP ROLE dev2;`. Los datos
  no se tocan.

El grupo tiene control total **sobre la base `celularpro` únicamente**. No es
superusuario del servidor: no puede borrar otras bases ni leer credenciales
del sistema. Para lo que hace este proyecto, no le falta nada.

## Puesta en marcha

1. Pídele a Santiago tu usuario y contraseña (están en `team-credentials.txt`,
   que no se sube a git — se entregan uno a uno por canal privado).

2. Copia el ejemplo de variables y completa lo tuyo:

```bash
cp .env.example .env
```

En `DATABASE_URL` pon tu usuario, tu contraseña y el HOST correcto
(`127.0.0.1` si estás en la misma máquina; la IP de Santiago si es por red).

3. Instala y genera el cliente de Prisma:

```bash
npm install && npx prisma generate
```

4. Levanta la API:

```bash
npm run dev
```

Comprueba que responde: `curl http://localhost:3001/health`

## Cuenta de prueba

```
admin@celularpro.co / admin1234   (rol ADMIN)
```

## El front necesita su propio `.env` (si no, sale en negro)

En `Proyecto-de-aula-front`, `.env` está en `.gitignore`, así que **no viene con el
clon**. Sin él, `VITE_API_URL` queda `undefined`, axios usa rutas relativas y las
peticiones caen en el servidor de Vite en vez de la API. Vite responde con el
`index.html` y un `200 OK` engañoso; el front intenta leer ese HTML como JSON,
revienta y la pantalla queda en negro.

```bash
cd ../Proyecto-de-aula-front
cp .env.example .env
```

Debe quedar así:

```
VITE_API_URL=http://localhost:3001/api/v1
```

Las variables `VITE_*` se leen **al arrancar**: si creas o editas el `.env` con
Vite corriendo, hay que reiniciarlo. Y la API tiene que estar arriba en el 3001.

## Si cambias el esquema

Editas `prisma/schema.prisma` y luego:

```bash
npx prisma migrate dev --name descripcion_del_cambio
```

Como la base es compartida, **la migración le cae a todo el equipo de una vez**.
Avisa antes de correr una que borre o renombre columnas. Sube siempre la carpeta
de `prisma/migrations/` que se genera.

## Scripts de administración

| Script | Para qué |
|---|---|
| `scripts/setup-team-db.sh nombre1 nombre2` | Crea/rota los roles del equipo y regenera `team-credentials.txt` |
| `scripts/enable-remote-access.sh` | Abre el Postgres a la red exigiendo contraseña. Léelo antes de correrlo |

## Reglas

- `team-credentials.txt` y `.env` **nunca** se suben a git (ya están ignorados).
- Contraseña por persona. No compartan una sola entre todos: así se sabe quién
  hizo qué y se puede revocar a uno sin afectar a los demás.
- La base vive en un portátil: si Santiago la apaga o cambia de red, nadie se
  conecta. Para algo más estable habría que mover la base a un servicio
  gestionado.
