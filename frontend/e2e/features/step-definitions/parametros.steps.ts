import { defineParameterType } from '@cucumber/cucumber'
import { actorCalled, actorInTheSpotlight } from '@serenity-js/core'

// {persona}: un nombre propio ("Carla", "Andrés") o un pronombre que se
// refiere al último actor nombrado ("ella", "él").
defineParameterType({
  name: 'persona',
  regexp: /él|ella|[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+/,
  transformer: (texto: string) =>
    texto === 'él' || texto === 'ella' ? actorInTheSpotlight() : actorCalled(texto),
})

defineParameterType({
  name: 'rol',
  regexp: /administrador|cliente/,
  transformer: (texto: string) => (texto === 'administrador' ? 'ADMIN' : 'USER') as 'ADMIN' | 'USER',
})
