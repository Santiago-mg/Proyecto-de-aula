// Tipos de reportportal/config.cjs, para usarlo desde las configuraciones TypeScript.
interface Atributo {
  key?: string
  value: string
}

interface OpcionesRP {
  apiKey: string
  endpoint: string
  project: string
  launch: string
  description: string
  attributes: Atributo[]
  skippedIssue: boolean
  debug: boolean
}

declare const rp: {
  activo(): boolean
  base(): string
  opciones(suite: string, descripcion: string): OpcionesRP
  atributosComunes(): Atributo[]
}

export = rp
