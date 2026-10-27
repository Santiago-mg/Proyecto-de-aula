# language: es
@registro
Característica: Registro de usuario
  Como visitante de CelularPro
  Quiero crear una cuenta
  Para comprar y seguir mis pedidos

  @smoke
  Escenario: Crear una cuenta nueva
    Cuando Carla se registra con el nombre "Carla Rojas" y la contraseña "Segura123"
    Entonces ella ve su panel con el saludo "Hola, Carla"
    Y el menú muestra su nombre "Carla"

  Escenario: El correo ya tiene una cuenta
    Dado que Carla ya tiene una cuenta con la contraseña "Segura123"
    Cuando ella intenta registrarse otra vez con el mismo correo
    Entonces ella ve el error del servidor "El email ya está registrado"
    Y ella sigue en la página "/register"
