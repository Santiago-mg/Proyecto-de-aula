# language: es
@alerta-stock
Característica: Alerta de stock bajo
  Como administrador
  Quiero ver qué celulares llegaron al mínimo de inventario
  Para reponerlos antes de quedarme sin unidades

  Antecedentes:
    Dado que Andrés ingresó como administrador

  @smoke
  Escenario: Un celular llega al mínimo de inventario
    Dado que el celular de prueba queda con 2 unidades
    Cuando él abre el panel de administración
    Entonces él ve una alerta "Stock bajo" del celular de prueba con el texto "tiene 2 unidades"

  Escenario: El umbral es inclusivo
    Dado que el celular de prueba queda con 5 unidades
    Cuando él abre el panel de administración
    Entonces él ve una alerta "Stock bajo" del celular de prueba con el texto "tiene 5 unidades"

  Escenario: Un celular se queda sin unidades
    Dado que el celular de prueba queda con 0 unidades
    Cuando él abre el panel de administración
    Entonces él ve una alerta "Sin stock" del celular de prueba con el texto "se quedó sin unidades"

  Escenario: Reponer inventario cierra la alerta
    Dado que el celular de prueba queda con 2 unidades
    Y que el celular de prueba queda con 20 unidades
    Cuando él abre el panel de administración
    Entonces él no ve ninguna alerta del celular de prueba

  Escenario: El administrador configura el inventario y el mínimo desde el formulario
    Cuando él edita el celular de prueba con 3 unidades y un mínimo de 4
    Y él abre el panel de administración
    Entonces él ve una alerta "Stock bajo" del celular de prueba con el texto "tiene 3 unidades, en o por debajo del mínimo de 4"
