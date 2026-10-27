# language: es
@validacion-credenciales
Característica: Validación de credenciales
  Como responsable de la tienda
  Quiero que las credenciales se validen igual en el navegador y en el servidor
  Para que las cuentas sean seguras y los errores se entiendan

  Escenario: Contraseña incorrecta
    Dado que Carla ya tiene una cuenta con la contraseña "Segura123"
    Cuando ella inicia sesión con la contraseña "Equivocada1"
    Entonces ella ve el error del servidor "Credenciales inválidas"
    Y ella sigue en la página "/login"

  Esquema del escenario: Contraseña que no cumple la política
    Cuando Carla se registra con el nombre "Carla Rojas" y la contraseña "<contraseña>"
    Entonces ella ve el aviso del campo "<mensaje>"
    Y ella sigue en la página "/register"

    Ejemplos:
      | contraseña  | mensaje                                                  |
      | Corta1      | La contraseña debe tener al menos 8 caracteres           |
      | segura1234  | La contraseña debe incluir al menos una letra mayúscula  |
      | SEGURA1234  | La contraseña debe incluir al menos una letra minúscula  |
      | SeguraSegura| La contraseña debe incluir al menos un número            |

  Escenario: Correo con un dominio no permitido
    Cuando Carla se registra con el correo "carla@empresa.com" y la contraseña "Segura123"
    Entonces ella ve el aviso del campo "Correo inválido. Usa Gmail, Outlook, Hotmail, Yahoo o iCloud."

  Escenario: Las contraseñas no coinciden
    Cuando Carla se registra con la contraseña "Segura123" y la confirmación "Segura124"
    Entonces ella ve el aviso del campo "Las contraseñas no coinciden"

  Escenario: Una cuenta suspendida no puede ingresar
    Dado que Carla ya tiene una cuenta con la contraseña "Segura123"
    Y que su cuenta fue suspendida por "Fraude en pagos"
    Cuando ella inicia sesión con la contraseña "Segura123"
    Entonces ella ve el error del servidor "Tu cuenta ha sido suspendida. Motivo: Fraude en pagos"
