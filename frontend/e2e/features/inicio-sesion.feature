# language: es
@inicio-sesion
Característica: Inicio de sesión
  Como cliente registrado
  Quiero ingresar con mi correo y contraseña
  Para acceder a mi cuenta

  Antecedentes:
    Dado que Carla ya tiene una cuenta con la contraseña "Segura123"

  @smoke
  Escenario: Ingreso con credenciales correctas
    Cuando ella inicia sesión con la contraseña "Segura123"
    Entonces ella ve su panel con el saludo "Hola, Carla"

  Escenario: Ingreso escribiendo el correo con mayúsculas
    Cuando ella inicia sesión escribiendo su correo en mayúsculas y la contraseña "Segura123"
    Entonces ella ve su panel con el saludo "Hola, Carla"

  Escenario: Cerrar sesión
    Dado que ella ingresó a su panel con la contraseña "Segura123"
    Cuando ella cierra la sesión
    Entonces ella está en la página "/login"
    Y al abrir "/dashboard" la aplicación la devuelve a "/login"
