import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loading } from '../../components/ui/Loading'
import { ErrorMessage } from '../../components/ui/ErrorMessage'
import { phonesService } from '../../services/phones.service'
import type { PhoneFormData } from '../../types/phone'

const schema = z.object({
  slug: z.string().min(3, 'Mínimo 3 caracteres'),
  name: z.string().min(3, 'Mínimo 3 caracteres'),
  brand: z.string().min(2, 'Requerido'),
  categoryId: z.string().min(1, 'Requerido'),
  price: z.coerce.number().int().positive('Debe ser positivo'),
  compareAt: z.coerce.number().int().positive().optional().or(z.literal('')).transform(v => v === '' ? undefined : v),
  badge: z.string().optional(),
  stock: z.coerce.number().int().nonnegative('No puede ser negativo'),
  condition: z.enum(['NEW', 'CERTIFIED', 'USED']),
  verified: z.boolean(),
  batteryHealth: z.coerce.number().int().min(0).max(100).optional().or(z.literal('')).transform(v => v === '' ? undefined : v),
  ram: z.string().optional(),
  storage: z.string().optional(),
  camera: z.string().optional(),
  battery: z.string().optional(),
  screen: z.string().optional(),
  chip: z.string().optional(),
  shortDesc: z.string().optional(),
  longDesc: z.string().optional(),
  heroImage: z.string().url('URL inválida').optional().or(z.literal('')).transform(v => v === '' ? undefined : v),
  featuresText: z.string().optional(),
})

type FormFields = z.infer<typeof schema>

export function PhoneForm() {
  const { id } = useParams<{ id?: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const [loading, setLoading] = useState(isEdit)
  const [serverError, setServerError] = useState<Error | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormFields>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (!isEdit || !id) return
    phonesService
      .getById(id)
      .then((phone) => {
        reset({
          slug: phone.slug,
          name: phone.name,
          brand: phone.brand,
          categoryId: phone.categoryId,
          price: phone.price,
          compareAt: phone.compareAt ?? undefined,
          badge: phone.badge ?? undefined,
          stock: phone.stock,
          condition: phone.condition,
          verified: phone.verified,
          batteryHealth: phone.batteryHealth ?? undefined,
          ram: phone.ram ?? undefined,
          storage: phone.storage ?? undefined,
          camera: phone.camera ?? undefined,
          battery: phone.battery ?? undefined,
          screen: phone.screen ?? undefined,
          chip: phone.chip ?? undefined,
          shortDesc: phone.shortDesc ?? undefined,
          longDesc: phone.longDesc ?? undefined,
          heroImage: phone.heroImage ?? undefined,
          featuresText: phone.features.join('\n'),
        })
      })
      .catch(() => {
        // Si no se puede cargar, dejar el form vacío (el usuario verá el error del submit)
      })
      .finally(() => setLoading(false))
  }, [id, isEdit, reset])

  async function onSubmit(fields: FormFields) {
    setServerError(null)
    const features = (fields.featuresText ?? '')
      .split('\n')
      .map((f) => f.trim())
      .filter(Boolean)

    const data: PhoneFormData = {
      slug: fields.slug,
      name: fields.name,
      brand: fields.brand,
      categoryId: fields.categoryId,
      price: fields.price,
      compareAt: typeof fields.compareAt === 'number' ? fields.compareAt : undefined,
      badge: fields.badge,
      stock: fields.stock,
      condition: fields.condition,
      verified: fields.verified,
      batteryHealth: typeof fields.batteryHealth === 'number' ? fields.batteryHealth : undefined,
      ram: fields.ram,
      storage: fields.storage,
      camera: fields.camera,
      battery: fields.battery,
      screen: fields.screen,
      chip: fields.chip,
      shortDesc: fields.shortDesc,
      longDesc: fields.longDesc,
      heroImage: typeof fields.heroImage === 'string' ? fields.heroImage : undefined,
      features,
    }

    try {
      if (isEdit && id) {
        await phonesService.update(id, data)
      } else {
        await phonesService.create(data)
      }
      navigate('/admin/phones')
    } catch (err) {
      setServerError(err instanceof Error ? err : new Error(String(err)))
    }
  }

  if (loading) return <Loading />

  const Field = ({
    id,
    label,
    error,
    children,
  }: {
    id: string
    label: string
    error?: string
    children: ReactNode
  }) => (
    <div className="cp-field">
      <label htmlFor={id} className="cp-label">{label}</label>
      {children}
      {error && <p className="cp-field-error">{error}</p>}
    </div>
  )

  return (
    <div className="cp-container" style={{ paddingTop: 48, paddingBottom: 80, maxWidth: 800 }}>
      <h1
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 36,
          fontWeight: 400,
          letterSpacing: '-0.02em',
          marginBottom: 32,
        }}
      >
        {isEdit ? 'Editar celular' : 'Nuevo celular'}
      </h1>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="cp-field-row">
          <Field id="name" label="Nombre" error={errors.name?.message}>
            <input id="name" className={`cp-input ${errors.name ? 'error' : ''}`}
              placeholder="iPhone 15 Pro 256GB" {...register('name')} />
          </Field>
          <Field id="slug" label="Slug (URL)" error={errors.slug?.message}>
            <input id="slug" className={`cp-input ${errors.slug ? 'error' : ''}`}
              placeholder="iphone-15-pro-256gb" {...register('slug')} />
          </Field>
        </div>

        <div className="cp-field-row">
          <Field id="brand" label="Marca" error={errors.brand?.message}>
            <input id="brand" className={`cp-input ${errors.brand ? 'error' : ''}`}
              placeholder="Apple" {...register('brand')} />
          </Field>
          <Field id="categoryId" label="Categoría" error={errors.categoryId?.message}>
            <select id="categoryId" className="cp-select" {...register('categoryId')}>
              <option value="">Seleccionar...</option>
              <option value="apple">iPhone (Apple)</option>
              <option value="samsung">Samsung</option>
              <option value="xiaomi">Xiaomi</option>
              <option value="motorola">Motorola</option>
            </select>
          </Field>
        </div>

        <div className="cp-field-row">
          <Field id="price" label="Precio (COP)" error={errors.price?.message}>
            <input id="price" type="number" className={`cp-input ${errors.price ? 'error' : ''}`}
              placeholder="2500000" {...register('price')} />
          </Field>
          <Field id="compareAt" label="Precio tachado (opcional)">
            <input id="compareAt" type="number" className="cp-input"
              placeholder="3000000" {...register('compareAt')} />
          </Field>
        </div>

        <div className="cp-field-row">
          <Field id="stock" label="Stock" error={errors.stock?.message}>
            <input id="stock" type="number" className={`cp-input ${errors.stock ? 'error' : ''}`}
              placeholder="5" {...register('stock')} />
          </Field>
          <Field id="condition" label="Condición" error={errors.condition?.message}>
            <select id="condition" className="cp-select" {...register('condition')}>
              <option value="NEW">Nuevo</option>
              <option value="CERTIFIED">Certificado</option>
              <option value="USED">Usado verificado</option>
            </select>
          </Field>
        </div>

        <div className="cp-field-row">
          <Field id="batteryHealth" label="Salud de batería % (opcional)">
            <input id="batteryHealth" type="number" className="cp-input"
              placeholder="91" min="0" max="100" {...register('batteryHealth')} />
          </Field>
          <Field id="heroImage" label="URL imagen principal">
            <input id="heroImage" type="url" className="cp-input"
              placeholder="https://..." {...register('heroImage')} />
          </Field>
        </div>

        <div className="cp-field-row">
          <Field id="storage" label="Almacenamiento">
            <input id="storage" className="cp-input" placeholder="256GB" {...register('storage')} />
          </Field>
          <Field id="ram" label="RAM">
            <input id="ram" className="cp-input" placeholder="8GB" {...register('ram')} />
          </Field>
        </div>

        <div className="cp-field-row">
          <Field id="chip" label="Procesador">
            <input id="chip" className="cp-input" placeholder="A17 Pro" {...register('chip')} />
          </Field>
          <Field id="camera" label="Cámara">
            <input id="camera" className="cp-input" placeholder="48MP + 12MP" {...register('camera')} />
          </Field>
        </div>

        <div className="cp-field-row">
          <Field id="screen" label="Pantalla">
            <input id="screen" className="cp-input" placeholder='6.7" OLED 120Hz' {...register('screen')} />
          </Field>
          <Field id="battery" label="Batería">
            <input id="battery" className="cp-input" placeholder="4422 mAh" {...register('battery')} />
          </Field>
        </div>

        <div className="cp-field-row">
          <Field id="badge" label="Badge (opcional)">
            <input id="badge" className="cp-input" placeholder="Oferta, Nuevo, etc." {...register('badge')} />
          </Field>
          <div className="cp-field" style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 28 }}>
            <input id="verified" type="checkbox" {...register('verified')} />
            <label htmlFor="verified" className="cp-label" style={{ margin: 0 }}>
              Equipo verificado ✓
            </label>
          </div>
        </div>

        <Field id="shortDesc" label="Descripción corta">
          <textarea id="shortDesc" className="cp-input" rows={2}
            placeholder="Descripción breve para el catálogo..." {...register('shortDesc')}
            style={{ resize: 'vertical' }} />
        </Field>

        <Field id="longDesc" label="Descripción larga">
          <textarea id="longDesc" className="cp-input" rows={4}
            placeholder="Descripción completa..." {...register('longDesc')}
            style={{ resize: 'vertical' }} />
        </Field>

        <Field id="featuresText" label="Características (una por línea)">
          <textarea id="featuresText" className="cp-input" rows={5}
            placeholder={"Chip A17 Pro\nCámara 48MP\nBluetooth 5.3"}
            {...register('featuresText')}
            style={{ resize: 'vertical', fontFamily: 'var(--font-mono)', fontSize: 13 }} />
        </Field>

        {serverError && <ErrorMessage error={serverError} />}

        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          <button
            type="submit"
            className="cp-btn cp-btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear celular'}
          </button>
          <button
            type="button"
            className="cp-btn cp-btn-secondary"
            onClick={() => navigate('/admin/phones')}
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}
