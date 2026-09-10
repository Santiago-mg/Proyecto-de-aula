import 'dotenv/config'
import prisma from './prisma'

// ─── Helpers ──────────────────────────────────────────────────────────
const Q = '?auto=format&fit=crop&w=800&q=85'
const Q_WEBP = `${Q}&fm=webp`
const Q_MIN = '?w=800&q=85'

const un = (id: string, q: string = Q) => `https://images.unsplash.com/${id}${q}`
const unPlus = (id: string, q: string = Q) =>
  `https://plus.unsplash.com/${id}${q}`

type PhoneSeed = {
  slug: string
  name: string
  brand: string
  categoryId: string
  price: number
  compareAt: number
  badge: string | null
  stock: number
  condition: 'NEW' | 'CERTIFIED' | 'USED'
  verified?: boolean
  batteryHealth?: number
  ram: string
  storage: string
  camera: string
  battery: string
  screen: string
  chip: string
  shortDesc: string
  longDesc: string
  heroImage: string
  gallery: string[]
  heroFirst?: boolean
  colors: { colorId: string; name: string; hex: string }[]
  features: string[]
}

// Helper para crear registros PhoneSeed evitando código duplicado mediante overrides
function createPhoneSeed(
  defaults: Partial<PhoneSeed>,
  overrides: PhoneSeed
): PhoneSeed {
  return {
    badge: null,
    stock: 10,
    condition: 'NEW',
    ...defaults,
    ...overrides,
  }
}

function toPrismaPhone({
  gallery,
  heroFirst,
  colors,
  features,
  ...phone
}: PhoneSeed) {
  const urls = heroFirst
    ? [phone.heroImage, ...gallery]
    : [...gallery, phone.heroImage]

  return {
    ...phone,
    verified: phone.verified ?? true,
    images: {
      createMany: { data: urls.map((url, position) => ({ url, position })) },
    },
    colors: { createMany: { data: colors } },
    features: {
      createMany: {
        data: features.map((feature, position) => ({ feature, position })),
      },
    },
  }
}

// ─── Defaults por Marca ──────────────────────────────────────────────────
const APPLE_BASE: Partial<PhoneSeed> = {
  brand: 'Apple',
  categoryId: 'apple',
}

const SAMSUNG_BASE: Partial<PhoneSeed> = {
  brand: 'Samsung',
  categoryId: 'samsung',
}

const XIAOMI_BASE: Partial<PhoneSeed> = {
  brand: 'Xiaomi',
  categoryId: 'xiaomi',
}

const MOTOROLA_BASE: Partial<PhoneSeed> = {
  brand: 'Motorola',
  categoryId: 'motorola',
}

// ─── Catálogo ─────────────────────────────────────────────────────────
const PHONES: PhoneSeed[] = [
  createPhoneSeed(APPLE_BASE, {
    slug: 'iphone-15-pro-max',
    name: 'iPhone 15 Pro Max',
    price: 1299000,
    compareAt: 1499000,
    badge: 'Nuevo',
    stock: 15,
    condition: 'NEW',
    ram: '8GB',
    storage: '512GB',
    camera: '48MP + 12MP + 12MP',
    battery: '4685 mAh',
    screen: '6.7" Super Retina XDR',
    chip: 'A17 Pro',
    shortDesc: 'Último modelo con cámara avanzada y procesador potente',
    longDesc:
      'El iPhone 15 Pro Max ofrece el mejor desempeño y captura fotográfica profesional con su triple sistema de cámara.',
    heroImage: un('photo-1710023038502-ba80a70a9f53', Q_WEBP),
    gallery: [
      unPlus('premium_photo-1681396658834-b56190480934', Q_WEBP),
      un('photo-1700805732158-6f1169780ca7', Q_WEBP),
    ],
    colors: [
      { colorId: 'c1', name: 'Negro', hex: '#000000' },
      { colorId: 'c2', name: 'Oro', hex: '#FFD700' },
      { colorId: 'c3', name: 'Plata', hex: '#C0C0C0' },
    ],
    features: ['Face ID', 'Carga rápida 35W', 'Acero inoxidable', 'IP68'],
  }),
  createPhoneSeed(APPLE_BASE, {
    slug: 'iphone-14',
    name: 'iPhone 14',
    price: 799000,
    compareAt: 999000,
    badge: 'Descuento',
    stock: 8,
    condition: 'CERTIFIED',
    batteryHealth: 95,
    ram: '6GB',
    storage: '256GB',
    camera: '12MP + 12MP',
    battery: '3279 mAh',
    screen: '6.1" Super Retina XDR',
    chip: 'A15 Bionic',
    shortDesc:
      'Generación anterior certificada, excelente relación precio-desempeño',
    longDesc:
      'iPhone 14 certificado con garantía de calidad. Potencia similar a Pro con mejor precio.',
    heroImage: un('photo-1510557880182-3d4d3cba35a5'),
    gallery: [
      unPlus('premium_photo-1680985551009-05107cd2752c'),
      un('photo-1726587912121-ea21fcc57ff8'),
    ],
    colors: [
      { colorId: 'c1', name: 'Púrpura', hex: '#800080' },
      { colorId: 'c2', name: 'Negro', hex: '#000000' },
    ],
    features: ['Face ID', 'Notch más pequeño', 'Fotograma acero', 'IP54'],
  }),
  createPhoneSeed(SAMSUNG_BASE, {
    slug: 'samsung-galaxy-s24-ultra',
    name: 'Samsung Galaxy S24 Ultra',
    price: 1249000,
    compareAt: 1449000,
    badge: 'Nuevo',
    stock: 12,
    condition: 'NEW',
    ram: '12GB',
    storage: '512GB',
    camera: '200MP + 50MP + 12MP + 10MP',
    battery: '5000 mAh',
    screen: '6.8" AMOLED 120Hz',
    chip: 'Snapdragon 8 Gen 3',
    shortDesc: 'Campeón en fotografía con cámara de 200MP y AI integrada',
    longDesc:
      'Galaxy S24 Ultra con la mejor cámara del mercado, procesamiento AI avanzado y pantalla AMOLED 120Hz.',
    heroImage: un('photo-1709744722656-9b850470293f'),
    gallery: [
      un('photo-1705585174953-9b2aa8afc174'),
      un('photo-1705530292519-ec81f2ace70d'),
    ],
    colors: [
      { colorId: 's1', name: 'Gris Titán', hex: '#808080' },
      { colorId: 's2', name: 'Negro Fantasma', hex: '#1a1a1a' },
    ],
    features: [
      'Pantalla 6.8" 120Hz',
      'S Pen integrado',
      'Carga rápida 45W',
      'IP68',
    ],
  }),
  createPhoneSeed(SAMSUNG_BASE, {
    slug: 'samsung-galaxy-a54',
    name: 'Samsung Galaxy A54',
    price: 399000,
    compareAt: 499000,
    stock: 20,
    condition: 'NEW',
    ram: '6GB',
    storage: '128GB',
    camera: '50MP + 12MP + 5MP',
    battery: '5000 mAh',
    screen: '6.4" AMOLED 90Hz',
    chip: 'Exynos 1280',
    shortDesc: 'Gama media confiable con gran batería y cámara versátil',
    longDesc:
      'Galaxy A54 perfecto para uso diario con batería que dura todo el día y cámara de calidad.',
    heroImage:
      'https://carulla.vtexassets.com/arquivos/ids/19798217/celular-samsung-galaxy-a54-5g-256gb-blanco-reacondicionado.jpg?v=638762945112100000',
    gallery: [
      un('photo-1772182137994-4158ac33bddd'),
      un('photo-1610945265064-0e34e5519bbf'),
    ],
    colors: [
      { colorId: 'a1', name: 'Verde', hex: '#008000' },
      { colorId: 'a2', name: 'Blanco', hex: '#FFFFFF' },
    ],
    features: [
      'Pantalla 6.4" 90Hz',
      'Gran batería 5000mAh',
      'IP67',
      'Carga rápida 25W',
    ],
  }),
  createPhoneSeed(XIAOMI_BASE, {
    slug: 'xiaomi-14-ultra',
    name: 'Xiaomi 14 Ultra',
    price: 799000,
    compareAt: 999000,
    badge: 'Potencia',
    stock: 10,
    condition: 'NEW',
    ram: '16GB',
    storage: '512GB',
    camera: '50MP + 50MP + 50MP + 50MP',
    battery: '5000 mAh',
    screen: '6.73" AMOLED 120Hz',
    chip: 'Snapdragon 8 Gen 3',
    shortDesc:
      'Potencia absoluta con cuádruple cámara 50MP y procesador flagship',
    longDesc:
      'Xiaomi 14 Ultra con procesador tope de gama, 16GB RAM y cámaras todas 50MP. Relación precio-potencia imbatible.',
    heroImage:
      'https://i02.appmifile.com/334_operator_sg/22/02/2024/d36105f6de5a716a1c0737352c2827be.png?f=webp',
    gallery: [
      'https://agaval.vtexassets.com/arquivos/ids/2734153-1200-1200?v=638870604974800000&width=1200&height=1200&aspect=true',
      'https://www.tuexperto.com/wp-content/uploads/2024/04/asi-han-sido-mis-primeras-48-horas-con-el-xiaomi-14-ultra-en-las-manos-1080x675.jpg.webp',
    ],
    colors: [
      { colorId: 'x1', name: 'Negro Azabache', hex: '#0a0e27' },
      { colorId: 'x2', name: 'Blanco Polar', hex: '#f0f0f0' },
    ],
    features: [
      'Pantalla 6.73" 120Hz',
      'Carga rápida 90W',
      'IP68',
      'Batería 5000mAh',
    ],
  }),
  // ─── A partir de aquí (Línea 216 en adelante) aplicamos overrides ───────
  createPhoneSeed(XIAOMI_BASE, {
    slug: 'xiaomi-13',
    name: 'Xiaomi 13',
    price: 499000,
    compareAt: 699000,
    stock: 18,
    condition: 'CERTIFIED',
    batteryHealth: 90,
    ram: '8GB',
    storage: '256GB',
    camera: '50MP + 12MP + 12MP',
    battery: '4500 mAh',
    screen: '6.36" AMOLED 120Hz',
    chip: 'Snapdragon 8 Gen 2',
    shortDesc:
      'Generación anterior certificada, relación calidad-precio excelente',
    longDesc:
      'Xiaomi 13 certificado con batería en excelente estado. Buena opción si buscas ahorrar.',
    heroImage:
      'https://exitocol.vtexassets.com/arquivos/ids/24428311/celular-xiaomi-redmi-note-13-4g-256gb-8ram-108mp-verde.jpg?v=638608926094700000',
    gallery: [
      'https://http2.mlstatic.com/D_NQ_NP_2X_951197-MLA99998127015_112025-F.webp',
      'https://puntoscolombia.vtexassets.com/arquivos/ids/27922311-1200-auto?v=638603644553370000&width=1200&height=auto&aspect=true',
    ],
    colors: [
      { colorId: 'x3', name: 'Azul', hex: '#0000FF' },
      { colorId: 'x4', name: 'Verde', hex: '#00AA00' },
    ],
    features: [
      'Pantalla 6.36" AMOLED 120Hz',
      'Carga rápida 67W',
      'IP53',
      'Batería 4500mAh',
    ],
  }),
  createPhoneSeed(MOTOROLA_BASE, {
    slug: 'motorola-edge-50-pro',
    name: 'Motorola Edge 50 Pro',
    price: 699000,
    compareAt: 899000,
    badge: 'Diseño',
    stock: 14,
    condition: 'NEW',
    ram: '12GB',
    storage: '256GB',
    camera: '50MP + 12MP + 12MP',
    battery: '4500 mAh',
    screen: '6.7" AMOLED 144Hz',
    chip: 'Snapdragon 8 Gen 3 Leading Version',
    shortDesc: 'Pantalla 144Hz más suave del mercado con diseño premium',
    longDesc:
      'Motorola Edge 50 Pro con la pantalla más suave (144Hz) y diseño robusto. Potencia y fluidez garantizadas.',
    heroImage:
      'https://celulibre.com/97-large_default/motorola-moto-edge-50-pro-512-gb.jpg',
    heroFirst: true,
    gallery: [
      'https://celulibre.com/99-large_default/motorola-moto-edge-50-pro-512-gb.jpg',
      'https://celulibre.com/100-large_default/motorola-moto-edge-50-pro-512-gb.jpg',
    ],
    colors: [
      { colorId: 'm1', name: 'Esmeralda', hex: '#50C878' },
      { colorId: 'm2', name: 'Plata', hex: '#C0C0C0' },
    ],
    features: [
      'Pantalla 6.7" 144Hz',
      'Cámara Hasselblad',
      'Carga rápida 125W',
      'IP68',
    ],
  }),
  createPhoneSeed(MOTOROLA_BASE, {
    slug: 'motorola-g84',
    name: 'Motorola G84',
    price: 299000,
    compareAt: 399000,
    badge: 'Económico',
    stock: 25,
    condition: 'NEW',
    ram: '4GB',
    storage: '128GB',
    camera: '50MP + 8MP',
    battery: '5000 mAh',
    screen: '6.55" IPS 120Hz',
    chip: 'MediaTek Helio G100',
    shortDesc: 'Presupuesto inteligente: batería grande y rendimiento decente',
    longDesc:
      'Motorola G84 para presupuesto ajustado. Batería de 5000mAh y desempeño suficiente para tareas diarias.',
    heroImage:
      'https://carulla.vtexassets.com/arquivos/ids/24976611/Celular-MOTOROLA-Edge-50-Fusion-512GB-512-GB-12-GB-RAM-Rosado-3650440_a.jpg?v=639122907635900000',
    gallery: [
      'https://agaval.vtexassets.com/arquivos/ids/3037332-1200-1200?v=638972832015170000&width=1200&height=1200&aspect=true',
      'https://cdn.mos.cms.futurecdn.net/R7M5bMaTJbcGBUGXiUeskd-1024-80.jpg.webp',
    ],
    colors: [
      { colorId: 'm3', name: 'Gris', hex: '#808080' },
      { colorId: 'm4', name: 'Azul', hex: '#0000FF' },
    ],
    features: [
      'Pantalla 6.55" 120Hz',
      'Batería 5000mAh',
      'Carga rápida 33W',
      'IP54',
    ],
  }),
  createPhoneSeed(APPLE_BASE, {
    slug: 'iphone-13-usado',
    name: 'iPhone 13 (Usado)',
    price: 549000,
    compareAt: 799000,
    badge: 'Usado',
    stock: 5,
    condition: 'USED',
    batteryHealth: 85,
    ram: '4GB',
    storage: '128GB',
    camera: '12MP + 12MP',
    battery: '3240 mAh',
    screen: '6.1" Super Retina XDR',
    chip: 'A15 Bionic',
    shortDesc: 'Excelente oportunidad: iPhone 13 usado en buen estado',
    longDesc:
      'iPhone 13 de segunda mano con salud de batería 85%. Funciona perfectamente y tiene buen estado físico.',
    heroImage: un('photo-1592286927505-1def25115558', Q_MIN),
    heroFirst: true,
    gallery: [
      un('photo-1575283141207-f45d7851a910', Q_MIN),
      un('photo-1523275335684-37898b6baf30', Q_MIN),
    ],
    colors: [{ colorId: 'c4', name: 'Azul', hex: '#0000FF' }],
    features: ['Face ID', 'Pantalla 6.1"', 'Acero inoxidable', 'IP67'],
  }),
]

async function seed() {
  console.log('Sembrando datos iniciales...')

  // Categorías
  await prisma.category.createMany({
    data: [
      { id: 'apple', name: 'iPhone', tagline: 'El estándar de referencia.' },
      { id: 'samsung', name: 'Samsung', tagline: 'Innovación en cada píxel.' },
      { id: 'xiaomi', name: 'Xiaomi', tagline: 'Potencia sin concesiones.' },
      { id: 'motorola', name: 'Motorola', tagline: 'Diseñado para durar.' },
    ],
    skipDuplicates: true,
  })

  // Admin por defecto
  const bcrypt = await import('bcrypt')
  const adminPassword = await bcrypt.hash('admin1234', 12)
  await prisma.user.upsert({
    where: { email: 'admin@celularpro.co' },
    update: {},
    create: {
      email: 'admin@celularpro.co',
      name: 'Admin CelularPro',
      password: adminPassword,
      role: 'ADMIN',
    },
  })

  // Limpiar teléfonos anteriores para recargar con imágenes nuevas
  await prisma.phoneFeature.deleteMany({})
  await prisma.phoneColor.deleteMany({})
  await prisma.phoneImage.deleteMany({})
  await prisma.orderItem.deleteMany({})
  await prisma.phone.deleteMany({})

  for (const phone of PHONES) {
    await prisma.phone.create({ data: toPrismaPhone(phone) })
  }

  console.log('✓ Datos iniciales listos')
  console.log(`  Admin: admin@celularpro.co / admin1234`)
  console.log(`  ${PHONES.length} teléfonos con imágenes de alta calidad`)
  console.log('  Todas las imágenes: 3 por producto, 800px ancho optimizado')
}

seed()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect());
