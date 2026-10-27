# language: es
@control-roles
Característica: Control de roles
  Como responsable de la tienda
  Quiero que solo los administradores entren al panel de administración
  Para proteger la gestión del catálogo, los pedidos y los usuarios

  Escenario: Un visitante sin sesión es enviado a iniciar sesión
    Cuando Carla abre "/admin"
    Entonces ella está en la página "/login"

  Escenario: Un cliente no puede entrar al panel de administración
    Dado que Carla ya tiene una cuenta con la contraseña "Segura123"
    Y que ella ingresó a su panel con la contraseña "Segura123"
    Cuando ella abre "/admin"
    Entonces ella ve la página "Acceso no autorizado"

  Escenario: El administrador convierte a un cliente en administrador
    Dado que Carla ya tiene una cuenta con la contraseña "Segura123"
    Y que Andrés ingresó como administrador
    Cuando él cambia el rol de Carla a administrador
    Y Carla ingresa a su panel con la contraseña "Segura123"
    Y ella abre "/admin"
    Entonces ella ve el panel de administración

  Escenario: El administrador le quita el rol a otro administrador
    Dado que Carla ya tiene una cuenta con la contraseña "Segura123"
    Y que Andrés ingresó como administrador
    Y que él cambió el rol de Carla a administrador
    Cuando él cambia el rol de Carla a cliente
    Y Carla ingresa a su panel con la contraseña "Segura123"
    Y ella abre "/admin"
    Entonces ella ve la página "Acceso no autorizado"
