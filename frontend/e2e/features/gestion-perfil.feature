# language: es
@gestion-perfil
Característica: Gestión de perfil
  Como cliente
  Quiero actualizar mi nombre y mi contraseña
  Para mantener mi cuenta al día y segura

  Antecedentes:
    Dado que Carla ya tiene una cuenta con la contraseña "Segura123"
    Y que ella ingresó a su panel con la contraseña "Segura123"

  @smoke
  Escenario: Cambiar el nombre
    Cuando ella cambia su nombre a "Valentina Rojas"
    Entonces ella ve la confirmación "Nombre actualizado"
    Y el menú muestra su nombre "Valentina"

  Escenario: Cambiar la contraseña y volver a ingresar con la nueva
    Cuando ella cambia su contraseña "Segura123" por "Nueva4567"
    Entonces ella ve la confirmación "Contraseña actualizada"
    Cuando ella cierra la sesión
    Y ella inicia sesión con la contraseña "Nueva4567"
    Entonces ella ve su panel con el saludo "Hola, Carla"

  Escenario: La contraseña anterior deja de funcionar
    Cuando ella cambia su contraseña "Segura123" por "Nueva4567"
    Y ella cierra la sesión
    Y ella inicia sesión con la contraseña "Segura123"
    Entonces ella ve el error del servidor "Credenciales inválidas"

  Escenario: La contraseña actual es incorrecta
    Cuando ella cambia su contraseña "Otra12345" por "Nueva4567"
    Entonces ella ve el error del servidor "La contraseña actual no es correcta"
    Y ella sigue en la página "/profile"
