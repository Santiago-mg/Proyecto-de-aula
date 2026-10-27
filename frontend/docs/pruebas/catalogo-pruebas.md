# Catálogo de pruebas — Frontend CelularPro

Generado el 2026-10-12 con `node scripts/catalogo-pruebas.mjs` a partir
de la evidencia de ejecución (`npm run test:evidencia` y `npm --prefix e2e run evidencias`).

- **Objetivo:** lo que verifica la prueba.
- **Resultado esperado:** aserciones del código, pasos "Entonces" del escenario o comandos `assert` de Katalon.
- **Resultado obtenido:** estado en la última ejecución.
- **Evidencia:** reporte o captura indicada en cada sección.

## Resumen

| Tipo | Herramienta | Pruebas | Pasan |
|---|---|---:|---:|
| Accesibilidad de componentes | Vitest + Testing Library | 4 | 4 |
| Unitaria y de componentes (Testing Library) | Vitest + Testing Library | 107 | 107 |
| Aserciones fluidas | Vitest + Testing Library | 12 | 12 |
| Regresión | Vitest + Testing Library | 9 | 9 |
| E2E Screenplay | Serenity/JS + Cucumber + Playwright | 26 | 26 |
| E2E Katalon | Katalon Recorder (HTML) | 6 | 6 |
| Accesibilidad | axe-core (WCAG 2.1 AA) | 10 pantallas | 10 (0 violaciones) |
| Interfaz | Playwright | 5 | 5 |
| Cypress (componentes, API, regresión) | Cypress 14 | 42 | pendiente de ejecución |

## Accesibilidad de componentes

Evidencia: `docs/evidencias/unitarias/resultado.json`.

### `test/unit/accesibilidad/formularios-aria.test.tsx`

| ID | Objetivo | Resultado esperado | Obtenido |
|---|---|---|---|
| F-ACC-001 |  › Formularios — errores asociados a su campo › Login: un campo sin error no se marca como inválido | `expect(screen.getByLabelText(/email/i)).not.toHaveAttribute('aria-invalid')` | Pasa (80 ms) |
| F-ACC-002 |  › Formularios — errores asociados a su campo › Login: el campo con error queda inválido y su descripción accesible es el mensaje | `expect(await screen.findByText('Email inválido')).toBeInTheDocument()`<br>`expect(email).toHaveAttribute('aria-invalid', 'true')`<br>`expect(email).toHaveAccessibleDescription('Email inválido')` | Pasa (493 ms) |
| F-ACC-003 |  › Formularios — errores asociados a su campo › Registro: la ayuda de la contraseña es su descripción hasta que aparece un error | `expect(password).toHaveAccessibleDescription('Mínimo 8 caracteres, con mayúscula, minúscula y número')`<br>`expect(await screen.findByText('La contraseña debe tener al menos 8 caracteres')).toBeInTheDocument()`<br>`expect(password).toHaveAccessibleDescription('La contraseña debe tener al menos 8 caracteres')` | Pasa (147 ms) |
| F-ACC-004 |  › Formularios — errores asociados a su campo › Registro: los errores se anuncian (role="alert") | `expect((await screen.findAllByRole('alert')).length).toBeGreaterThanOrEqual(3)` | Pasa (66 ms) |

## Unitaria y de componentes (Testing Library)

Evidencia: `docs/evidencias/unitarias/resultado.json`.

### `test/unit/catalogo/admin-phones-delete.test.tsx`

| ID | Objetivo | Resultado esperado | Obtenido |
|---|---|---|---|
| F-UNI-001 |  › AdminPhones — eliminación de un celular › no elimina el celular si el admin cancela la confirmación | `expect(phonesService.remove).not.toHaveBeenCalled()`<br>`expect(screen.getByText('iPhone 15')).toBeInTheDocument()` | Pasa (325 ms) |
| F-UNI-002 |  › AdminPhones — eliminación de un celular › elimina el celular de la lista cuando se confirma y remove() resuelve | `expect(phonesService.remove).toHaveBeenCalledWith('phone-1')`<br>`expect(screen.queryByText('iPhone 15')).not.toBeInTheDocument()` | Pasa (55 ms) |
| F-UNI-003 |  › AdminPhones — eliminación de un celular › muestra una alerta y conserva el celular en la lista si remove() falla | `expect(alertSpy).toHaveBeenCalledWith('Error al eliminar el celular')`<br>`expect(screen.getByText('iPhone 15')).toBeInTheDocument()` | Pasa (67 ms) |

### `test/unit/catalogo/phone-detail-slug.test.tsx`

| ID | Objetivo | Resultado esperado | Obtenido |
|---|---|---|---|
| F-UNI-004 |  › PhoneDetail — buscar celular por slug › pide el celular exacto que trae la URL y lo muestra | `expect(`<br>`expect(phonesService.getBySlug).toHaveBeenCalledTimes(1)`<br>`expect(phonesService.getBySlug).toHaveBeenCalledWith('iphone-15')` | Pasa (285 ms) |
| F-UNI-005 |  › PhoneDetail — buscar celular por slug › muestra "Celular no encontrado" cuando el slug no existe | `expect(`<br>`expect(` | Pasa (36 ms) |
| F-UNI-006 |  › PhoneDetail — buscar celular por slug › vuelve a pedir el celular cuando el slug de la URL cambia | `expect(`<br>`expect(phonesService.getBySlug).toHaveBeenCalledTimes(2)`<br>`expect(phonesService.getBySlug).toHaveBeenNthCalledWith(2, 'galaxy-s24')` | Pasa (237 ms) |

### `test/unit/catalogo/phone-form.test.tsx`

| ID | Objetivo | Resultado esperado | Obtenido |
|---|---|---|---|
| F-UNI-007 |  › PhoneForm — validación y creación › muestra errores de validación y no llama a create() si faltan campos requeridos | `expect(screen.getAllByText(/mínimo 3 caracteres\|requerido/i).length).toBeGreaterThan(0)`<br>`expect(phonesService.create).not.toHaveBeenCalled()` | Pasa (392 ms) |
| F-UNI-008 |  › PhoneForm — validación y creación › crea el celular y navega a /admin/phones cuando los datos son válidos | `expect(phonesService.create).toHaveBeenCalledWith(`<br>`expect(navigateMock).toHaveBeenCalledWith('/admin/phones')` | Pasa (485 ms) |
| F-UNI-009 |  › PhoneForm — validación y creación › muestra el error del servidor y no navega si create() rechaza | `expect(screen.getByText('El slug ya está en uso')).toBeInTheDocument()`<br>`expect(navigateMock).not.toHaveBeenCalled()` | Pasa (373 ms) |
| F-UNI-010 |  › PhoneForm — edición de un celular existente › precarga el formulario con los datos del celular al editar | `expect(await screen.findByDisplayValue('iPhone 15 Pro')).toBeInTheDocument()`<br>`expect(phonesService.getById).toHaveBeenCalledWith('phone-1')` | Pasa (45 ms) |
| F-UNI-011 |  › PhoneForm — edición de un celular existente › llama a phonesService.update(id, data) y navega al guardar cambios | `expect(phonesService.update).toHaveBeenCalledWith(`<br>`expect(navigateMock).toHaveBeenCalledWith('/admin/phones')` | Pasa (138 ms) |

### `test/unit/catalogo/similar-phones.test.tsx`

| ID | Objetivo | Resultado esperado | Obtenido |
|---|---|---|---|
| F-UNI-012 |  › PhoneDetail — recomendación de productos › pide recomendaciones para el slug actual y las muestra | `expect(within(seccion).getByText('iPhone 14')).toBeInTheDocument()`<br>`expect(within(seccion).getByText('iPhone 13')).toBeInTheDocument()`<br>`expect(phonesService.getSimilar).toHaveBeenCalledWith('iphone-15-pro')` | Pasa (118 ms) |
| F-UNI-013 |  › PhoneDetail — recomendación de productos › no muestra la sección de recomendaciones cuando no hay celulares similares | `expect(screen.queryByTestId('similar-phones')).not.toBeInTheDocument()`<br>`expect(` | Pasa (222 ms) |
| F-UNI-014 |  › PhoneDetail — recomendación de productos › sigue mostrando la ficha del producto si getSimilar() rechaza | `expect(`<br>`expect(screen.queryByTestId('similar-phones')).not.toBeInTheDocument()` | Pasa (42 ms) |

### `test/unit/control-roles/admin-route.test.tsx`

| ID | Objetivo | Resultado esperado | Obtenido |
|---|---|---|---|
| F-UNI-015 |  › AdminRoute — verificación de acceso › redirige a /login si no hay sesión activa | `expect(screen.getByText('Login')).toBeInTheDocument()` | Pasa (33 ms) |
| F-UNI-016 |  › AdminRoute — verificación de acceso › redirige a /unauthorized si el usuario no es ADMIN | `expect(screen.getByText('No autorizado')).toBeInTheDocument()` | Pasa (5 ms) |
| F-UNI-017 |  › AdminRoute — verificación de acceso › renderiza el panel de administración si el usuario es ADMIN | `expect(screen.getByText('Panel de administración')).toBeInTheDocument()` | Pasa (4 ms) |

### `test/unit/control-roles/auth-context-sync.test.tsx`

| ID | Objetivo | Resultado esperado | Obtenido |
|---|---|---|---|
| F-UNI-018 |  › AuthProvider — sincronización del rol › reemplaza el rol guardado por el que devuelve /auth/me | `expect(screen.getByTestId('rol')).toHaveTextContent('ADMIN')`<br>`await waitFor(() => expect(screen.getByTestId('rol')).toHaveTextContent('USER'))`<br>`expect(JSON.parse(localStorage.getItem('cp_user')!).role).toBe('USER')` | Pasa (27 ms) |
| F-UNI-019 |  › AuthProvider — sincronización del rol › sin token no consulta el perfil | `expect(authService.me).not.toHaveBeenCalled()`<br>`expect(screen.getByTestId('rol')).toHaveTextContent('sin sesión')` | Pasa (4 ms) |
| F-UNI-020 |  › AuthProvider — sincronización del rol › si /auth/me falla por red, conserva la sesión local | `await waitFor(() => expect(authService.me).toHaveBeenCalled())`<br>`expect(screen.getByTestId('rol')).toHaveTextContent('ADMIN')` | Pasa (4 ms) |
| F-UNI-021 |  › AuthProvider — persistencia inmediata de la sesión › login() deja la sesión en localStorage antes de terminar | `expect(localStorage.getItem('cp_token')).toBe('tok-1')`<br>`expect(JSON.parse(localStorage.getItem('cp_user')!).email).toBe('ana@gmail.com')` | Pasa (6 ms) |

### `test/unit/control-roles/protected-route.test.tsx`

| ID | Objetivo | Resultado esperado | Obtenido |
|---|---|---|---|
| F-UNI-022 |  › ProtectedRoute — verificación de acceso › redirige a /login si no hay sesión activa | `expect(screen.getByText('Login')).toBeInTheDocument()`<br>`expect(screen.queryByText('Dashboard privado')).not.toBeInTheDocument()` | Pasa (39 ms) |
| F-UNI-023 |  › ProtectedRoute — verificación de acceso › renderiza la ruta protegida si hay sesión activa | `expect(screen.getByText('Dashboard privado')).toBeInTheDocument()` | Pasa (5 ms) |

### `test/unit/estadisticas/admin-stats.test.tsx`

| ID | Objetivo | Resultado esperado | Obtenido |
|---|---|---|---|
| F-UNI-024 |  › AdminStats — carga y render de estadísticas › muestra el indicador de carga mientras se calculan las estadísticas | `expect(screen.getByText(/calculando estadísticas/i)).toBeInTheDocument()` | Pasa (38 ms) |
| F-UNI-025 |  › AdminStats — carga y render de estadísticas › muestra un mensaje de error si no se pueden cargar las estadísticas | `expect(await screen.findByText('Error')).toBeInTheDocument()` | Pasa (13 ms) |
| F-UNI-026 |  › AdminStats — carga y render de estadísticas › renderiza el resumen sin errores cuando todos los días tienen revenue en 0 (protección de división por 0) | `expect(await screen.findByText('Estadísticas')).toBeInTheDocument()`<br>`expect(screen.getByText('120')).toBeInTheDocument()`<br>`expect(screen.getAllByText('—').length).toBe(2)` | Pasa (56 ms) |

### `test/unit/gestion-perfil/profile.test.tsx`

| ID | Objetivo | Resultado esperado | Obtenido |
|---|---|---|---|
| F-UNI-027 |  › Profile — datos de la cuenta › muestra el correo, el tipo de cuenta y el nombre actual | `expect(screen.getByTestId('perfil-email')).toHaveTextContent('ana@gmail.com')`<br>`expect(screen.getByTestId('perfil-rol')).toHaveTextContent('Cliente')`<br>`expect(screen.getByLabelText(/nombre completo/i)).toHaveValue('Ana Pérez')` | Pasa (76 ms) |
| F-UNI-028 |  › Profile — datos de la cuenta › muestra "Administrador" para una cuenta ADMIN | `expect(screen.getByTestId('perfil-rol')).toHaveTextContent('Administrador')` | Pasa (13 ms) |
| F-UNI-029 |  › Profile — datos de la cuenta › el botón de guardar está deshabilitado hasta que el nombre cambia | `expect(boton).toBeDisabled()`<br>`expect(boton).toBeEnabled()` | Pasa (254 ms) |
| F-UNI-030 |  › Profile — cambiar el nombre › guarda el nombre recortado y avisa con un toast | `await waitFor(() => expect(updateProfile).toHaveBeenCalledWith('Ana María'))`<br>`expect(showToast).toHaveBeenCalledWith('Nombre actualizado')` | Pasa (150 ms) |
| F-UNI-031 |  › Profile — cambiar el nombre › no envía un nombre de una letra | `expect(await screen.findByText('El nombre debe tener al menos 2 caracteres')).toBeInTheDocument()`<br>`expect(updateProfile).not.toHaveBeenCalled()` | Pasa (106 ms) |
| F-UNI-032 |  › Profile — cambiar la contraseña › cambia la contraseña, limpia el formulario y lo confirma | `await waitFor(() => expect(changePassword).toHaveBeenCalledWith('Actual123', 'Nueva1234'))`<br>`expect(await screen.findByRole('status')).toHaveTextContent('Contraseña actualizada')`<br>`expect(screen.getByLabelText(/contraseña actual/i)).toHaveValue('')` | Pasa (302 ms) |
| F-UNI-033 |  › Profile — cambiar la contraseña › aplica la política de contraseñas a la nueva | `expect(`<br>`expect(changePassword).not.toHaveBeenCalled()` | Pasa (150 ms) |
| F-UNI-034 |  › Profile — cambiar la contraseña › avisa si la confirmación no coincide | `expect(await screen.findByText('Las contraseñas no coinciden')).toBeInTheDocument()`<br>`expect(changePassword).not.toHaveBeenCalled()` | Pasa (154 ms) |
| F-UNI-035 |  › Profile — cambiar la contraseña › muestra el error del servidor cuando la contraseña actual es incorrecta | `expect(await screen.findByText('La contraseña actual no es correcta')).toBeInTheDocument()`<br>`expect(screen.queryByRole('status')).not.toBeInTheDocument()` | Pasa (154 ms) |

### `test/unit/gestion-usuarios/ban-modal.test.tsx`

| ID | Objetivo | Resultado esperado | Obtenido |
|---|---|---|---|
| F-UNI-036 |  › AdminUsers — validación y confirmación del motivo de baneo › deshabilita el botón de confirmar baneo si el motivo tiene menos de 4 caracteres | `expect(screen.getByRole('button', { name: /confirmar baneo/i })).toBeDisabled()`<br>`expect(banUserMock).not.toHaveBeenCalled()` | Pasa (731 ms) |
| F-UNI-037 |  › AdminUsers — validación y confirmación del motivo de baneo › ejecuta adminService.banUser(id, reason) y actualiza la lista cuando el motivo es válido | `expect(confirmBtn).toBeEnabled()`<br>`expect(banUserMock).toHaveBeenCalledWith('user-2', 'spam')`<br>`expect(screen.getByText(/baneado/i)).toBeInTheDocument()` | Pasa (211 ms) |

### `test/unit/gestion-usuarios/consultar-usuarios.test.tsx`

| ID | Objetivo | Resultado esperado | Obtenido |
|---|---|---|---|
| F-UNI-038 |  › AdminUsers — carga, búsqueda y paginación de usuarios › carga la lista de usuarios al montar, con page=1 y sin filtro | `expect(getUsersMock).toHaveBeenCalledWith(1, undefined)` | Pasa (114 ms) |
| F-UNI-039 |  › AdminUsers — carga, búsqueda y paginación de usuarios › espera el debounce, resetea a la página 1 y busca con el término escrito | `expect(getUsersMock).toHaveBeenCalledWith(1, 'ana')` | Pasa (622 ms) |
| F-UNI-040 |  › AdminUsers — carga, búsqueda y paginación de usuarios › al hacer click en "Siguiente" solicita la página 2 | `expect(getUsersMock).toHaveBeenCalledWith(2, undefined)` | Pasa (153 ms) |

### `test/unit/gestion-usuarios/role-change.test.tsx`

| ID | Objetivo | Resultado esperado | Obtenido |
|---|---|---|---|
| F-UNI-041 |  › AdminUsers — cambio de rol de usuario › llama a changeRole(id, "ADMIN") al hacer admin a un cliente | `expect(changeRoleMock).toHaveBeenCalledWith('user-5', 'ADMIN')`<br>`expect(screen.getByText(/^admin$/i)).toBeInTheDocument()` | Pasa (393 ms) |
| F-UNI-042 |  › AdminUsers — cambio de rol de usuario › llama a changeRole(id, "USER") al quitarle el rol admin a otro usuario | `expect(changeRoleMock).toHaveBeenCalledWith('user-6', 'USER')`<br>`expect(row.querySelector('.cp-badge')?.textContent).toMatch(/usuario/i)` | Pasa (201 ms) |
| F-UNI-043 |  › AdminUsers — cambio de rol de usuario › no ofrece el botón de cambio de rol en la fila del propio admin | `expect(`<br>`expect(changeRoleMock).not.toHaveBeenCalled()` | Pasa (64 ms) |
| F-UNI-044 |  › AdminUsers — cambio de rol de usuario › deshabilita el botón de cambio de rol mientras la petición está en curso | `expect(btn).toBeDisabled()` | Pasa (81 ms) |

### `test/unit/gestion-usuarios/self-protection.test.tsx`

| ID | Objetivo | Resultado esperado | Obtenido |
|---|---|---|---|
| F-UNI-045 |  › AdminUsers — guardia de auto-protección y estado de la fila › no muestra botones de banear/desbanear en la fila del propio admin | `expect(within(row).queryByRole('button', { name: /banear/i })).not.toBeInTheDocument()`<br>`expect(within(row).queryByRole('button', { name: /desbanear/i })).not.toBeInTheDocument()` | Pasa (127 ms) |
| F-UNI-046 |  › AdminUsers — guardia de auto-protección y estado de la fila › muestra el botón "Desbanear" en la fila de otro usuario baneado | `expect(within(row).getByRole('button', { name: /desbanear/i })).toBeInTheDocument()`<br>`expect(within(row).queryByRole('button', { name: /^banear/i })).not.toBeInTheDocument()` | Pasa (254 ms) |
| F-UNI-047 |  › AdminUsers — guardia de auto-protección y estado de la fila › muestra el botón "Banear" en la fila de otro usuario activo | `expect(within(row).getByRole('button', { name: /^banear/i })).toBeInTheDocument()`<br>`expect(within(row).queryByRole('button', { name: /desbanear/i })).not.toBeInTheDocument()` | Pasa (91 ms) |

### `test/unit/gestion-usuarios/unban-flow.test.tsx`

| ID | Objetivo | Resultado esperado | Obtenido |
|---|---|---|---|
| F-UNI-048 |  › AdminUsers — ejecución del desbaneo › ejecuta adminService.unbanUser(id) y refleja el estado "Activo" al confirmar | `expect(unbanUserMock).toHaveBeenCalledWith('user-3')`<br>`expect(screen.getByText(/activo/i)).toBeInTheDocument()` | Pasa (394 ms) |
| F-UNI-049 |  › AdminUsers — ejecución del desbaneo › deshabilita el botón "Desbanear" mientras la petición está en curso | `expect(btn).toBeDisabled()` | Pasa (94 ms) |

### `test/unit/inventario/phone-form-min-stock.test.tsx`

| ID | Objetivo | Resultado esperado | Obtenido |
|---|---|---|---|
| F-UNI-050 |  › PhoneForm — stock mínimo de la alerta › un celular nuevo propone 5, el mismo valor por defecto que el backend | `expect(screen.getByLabelText(/stock mínimo/i)).toHaveValue(5)` | Pasa (102 ms) |
| F-UNI-051 |  › PhoneForm — stock mínimo de la alerta › al editar carga el umbral guardado y envía el nuevo | `await waitFor(() => expect(campo).toHaveValue(3))`<br>`expect(phonesService.update).toHaveBeenCalledWith('phone-1', expect.objectContaining({ minStock: 8 })),` | Pasa (361 ms) |
| F-UNI-052 |  › PhoneForm — stock mínimo de la alerta › rechaza un umbral negativo | `expect(await screen.findAllByText('No puede ser negativo')).not.toHaveLength(0)`<br>`expect(phonesService.create).not.toHaveBeenCalled()` | Pasa (151 ms) |

### `test/unit/inventario/stock-alerts.test.tsx`

| ID | Objetivo | Resultado esperado | Obtenido |
|---|---|---|---|
| F-UNI-053 |  › AdminDashboard — alertas de stock bajo › notifica al administrador cuando hay alertas de inventario abiertas | `expect(within(panel).getByText(/alertas de inventario \(2\)/i)).toBeInTheDocument()`<br>`expect(`<br>`expect(within(panel).getByText(/sin stock/i)).toBeInTheDocument()`<br>(+1 aserciones más) | Pasa (222 ms) |
| F-UNI-054 |  › AdminDashboard — alertas de stock bajo › no muestra el panel de alertas cuando no hay ninguna abierta | `expect(screen.queryByTestId('stock-alerts')).not.toBeInTheDocument()` | Pasa (29 ms) |
| F-UNI-055 |  › AdminDashboard — alertas de stock bajo › el dashboard se sigue viendo con normalidad si getAlerts() rechaza | `expect(await screen.findByText('Panel')).toBeInTheDocument()`<br>`expect(screen.queryByTestId('stock-alerts')).not.toBeInTheDocument()` | Pasa (26 ms) |

### `test/unit/login/login.normalizacion.test.tsx`

| ID | Objetivo | Resultado esperado | Obtenido |
|---|---|---|---|
| F-UNI-056 |  › Login — inicio de sesión › envía el correo en minúsculas y sin espacios | `await waitFor(() => expect(loginFn).toHaveBeenCalledWith('ana@gmail.com', 'Password123'))` | Pasa (601 ms) |
| F-UNI-057 |  › Login — inicio de sesión › muestra "Credenciales inválidas" cuando el servidor responde 401 | `expect(await screen.findByText('Credenciales inválidas')).toBeInTheDocument()` | Pasa (208 ms) |
| F-UNI-058 |  › Login — inicio de sesión › muestra el aviso que dejó el interceptor al cerrar la sesión | `expect(screen.getByTestId('aviso-sesion')).toHaveTextContent('Motivo: fraude')`<br>`expect(sessionStorage.getItem('cp_auth_notice')).toBeNull()` | Pasa (18 ms) |

### `test/unit/login/login.schema.test.tsx`

| ID | Objetivo | Resultado esperado | Obtenido |
|---|---|---|---|
| F-UNI-059 |  › Login — validación del esquema del formulario › muestra "Email inválido" con un correo mal formado | `expect(screen.getByText('Email inválido')).toBeInTheDocument()` | Pasa (665 ms) |
| F-UNI-060 |  › Login — validación del esquema del formulario › muestra "La contraseña es requerida" si el password está vacío | `expect(screen.getByText('La contraseña es requerida')).toBeInTheDocument()` | Pasa (139 ms) |
| F-UNI-061 |  › Login — validación del esquema del formulario › no muestra errores de validación con datos correctos | `expect(loginFn).toHaveBeenCalled()`<br>`expect(screen.queryByText('Email inválido')).not.toBeInTheDocument()`<br>`expect(screen.queryByText('La contraseña es requerida')).not.toBeInTheDocument()` | Pasa (220 ms) |

### `test/unit/login/login.submit.test.tsx`

| ID | Objetivo | Resultado esperado | Obtenido |
|---|---|---|---|
| F-UNI-062 |  › Login — envío de credenciales y autenticación › redirige de inmediato a /dashboard si ya hay sesión activa | `expect(screen.getByText('Dashboard')).toBeInTheDocument()`<br>`expect(screen.queryByRole('button', { name: /ingresar/i })).not.toBeInTheDocument()` | Pasa (41 ms) |
| F-UNI-063 |  › Login — envío de credenciales y autenticación › inicia sesión y navega a /dashboard cuando login() resuelve sin error | `expect(loginFn).toHaveBeenCalledWith('user@gmail.com', 'password123')`<br>`expect(navigateMock).toHaveBeenCalledWith('/dashboard')` | Pasa (528 ms) |
| F-UNI-064 |  › Login — envío de credenciales y autenticación › muestra el mensaje de error y permanece en /login cuando login() rechaza | `expect(screen.getByText('Credenciales inválidas')).toBeInTheDocument()`<br>`expect(navigateMock).not.toHaveBeenCalled()`<br>`expect(screen.queryByText('Dashboard')).not.toBeInTheDocument()` | Pasa (269 ms) |

### `test/unit/pedidos/admin-orders.test.tsx`

| ID | Objetivo | Resultado esperado | Obtenido |
|---|---|---|---|
| F-UNI-065 |  › AdminOrders — listar todos los pedidos › lista todas las órdenes que devuelve getAllOrders(), sin filtrar por usuario | `expect(await screen.findByText('CP-0001')).toBeInTheDocument()`<br>`expect(screen.getByText('CP-0002')).toBeInTheDocument()`<br>`expect(screen.getByText('2 órdenes totales')).toBeInTheDocument()`<br>(+1 aserciones más) | Pasa (119 ms) |
| F-UNI-066 |  › AdminOrders — actualizar estado de una orden › llama a updateOrderStatus(id, status) y refleja el nuevo estado en la fila | `expect(adminService.updateOrderStatus).toHaveBeenCalledWith('order-1', 'CONFIRMED')`<br>`expect(row.querySelector('.cp-badge')?.textContent).toBe('Confirmado')` | Pasa (228 ms) |
| F-UNI-067 |  › AdminOrders — actualizar estado de una orden › deshabilita el selector de estado mientras la actualización está en curso | `expect(select).toBeDisabled()` | Pasa (61 ms) |
| F-UNI-068 |  › AdminOrders — actualizar estado de una orden › conserva el estado anterior si updateOrderStatus() rechaza | `expect(row.querySelector('.cp-badge')?.textContent).toBe('Pendiente')` | Pasa (72 ms) |

### `test/unit/pedidos/checkout-submit.test.tsx`

| ID | Objetivo | Resultado esperado | Obtenido |
|---|---|---|---|
| F-UNI-069 |  › Checkout — crear orden › redirige a /catalog si el carrito está vacío | `expect(screen.getByText('Catálogo')).toBeInTheDocument()` | Pasa (36 ms) |
| F-UNI-070 |  › Checkout — crear orden › crea la orden con los items del carrito y navega al dashboard con la referencia | `expect(ordersService.create).toHaveBeenCalledWith(`<br>`expect(clearCartMock).toHaveBeenCalledTimes(1)`<br>`expect(navigateMock).toHaveBeenCalledWith('/dashboard?order=CP-0042')` | Pasa (626 ms) |
| F-UNI-071 |  › Checkout — crear orden › muestra un error y permanece en /checkout cuando ordersService.create() rechaza | `expect(await screen.findByText(/stock insuficiente/i)).toBeInTheDocument()`<br>`expect(clearCartMock).not.toHaveBeenCalled()`<br>`expect(navigateMock).not.toHaveBeenCalled()` | Pasa (331 ms) |
| F-UNI-072 |  › Checkout — crear orden › no llama a ordersService.create() si el email no es válido | `expect(await screen.findByText('Email inválido')).toBeInTheDocument()`<br>`expect(ordersService.create).not.toHaveBeenCalled()` | Pasa (99 ms) |

### `test/unit/pedidos/dashboard-my-orders.test.tsx`

| ID | Objetivo | Resultado esperado | Obtenido |
|---|---|---|---|
| F-UNI-073 |  › Dashboard — listar pedidos del usuario autenticado › muestra el indicador de carga mientras llegan los pedidos | `expect(screen.getByText(/cargando pedidos/i)).toBeInTheDocument()` | Pasa (51 ms) |
| F-UNI-074 |  › Dashboard — listar pedidos del usuario autenticado › lista únicamente los pedidos que devuelve getMyOrders() | `expect(await screen.findByText('CP-0001')).toBeInTheDocument()`<br>`expect(screen.getByText('CP-0002')).toBeInTheDocument()`<br>`expect(ordersService.getMyOrders).toHaveBeenCalledTimes(1)` | Pasa (66 ms) |
| F-UNI-075 |  › Dashboard — listar pedidos del usuario autenticado › muestra el estado vacío cuando el usuario no tiene pedidos | `expect(`<br>`expect(screen.getByRole('link', { name: /ver catálogo/i })).toBeInTheDocument()` | Pasa (193 ms) |
| F-UNI-076 |  › Dashboard — listar pedidos del usuario autenticado › cae al estado vacío en vez de quedarse cargando si getMyOrders() rechaza | `expect(` | Pasa (13 ms) |

### `test/unit/registro/register.email-domain.test.tsx`

| ID | Objetivo | Resultado esperado | Obtenido |
|---|---|---|---|
| F-UNI-077 |  › Register — validación del dominio de correo › muestra "Correo electrónico inválido" con un formato incorrecto | `expect(screen.getByText('Correo electrónico inválido')).toBeInTheDocument()` | Pasa (655 ms) |
| F-UNI-078 |  › Register — validación del dominio de correo › muestra el mensaje de dominio no permitido con user@empresa.com | `expect(` | Pasa (333 ms) |
| F-UNI-079 |  › Register — validación del dominio de correo › no muestra error de email con un dominio permitido (user@gmail.com) | `expect(registerFn).toHaveBeenCalled()`<br>`expect(screen.queryByText(/Correo electrónico inválido/)).not.toBeInTheDocument()`<br>`expect(screen.queryByText(/Correo inválido/)).not.toBeInTheDocument()` | Pasa (207 ms) |

### `test/unit/registro/register.password-policy.test.tsx`

| ID | Objetivo | Resultado esperado | Obtenido |
|---|---|---|---|
| F-UNI-080 |  › Register — política de contraseñas › muestra la ayuda con las reglas antes de escribir | `expect(screen.getByText(/mínimo 8 caracteres, con mayúscula, minúscula y número/i)).toBeInTheDocument()` | Pasa (77 ms) |
| F-UNI-081 |  › Register — política de contraseñas › bloquea una contraseña sin mayúscula y no llama a la API | `expect(`<br>`expect(registerFn).not.toHaveBeenCalled()` | Pasa (670 ms) |
| F-UNI-082 |  › Register — política de contraseñas › envía el correo normalizado cuando todo es válido | `expect(registerFn).toHaveBeenCalledWith('ana@gmail.com', 'Ana Pérez', 'Password123'),` | Pasa (372 ms) |

### `test/unit/registro/register.submit.test.tsx`

| ID | Objetivo | Resultado esperado | Obtenido |
|---|---|---|---|
| F-UNI-083 |  › Register — envío del formulario › crea la cuenta y navega a /dashboard cuando registerUser() resuelve sin error | `expect(registerFn).toHaveBeenCalledWith('user@gmail.com', 'Mario', 'Password123')`<br>`expect(navigateMock).toHaveBeenCalledWith('/dashboard')` | Pasa (717 ms) |
| F-UNI-084 |  › Register — envío del formulario › muestra el mensaje de error del servidor y no navega si registerUser() rechaza | `expect(screen.getByText('El email ya está registrado')).toBeInTheDocument()`<br>`expect(navigateMock).not.toHaveBeenCalled()` | Pasa (345 ms) |

### `test/unit/validacion-credenciales/api-interceptor.test.ts`

| ID | Objetivo | Resultado esperado | Obtenido |
|---|---|---|---|
| F-UNI-085 |  › interceptor de respuesta — sesión vencida (401) › propaga el error sin tocar la sesión si el status no es 401 ni 403 | `await expect(getResponseErrorHandler()(error)).rejects.toBe(error)`<br>`expect(localStorage.getItem('cp_token')).toBe('fake-token')`<br>`expect(window.location.href).toBe('')` | Pasa (2 ms) |
| F-UNI-086 |  › interceptor de respuesta — sesión vencida (401) › un 401 en una ruta protegida limpia la sesión, deja un aviso y redirige a /login | `await expect(getResponseErrorHandler()(error)).rejects.toBe(error)`<br>`expect(localStorage.getItem('cp_token')).toBeNull()`<br>`expect(localStorage.getItem('cp_user')).toBeNull()`<br>(+2 aserciones más) | Pasa (1 ms) |
| F-UNI-087 |  › interceptor de respuesta — credenciales incorrectas › un 401 en /auth/login NO redirige: el formulario muestra el error | `await expect(getResponseErrorHandler()(error)).rejects.toBe(error)`<br>`expect(window.location.href).toBe('')`<br>`expect(localStorage.getItem('cp_token')).toBe('fake-token')` | Pasa (1 ms) |
| F-UNI-088 |  › interceptor de respuesta — credenciales incorrectas › un 401 en /auth/register NO redirige: el formulario muestra el error | `await expect(getResponseErrorHandler()(error)).rejects.toBe(error)`<br>`expect(window.location.href).toBe('')`<br>`expect(localStorage.getItem('cp_token')).toBe('fake-token')` | Pasa (0 ms) |
| F-UNI-089 |  › interceptor de respuesta — cuenta suspendida (403) › cierra la sesión y guarda el motivo para mostrarlo en /login | `await expect(getResponseErrorHandler()(error)).rejects.toBe(error)`<br>`expect(localStorage.getItem('cp_token')).toBeNull()`<br>`expect(window.location.href).toBe('/login')`<br>(+1 aserciones más) | Pasa (1 ms) |
| F-UNI-090 |  › interceptor de respuesta — cuenta suspendida (403) › un 403 de suspensión en /auth/login no recarga: el formulario muestra el motivo | `await expect(getResponseErrorHandler()(error)).rejects.toBe(error)`<br>`expect(window.location.href).toBe('')`<br>`expect(consumirAvisoDeSesion()).toBeNull()` | Pasa (0 ms) |
| F-UNI-091 |  › interceptor de respuesta — cuenta suspendida (403) › un 403 por falta de rol (no suspensión) no cierra la sesión | `await expect(getResponseErrorHandler()(error)).rejects.toBe(error)`<br>`expect(localStorage.getItem('cp_token')).toBe('fake-token')`<br>`expect(window.location.href).toBe('')` | Pasa (0 ms) |
| F-UNI-092 |  › consumirAvisoDeSesion › devuelve el aviso una sola vez | `expect(consumirAvisoDeSesion()).toBe('aviso')`<br>`expect(consumirAvisoDeSesion()).toBeNull()` | Pasa (0 ms) |

### `test/unit/validacion-credenciales/auth-guard.test.tsx`

| ID | Objetivo | Resultado esperado | Obtenido |
|---|---|---|---|
| F-UNI-093 |  › Guardia de acceso a formularios de auth con sesión activa › Login redirige de inmediato a /dashboard si hay sesión activa | `expect(screen.getByText('Dashboard')).toBeInTheDocument()` | Pasa (39 ms) |
| F-UNI-094 |  › Guardia de acceso a formularios de auth con sesión activa › Register redirige de inmediato a /dashboard si hay sesión activa | `expect(screen.getByText('Dashboard')).toBeInTheDocument()` | Pasa (6 ms) |
| F-UNI-095 |  › Guardia de acceso a formularios de auth con sesión activa › muestra el formulario de login/registro si no hay sesión activa | `expect(screen.getByRole('button', { name: /ingresar/i })).toBeInTheDocument()`<br>`expect(screen.queryByText('Dashboard')).not.toBeInTheDocument()` | Pasa (225 ms) |

### `test/unit/validacion-credenciales/credenciales.schema.test.ts`

| ID | Objetivo | Resultado esperado | Obtenido |
|---|---|---|---|
| F-UNI-096 |  › loginSchema › normaliza el correo a minúsculas y sin espacios | `expect(r.success && r.data.email).toBe('ana@gmail.com')` | Pasa (2 ms) |
| F-UNI-097 |  › loginSchema › no exige dominio permitido (el admin usa @celularpro.co) | `expect(loginSchema.safeParse({ email: 'admin@celularpro.co', password: 'x' }).success).toBe(true)` | Pasa (1 ms) |
| F-UNI-098 |  › registroSchema › acepta un registro válido | `expect(registroSchema.safeParse(registroValido).success).toBe(true)` | Pasa (1 ms) |
| F-UNI-099 |  › registroSchema › rechaza un dominio no permitido | `expect(mensajes(registroSchema.safeParse({ ...registroValido, email: 'a@empresa.com' }))).toContain(` | Pasa (1 ms) |
| F-UNI-100 |  › registroSchema › rechaza una contraseña sin mayúscula | `expect(mensajes(r)).toContain(mensaje)` | Pasa (1 ms) |
| F-UNI-101 |  › registroSchema › rechaza una contraseña sin minúscula | `expect(mensajes(r)).toContain(mensaje)` | Pasa (0 ms) |
| F-UNI-102 |  › registroSchema › rechaza una contraseña sin número | `expect(mensajes(r)).toContain(mensaje)` | Pasa (0 ms) |
| F-UNI-103 |  › registroSchema › rechaza una contraseña corta | `expect(mensajes(r)).toContain(mensaje)` | Pasa (1 ms) |
| F-UNI-104 |  › registroSchema › exige que la confirmación coincida | `expect(mensajes(r)).toEqual(['Las contraseñas no coinciden'])` | Pasa (1 ms) |
| F-UNI-105 |  › perfilSchema y cambioPasswordSchema › recorta el nombre y exige al menos 2 caracteres | `expect(perfilSchema.safeParse({ name: '  A ' }).success).toBe(false)`<br>`expect(r.success && r.data.name).toBe('Ana')` | Pasa (0 ms) |
| F-UNI-106 |  › perfilSchema y cambioPasswordSchema › no permite repetir la contraseña actual | `expect(mensajes(r)).toContain('La nueva contraseña debe ser distinta de la actual')` | Pasa (0 ms) |
| F-UNI-107 |  › perfilSchema y cambioPasswordSchema › acepta un cambio válido | `expect(` | Pasa (1 ms) |

## Aserciones fluidas

Evidencia: `docs/evidencias/unitarias/resultado.json`.

### `test/fluent/asserciones-fluidas.test.ts`

| ID | Objetivo | Resultado esperado | Obtenido |
|---|---|---|---|
| F-FLU-001 |  › calcularTotales — aserciones fluidas › expone subtotal, envío y total como un objeto fluido | `expect(totales, 'totales de un carrito de 250.000').to.deep.equal({` | Pasa (2 ms) |
| F-FLU-002 |  › calcularTotales — aserciones fluidas › el carrito vacío no cobra envío ni tiene total negativo | `expect(totales.subtotal, 'subtotal de un carrito vacío').to.equal(0)`<br>`expect(totales.total, 'total de un carrito vacío').to.be.at.least(0)` | Pasa (1 ms) |
| F-FLU-003 |  › calcularTotales — aserciones fluidas › el envío es gratis por encima del umbral configurado | `expect(calcularTotales(items).shipping, 'envío justo sobre el umbral').to.equal(0)` | Pasa (0 ms) |
| F-FLU-004 |  › checkoutSchema — aserciones fluidas sobre excepciones › acepta datos completos y válidos | `expect(resultado.success, 'checkout con todos los campos válidos').to.be.true` | Pasa (1 ms) |
| F-FLU-005 |  › checkoutSchema — aserciones fluidas sobre excepciones › rechaza un email mal formado con el mensaje exacto que ve el usuario | `expect(resultado.success, 'checkout con email inválido').to.be.false`<br>`expect(resultado.error.issues.map((i) => i.message), 'mensajes de error del schema')` | Pasa (1 ms) |
| F-FLU-006 |  › checkoutSchema — aserciones fluidas sobre excepciones › exige una dirección de al menos 5 caracteres | `expect(resultado.success, 'dirección demasiado corta').to.be.false` | Pasa (0 ms) |

### `test/fluent/credenciales.test.ts`

| ID | Objetivo | Resultado esperado | Obtenido |
|---|---|---|---|
| F-FLU-007 |  › Validación de credenciales — fluido › los dominios permitidos son los mismos cinco del backend | `expect([...DOMINIOS_PERMITIDOS], 'dominios permitidos')` | Pasa (2 ms) |
| F-FLU-008 |  › Validación de credenciales — fluido › normaliza y valida el dominio sin importar mayúsculas | `expect(normalizarEmail('  ANA@Gmail.com '), 'correo normalizado').to.equal('ana@gmail.com')`<br>`expect(dominioPermitido('ana@EMPRESA.com'), 'dominio no permitido').to.be.false` | Pasa (0 ms) |
| F-FLU-009 |  › Registro e inicio de sesión — fluido › el registro entrega los datos limpios | `expect(r.success, 'registro válido').to.be.true`<br>`expect(r.data, 'datos del registro').to.include({ name: 'Ana', email: 'ana@gmail.com' })` | Pasa (2 ms) |
| F-FLU-010 |  › Registro e inicio de sesión — fluido › una contraseña débil acumula los mensajes de cada regla | `expect(r.success, 'registro con contraseña débil').to.be.false`<br>`expect(r.error.issues.map((i) => i.message), 'mensajes')` | Pasa (1 ms) |
| F-FLU-011 |  › Registro e inicio de sesión — fluido › el login acepta correos fuera de la lista (cuentas existentes) | `expect(loginSchema.safeParse({ email: 'admin@celularpro.co', password: 'x' }).success, 'login admin')` | Pasa (0 ms) |
| F-FLU-012 |  › Alertas de stock bajo — contrato con la API (fluido) › una alerta abierta trae el celular con stock y mínimo | `expect(alerta, 'alerta').to.include({ type: 'LOW_STOCK', isResolved: false })`<br>`expect(alerta.phone, 'celular de la alerta')` | Pasa (1 ms) |

## Regresión

Evidencia: `docs/evidencias/unitarias/resultado.json`.

### `test/regression/regresion-credenciales.test.tsx`

| ID | Objetivo | Resultado esperado | Obtenido |
|---|---|---|---|
| F-REG-001 |  › Regresión — reglas alineadas con el backend › regresion_dominios_permitidos_son_cinco | `expect(DOMINIOS_PERMITIDOS).toEqual(['gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'icloud.com'])` | Pasa (2 ms) |
| F-REG-002 |  › Regresión — reglas alineadas con el backend › regresion_longitud_de_contrasena_entre_8_y_72 | `expect([PASSWORD_MIN, PASSWORD_MAX]).toEqual([8, 72])` | Pasa (1 ms) |
| F-REG-003 |  › Regresión — reglas alineadas con el backend › regresion_mensajes_identicos_a_los_del_backend | `expect(MENSAJE_DOMINIO).toBe('Correo inválido. Usa Gmail, Outlook, Hotmail, Yahoo o iCloud.')`<br>`expect(MENSAJES_PASSWORD.mayuscula).toBe('La contraseña debe incluir al menos una letra mayúscula')` | Pasa (0 ms) |
| F-REG-004 |  › Regresión — defectos corregidos › regresion_401_del_login_no_recarga_la_pagina | `await expect(rejected(error)).rejects.toBe(error)`<br>`expect(window.location.href).toBe('')` | Pasa (1 ms) |
| F-REG-005 |  › Regresión — defectos corregidos › regresion_enlace_admin_lleva_al_dashboard_con_las_alertas_de_stock | `expect(screen.getByRole('link', { name: 'Admin' })).toHaveAttribute('href', '/admin')` | Pasa (285 ms) |

### `test/regression/regresion.test.ts`

| ID | Objetivo | Resultado esperado | Obtenido |
|---|---|---|---|
| F-REG-006 |  › Regresión — resumen de precios del checkout (func. 22) › regresion_envio_gratis_a_partir_de_500_001 | `expect(totales.shipping).toBe(0)`<br>`expect(totales.total).toBe(500_001)` | Pasa (2 ms) |
| F-REG-007 |  › Regresión — resumen de precios del checkout (func. 22) › regresion_envio_tiene_costo_en_el_umbral_exacto_de_500_000 | `expect(totales.shipping).toBe(20_000)`<br>`expect(totales.total).toBe(520_000)` | Pasa (0 ms) |
| F-REG-008 |  › Regresión — resumen de precios del checkout (func. 22) › regresion_constantes_de_envio_coinciden_con_las_del_backend | `expect(UMBRAL_ENVIO_GRATIS).toBe(500_000)`<br>`expect(COSTO_ENVIO).toBe(20_000)` | Pasa (0 ms) |
| F-REG-009 |  › Regresión — resumen de precios del checkout (func. 22) › regresion_multiples_items_suman_precio_por_cantidad_no_por_linea | `expect(totales.subtotal).toBe(200_000)` | Pasa (0 ms) |

## E2E con el patrón Screenplay (Serenity/JS + Cucumber)

Evidencia: `docs/evidencias/e2e-screenplay/cucumber.json` y una captura de la pantalla final por escenario en `docs/evidencias/e2e-screenplay/capturas/`.

| ID | Característica | Objetivo (escenario) | Resultado esperado (Entonces) | Obtenido | Evidencia |
|---|---|---|---|---|---|
| F-E2E-001 | Alerta de stock bajo | Un celular llega al mínimo de inventario | Entonces él ve una alerta "Stock bajo" del celular de prueba con el texto "tiene 2 unidades" | Pasa (4 pasos, 1906 ms) | [captura](../evidencias/e2e-screenplay/capturas/alerta-stock--un-celular-llega-al-minimo-de-inventario--passed.png) |
| F-E2E-002 | Alerta de stock bajo | El umbral es inclusivo | Entonces él ve una alerta "Stock bajo" del celular de prueba con el texto "tiene 5 unidades" | Pasa (4 pasos, 2117 ms) | [captura](../evidencias/e2e-screenplay/capturas/alerta-stock--el-umbral-es-inclusivo--passed.png) |
| F-E2E-003 | Alerta de stock bajo | Un celular se queda sin unidades | Entonces él ve una alerta "Sin stock" del celular de prueba con el texto "se quedó sin unidades" | Pasa (4 pasos, 1541 ms) | [captura](../evidencias/e2e-screenplay/capturas/alerta-stock--un-celular-se-queda-sin-unidades--passed.png) |
| F-E2E-004 | Alerta de stock bajo | Reponer inventario cierra la alerta | Entonces él no ve ninguna alerta del celular de prueba | Pasa (5 pasos, 1704 ms) | [captura](../evidencias/e2e-screenplay/capturas/alerta-stock--reponer-inventario-cierra-la-alerta--passed.png) |
| F-E2E-005 | Alerta de stock bajo | El administrador configura el inventario y el mínimo desde el formulario | Entonces él ve una alerta "Stock bajo" del celular de prueba con el texto "tiene 3 unidades, en o por debajo del mínimo de 4" | Pasa (4 pasos, 2450 ms) | [captura](../evidencias/e2e-screenplay/capturas/alerta-stock--el-administrador-configura-el-inventario-y-el-minimo-desde-el-formulario--passed.png) |
| F-E2E-006 | Control de roles | Un visitante sin sesión es enviado a iniciar sesión | Entonces ella está en la página "/login" | Pasa (2 pasos, 662 ms) | [captura](../evidencias/e2e-screenplay/capturas/control-roles--un-visitante-sin-sesion-es-enviado-a-iniciar-sesion--passed.png) |
| F-E2E-007 | Control de roles | Un cliente no puede entrar al panel de administración | Entonces ella ve la página "Acceso no autorizado" | Pasa (4 pasos, 1532 ms) | [captura](../evidencias/e2e-screenplay/capturas/control-roles--un-cliente-no-puede-entrar-al-panel-de-administracion--passed.png) |
| F-E2E-008 | Control de roles | El administrador convierte a un cliente en administrador | Entonces ella ve el panel de administración | Pasa (6 pasos, 3490 ms) | [captura](../evidencias/e2e-screenplay/capturas/control-roles--el-administrador-convierte-a-un-cliente-en-administrador--passed.png) |
| F-E2E-009 | Control de roles | El administrador le quita el rol a otro administrador | Entonces ella ve la página "Acceso no autorizado" | Pasa (7 pasos, 4322 ms) | [captura](../evidencias/e2e-screenplay/capturas/control-roles--el-administrador-le-quita-el-rol-a-otro-administrador--passed.png) |
| F-E2E-010 | Gestión de perfil | Cambiar el nombre | Entonces ella ve la confirmación "Nombre actualizado"<br>Y el menú muestra su nombre "Valentina" | Pasa (5 pasos, 2241 ms) | [captura](../evidencias/e2e-screenplay/capturas/gestion-perfil--cambiar-el-nombre--passed.png) |
| F-E2E-011 | Gestión de perfil | Cambiar la contraseña y volver a ingresar con la nueva | Entonces ella ve la confirmación "Contraseña actualizada"<br>Y ella inicia sesión con la contraseña "Nueva4567"<br>Entonces ella ve su panel con el saludo "Hola, Carla" | Pasa (7 pasos, 3409 ms) | [captura](../evidencias/e2e-screenplay/capturas/gestion-perfil--cambiar-la-contrasena-y-volver-a-ingresar-con-la-nueva--passed.png) |
| F-E2E-012 | Gestión de perfil | La contraseña anterior deja de funcionar | Entonces ella ve el error del servidor "Credenciales inválidas" | Pasa (6 pasos, 3380 ms) | [captura](../evidencias/e2e-screenplay/capturas/gestion-perfil--la-contrasena-anterior-deja-de-funcionar--passed.png) |
| F-E2E-013 | Gestión de perfil | La contraseña actual es incorrecta | Entonces ella ve el error del servidor "La contraseña actual no es correcta"<br>Y ella sigue en la página "/profile" | Pasa (5 pasos, 2308 ms) | [captura](../evidencias/e2e-screenplay/capturas/gestion-perfil--la-contrasena-actual-es-incorrecta--passed.png) |
| F-E2E-014 | Inicio de sesión | Ingreso con credenciales correctas | Entonces ella ve su panel con el saludo "Hola, Carla" | Pasa (3 pasos, 1778 ms) | [captura](../evidencias/e2e-screenplay/capturas/inicio-sesion--ingreso-con-credenciales-correctas--passed.png) |
| F-E2E-015 | Inicio de sesión | Ingreso escribiendo el correo con mayúsculas | Entonces ella ve su panel con el saludo "Hola, Carla" | Pasa (3 pasos, 1272 ms) | [captura](../evidencias/e2e-screenplay/capturas/inicio-sesion--ingreso-escribiendo-el-correo-con-mayusculas--passed.png) |
| F-E2E-016 | Inicio de sesión | Cerrar sesión | Entonces ella está en la página "/login"<br>Y al abrir "/dashboard" la aplicación la devuelve a "/login" | Pasa (5 pasos, 1826 ms) | [captura](../evidencias/e2e-screenplay/capturas/inicio-sesion--cerrar-sesion--passed.png) |
| F-E2E-017 | Registro de usuario | Crear una cuenta nueva | Entonces ella ve su panel con el saludo "Hola, Carla"<br>Y el menú muestra su nombre "Carla" | Pasa (3 pasos, 1393 ms) | [captura](../evidencias/e2e-screenplay/capturas/registro--crear-una-cuenta-nueva--passed.png) |
| F-E2E-018 | Registro de usuario | El correo ya tiene una cuenta | Entonces ella ve el error del servidor "El email ya está registrado"<br>Y ella sigue en la página "/register" | Pasa (4 pasos, 1459 ms) | [captura](../evidencias/e2e-screenplay/capturas/registro--el-correo-ya-tiene-una-cuenta--passed.png) |
| F-E2E-019 | Validación de credenciales | Contraseña incorrecta | Entonces ella ve el error del servidor "Credenciales inválidas"<br>Y ella sigue en la página "/login" | Pasa (4 pasos, 1455 ms) | [captura](../evidencias/e2e-screenplay/capturas/validacion-credenciales--contrasena-incorrecta--passed.png) |
| F-E2E-020 | Validación de credenciales | Contraseña que no cumple la política | Entonces ella ve el aviso del campo "La contraseña debe tener al menos 8 caracteres"<br>Y ella sigue en la página "/register" | Pasa (3 pasos, 1648 ms) | [captura](../evidencias/e2e-screenplay/capturas/validacion-credenciales--contrasena-que-no-cumple-la-politica--passed.png) |
| F-E2E-021 | Validación de credenciales | Contraseña que no cumple la política | Entonces ella ve el aviso del campo "La contraseña debe incluir al menos una letra mayúscula"<br>Y ella sigue en la página "/register" | Pasa (3 pasos, 1498 ms) | [captura](../evidencias/e2e-screenplay/capturas/validacion-credenciales--contrasena-que-no-cumple-la-politica-2--passed.png) |
| F-E2E-022 | Validación de credenciales | Contraseña que no cumple la política | Entonces ella ve el aviso del campo "La contraseña debe incluir al menos una letra minúscula"<br>Y ella sigue en la página "/register" | Pasa (3 pasos, 1558 ms) | [captura](../evidencias/e2e-screenplay/capturas/validacion-credenciales--contrasena-que-no-cumple-la-politica-3--passed.png) |
| F-E2E-023 | Validación de credenciales | Contraseña que no cumple la política | Entonces ella ve el aviso del campo "La contraseña debe incluir al menos un número"<br>Y ella sigue en la página "/register" | Pasa (3 pasos, 1627 ms) | [captura](../evidencias/e2e-screenplay/capturas/validacion-credenciales--contrasena-que-no-cumple-la-politica-4--passed.png) |
| F-E2E-024 | Validación de credenciales | Correo con un dominio no permitido | Entonces ella ve el aviso del campo "Correo inválido. Usa Gmail, Outlook, Hotmail, Yahoo o iCloud." | Pasa (2 pasos, 1602 ms) | [captura](../evidencias/e2e-screenplay/capturas/validacion-credenciales--correo-con-un-dominio-no-permitido--passed.png) |
| F-E2E-025 | Validación de credenciales | Las contraseñas no coinciden | Entonces ella ve el aviso del campo "Las contraseñas no coinciden" | Pasa (2 pasos, 1484 ms) | [captura](../evidencias/e2e-screenplay/capturas/validacion-credenciales--las-contrasenas-no-coinciden--passed.png) |
| F-E2E-026 | Validación de credenciales | Una cuenta suspendida no puede ingresar | Entonces ella ve el error del servidor "Tu cuenta ha sido suspendida. Motivo: Fraude en pagos" | Pasa (4 pasos, 1298 ms) | [captura](../evidencias/e2e-screenplay/capturas/validacion-credenciales--una-cuenta-suspendida-no-puede-ingresar--passed.png) |

## E2E con Katalon Recorder

Suite `e2e/katalon/Suite_CelularPro_6_funcionalidades.html`, ejecutada con el intérprete `e2e/katalon/validar-suite.ts`. Evidencia: `docs/evidencias/katalon/resultado.json` (resultado de cada comando) y una captura por caso.

| ID | Objetivo (caso) | Resultado esperado (verificaciones) | Obtenido | Evidencia |
|---|---|---|---|---|
| F-KAT-01 | TC01_Registro_usuario | `waitForElementPresent \| xpath=//h1[contains(.,'Hola, Katalon')]`<br>`assertLocation \| glob:*/dashboard`<br>`assertText \| css=header a[href="/dashboard"] \| glob:Katalon` | Pasa (15 comandos, 2046 ms) | [captura](../evidencias/katalon/TC01_Registro_usuario.png) |
| F-KAT-02 | TC02_Inicio_sesion | `waitForElementPresent \| xpath=//h1[contains(.,'Hola, Katalon')]`<br>`assertLocation \| glob:*/dashboard`<br>`assertLocation \| glob:*/login`<br>`waitForElementPresent \| xpath=//h1[contains(.,'Hola, Katalon')]`<br>`assertLocation \| glob:*/dashboard`<br>(+2 más) | Pasa (30 comandos, 3410 ms) | [captura](../evidencias/katalon/TC02_Inicio_sesion.png) |
| F-KAT-03 | TC03_Validacion_credenciales | `assertText \| css=[data-testid="error-servidor"] \| glob:Credenciales inválidas`<br>`assertLocation \| glob:*/login`<br>`assertText \| xpath=//p[contains(@class,'cp-field-error') and contains(.,'mayúscula')] \| glob:La c...`<br>`assertText \| xpath=//p[contains(@class,'cp-field-error') and contains(.,'Usa Gmail')] \| glob:Corr...`<br>`assertElementNotPresent \| xpath=//p[contains(@class,'cp-field-error') and contains(.,'mayúscula')]`<br>(+1 más) | Pasa (29 comandos, 3311 ms) | [captura](../evidencias/katalon/TC03_Validacion_credenciales.png) |
| F-KAT-04 | TC04_Gestion_perfil | `waitForElementPresent \| xpath=//h1[contains(.,'Hola, Katalon')]`<br>`assertLocation \| glob:*/dashboard`<br>`assertText \| css=[data-testid="perfil-rol"] \| glob:Cliente`<br>`assertText \| css=[role="status"] \| glob:Contraseña actualizada*`<br>`assertLocation \| glob:*/login`<br>(+3 más) | Pasa (43 comandos, 5911 ms) | [captura](../evidencias/katalon/TC04_Gestion_perfil.png) |
| F-KAT-05 | TC05_Control_roles | `assertLocation \| glob:*/login`<br>`waitForElementPresent \| xpath=//h1[contains(.,'Hola, Katalon')]`<br>`assertLocation \| glob:*/dashboard`<br>`waitForElementPresent \| xpath=//h1[contains(.,'Acceso no autorizado')]`<br>`assertText \| css=h1 \| glob:Acceso no autorizado`<br>(+6 más) | Pasa (46 comandos, 5464 ms) | [captura](../evidencias/katalon/TC05_Control_roles.png) |
| F-KAT-06 | TC06_Alerta_stock_bajo | `waitForElementPresent \| xpath=//h1[contains(.,'Hola')]`<br>`assertLocation \| glob:*/dashboard`<br>`assertLocation \| glob:*/admin/phones`<br>`assertText \| xpath=//*[@data-testid='stock-alerts']//li[contains(.,'iPhone 13 (Usado)')]/span[2] ...`<br>`assertLocation \| glob:*/admin/phones`<br>(+3 más) | Pasa (49 comandos, 3699 ms) | [captura](../evidencias/katalon/TC06_Alerta_stock_bajo.png) |

## Accesibilidad automatizada — antes de corregir

WCAG 2.1 A/AA (axe-core). Evidencia: `docs/evidencias/accesibilidad/antes/resultado.json` y capturas en la misma carpeta.

| ID | Pantalla (rol) | Resultado esperado | Obtenido | Evidencia |
|---|---|---|---|---|
| F-A11Y-A01 | Inicio `/` (anonimo) | 0 violaciones WCAG 2.1 A/AA | **1 violaciones**<br>[serious] color-contrast (2) | [captura](../evidencias/accesibilidad/antes/_.png) |
| F-A11Y-A02 | Catálogo `/catalog` (anonimo) | 0 violaciones WCAG 2.1 A/AA | **2 violaciones**<br>[serious] color-contrast (2)<br>[critical] select-name (2) | [captura](../evidencias/accesibilidad/antes/_catalog.png) |
| F-A11Y-A03 | Iniciar sesión `/login` (anonimo) | 0 violaciones WCAG 2.1 A/AA | **1 violaciones**<br>[serious] link-in-text-block (1) | [captura](../evidencias/accesibilidad/antes/_login.png) |
| F-A11Y-A04 | Registro `/register` (anonimo) | 0 violaciones WCAG 2.1 A/AA | **1 violaciones**<br>[serious] link-in-text-block (1) | [captura](../evidencias/accesibilidad/antes/_register.png) |
| F-A11Y-A05 | Mis pedidos `/dashboard` (cliente) | 0 violaciones WCAG 2.1 A/AA | **1 violaciones**<br>[serious] color-contrast (2) | [captura](../evidencias/accesibilidad/antes/_dashboard.png) |
| F-A11Y-A06 | Mi perfil `/profile` (cliente) | 0 violaciones WCAG 2.1 A/AA | **1 violaciones**<br>[serious] color-contrast (3) | [captura](../evidencias/accesibilidad/antes/_profile.png) |
| F-A11Y-A07 | Panel de administración `/admin` (admin) | 0 violaciones WCAG 2.1 A/AA | **1 violaciones**<br>[serious] color-contrast (5) | [captura](../evidencias/accesibilidad/antes/_admin.png) |
| F-A11Y-A08 | Usuarios (admin) `/admin/users` (admin) | 0 violaciones WCAG 2.1 A/AA | **1 violaciones**<br>[serious] color-contrast (2) | [captura](../evidencias/accesibilidad/antes/_admin_users.png) |
| F-A11Y-A09 | Celulares (admin) `/admin/phones` (admin) | 0 violaciones WCAG 2.1 A/AA | **1 violaciones**<br>[serious] color-contrast (1) | [captura](../evidencias/accesibilidad/antes/_admin_phones.png) |
| F-A11Y-A10 | Acceso no autorizado `/unauthorized` (anonimo) | 0 violaciones WCAG 2.1 A/AA | **1 violaciones**<br>[serious] color-contrast (2) | [captura](../evidencias/accesibilidad/antes/_unauthorized.png) |

## Accesibilidad automatizada — después de corregir

WCAG 2.1 A/AA (axe-core). Evidencia: `docs/evidencias/accesibilidad/despues/resultado.json` y capturas en la misma carpeta.

| ID | Pantalla (rol) | Resultado esperado | Obtenido | Evidencia |
|---|---|---|---|---|
| F-A11Y-D01 | Inicio `/` (anonimo) | 0 violaciones WCAG 2.1 A/AA | Pasa (23 reglas evaluadas) | [captura](../evidencias/accesibilidad/despues/_.png) |
| F-A11Y-D02 | Catálogo `/catalog` (anonimo) | 0 violaciones WCAG 2.1 A/AA | Pasa (25 reglas evaluadas) | [captura](../evidencias/accesibilidad/despues/_catalog.png) |
| F-A11Y-D03 | Iniciar sesión `/login` (anonimo) | 0 violaciones WCAG 2.1 A/AA | Pasa (14 reglas evaluadas) | [captura](../evidencias/accesibilidad/despues/_login.png) |
| F-A11Y-D04 | Registro `/register` (anonimo) | 0 violaciones WCAG 2.1 A/AA | Pasa (19 reglas evaluadas) | [captura](../evidencias/accesibilidad/despues/_register.png) |
| F-A11Y-D05 | Mis pedidos `/dashboard` (cliente) | 0 violaciones WCAG 2.1 A/AA | Pasa (22 reglas evaluadas) | [captura](../evidencias/accesibilidad/despues/_dashboard.png) |
| F-A11Y-D06 | Mi perfil `/profile` (cliente) | 0 violaciones WCAG 2.1 A/AA | Pasa (27 reglas evaluadas) | [captura](../evidencias/accesibilidad/despues/_profile.png) |
| F-A11Y-D07 | Panel de administración `/admin` (admin) | 0 violaciones WCAG 2.1 A/AA | Pasa (12 reglas evaluadas) | [captura](../evidencias/accesibilidad/despues/_admin.png) |
| F-A11Y-D08 | Usuarios (admin) `/admin/users` (admin) | 0 violaciones WCAG 2.1 A/AA | Pasa (20 reglas evaluadas) | [captura](../evidencias/accesibilidad/despues/_admin_users.png) |
| F-A11Y-D09 | Celulares (admin) `/admin/phones` (admin) | 0 violaciones WCAG 2.1 A/AA | Pasa (13 reglas evaluadas) | [captura](../evidencias/accesibilidad/despues/_admin_phones.png) |
| F-A11Y-D10 | Acceso no autorizado `/unauthorized` (anonimo) | 0 violaciones WCAG 2.1 A/AA | Pasa (21 reglas evaluadas) | [captura](../evidencias/accesibilidad/despues/_unauthorized.png) |

## Interfaz

Evidencia: `docs/evidencias/interfaz/resultado.json` y capturas.

| ID | Objetivo | Resultado esperado | Obtenido | Evidencia |
|---|---|---|---|---|
| F-INT-I1-escritorio | Comprobar que las 10 pantallas se adaptan a 1366×768. | Ninguna pantalla se desplaza horizontalmente ni deja controles cortados fuera de la vista. | Pasa: Ninguna se desplaza ni corta controles. | 10 capturas `I1-escritorio*` |
| F-INT-I1-movil | Comprobar que las 10 pantallas se adaptan a 375×812. | Ninguna pantalla se desplaza horizontalmente ni deja controles cortados fuera de la vista. | Pasa: Ninguna se desplaza ni corta controles. | 10 capturas `I1-movil*` |
| F-INT-I2 | Comprobar que se puede iniciar sesión solo con el teclado. | Orden de foco Email → Contraseña → Ingresar, foco visible en cada paso y Enter envía el formulario. | Pasa: Orden: email → password → Ingresar; foco visible: sí; Enter navegó a /dashboard: sí. | [I2-foco-boton.png](../evidencias/interfaz/I2-foco-boton.png) |
| F-INT-I3 | Comprobar que enviar el registro vacío muestra un error junto a cada campo obligatorio. | Cuatro mensajes de error, los cuatro campos marcados aria-invalid y la página sigue en /register. | Pasa: 4 mensajes (El nombre debe tener al menos 2 caracteres \| Correo electrónico inválido \| La contraseña debe tener al menos 8 caracteres \| Confirma tu contraseña); campos inválidos: name, email, password, confirmPassword; ruta: /register. | [I3-registro-errores.png](../evidencias/interfaz/I3-registro-errores.png) |
| F-INT-I4 | Comprobar que guardar el perfil da retroalimentación inmediata. | Aparece "Nombre actualizado" y el menú muestra el nombre nuevo sin recargar. | Pasa: Confirmación visible: sí; menú: "Valentina". | [I4-perfil-confirmacion.png](../evidencias/interfaz/I4-perfil-confirmacion.png) |

## Cypress — componentes, API y regresión

**Pendiente de ejecución.** Ejecute `npm run cy:componentes`, `npm run cy:regresion` y `npm run cy:api` (ver docs/pruebas/01-regresion-api-componentes.md); Cypress guardará videos, capturas y reportes JUnit en `docs/evidencias/cypress/` y este catálogo los incluirá al regenerarse.

| ID | Archivo | Objetivo | Resultado esperado |
|---|---|---|---|
| F-CY-001 | `cypress/component/AdminDashboard.cy.tsx` | positivo: lista las alertas abiertas con su tipo y mensaje | `cy.get('[data-alertas-cargadas="true"]').should('exist')`<br>`cy.get('[data-testid="stock-alerts"] li').should('have.length', 2)`<br>`cy.get('[data-testid="stock-alerts"] li').first().should('contain.text', 'se quedó sin unidades')`<br>(+1 aserciones más) |
| F-CY-002 | `cypress/component/AdminDashboard.cy.tsx` | negativo: sin alertas no muestra el panel | `cy.get('[data-alertas-cargadas="true"]').should('exist')`<br>`cy.get('[data-testid="stock-alerts"]').should('not.exist')` |
| F-CY-003 | `cypress/component/AdminDashboard.cy.tsx` | negativo: si /admin/alerts falla, el resto del panel sigue funcionando | `cy.get('[data-alertas-cargadas="true"]').should('exist')`<br>`cy.get('h1').should('exist')`<br>`cy.get('[data-testid="stock-alerts"]').should('not.exist')` |
| F-CY-004 | `cypress/component/AdminRoute.cy.tsx` | negativo: sin sesión redirige a /login | `cy.get('[data-cy="ruta-destino"]').should('have.text', '/login')` |
| F-CY-005 | `cypress/component/AdminRoute.cy.tsx` | negativo: un cliente es enviado a /unauthorized | `cy.get('[data-cy="ruta-destino"]').should('have.text', '/unauthorized')` |
| F-CY-006 | `cypress/component/AdminRoute.cy.tsx` | positivo: un administrador ve el contenido | `cy.contains('h1', 'Zona de administración').should('be.visible')` |
| F-CY-007 | `cypress/component/AdminRoute.cy.tsx` | regresión: si el servidor dice que ya no es admin, pierde el acceso | `cy.get('[data-cy="ruta-destino"]').should('have.text', '/unauthorized')` |
| F-CY-008 | `cypress/component/Login.cy.tsx` | muestra los campos con etiqueta y el botón Ingresar | `cy.get('label[for="email"]').should('contain.text', 'Email')`<br>`cy.get('#email').should('have.attr', 'type', 'email')`<br>`cy.get('label[for="password"]').should('contain.text', 'Contraseña')`<br>(+2 aserciones más) |
| F-CY-009 | `cypress/component/Login.cy.tsx` | negativo: el formulario vacío marca los dos campos y no llama a la API | `cy.get('#email').should('have.attr', 'aria-invalid', 'true')`<br>`cy.get('#password-error').should('have.text', 'La contraseña es requerida')`<br>`cy.get('@login').should('not.have.been.called')` |
| F-CY-010 | `cypress/component/Login.cy.tsx` | positivo: envía el correo normalizado y lleva al panel | `cy.wait('@login').its('request.body').should('deep.equal', { email: 'carla@gmail.com', password: 'Segura123...`<br>`cy.get('[data-cy="ruta-destino"]').should('have.text', '/dashboard')`<br>`cy.window().its('localStorage').invoke('getItem', 'cp_token').should('eq', 'tok')` |
| F-CY-011 | `cypress/component/Login.cy.tsx` | negativo: credenciales incorrectas muestran el error sin salir del formulario | `cy.get('[data-testid="error-servidor"]').should('have.text', 'Credenciales inválidas')`<br>`cy.get('#email').should('have.value', 'carla@gmail.com')` |
| F-CY-012 | `cypress/component/Login.cy.tsx` | negativo: una cuenta suspendida ve el motivo | `cy.get('[data-testid="error-servidor"]').should('contain.text', 'Motivo: fraude')` |
| F-CY-013 | `cypress/component/Profile.cy.tsx` | muestra el correo y el tipo de cuenta | `cy.get('[data-testid="perfil-email"]').should('have.text', 'carla@gmail.com')`<br>`cy.get('[data-testid="perfil-rol"]').should('have.text', 'Cliente')`<br>`cy.get('#profile-name').should('have.value', 'Carla Rojas')` |
| F-CY-014 | `cypress/component/Profile.cy.tsx` | positivo: guarda el nombre y confirma | `cy.wait('@guardar').its('request.body').should('deep.equal', { name: 'Valentina Rojas' })`<br>`cy.contains('Nombre actualizado').should('be.visible')` |
| F-CY-015 | `cypress/component/Profile.cy.tsx` | negativo: el botón de guardar está deshabilitado sin cambios | `cy.contains('button', 'Guardar nombre').should('be.disabled')` |
| F-CY-016 | `cypress/component/Profile.cy.tsx` | positivo: cambia la contraseña y limpia el formulario | `cy.wait('@clave').its('request.body').should('deep.equal', { currentPassword: 'Segura123', newPassword: 'Nu...`<br>`cy.get('[role="status"]').should('contain.text', 'Contraseña actualizada')`<br>`cy.get('#current-password').should('have.value', '')` |
| F-CY-017 | `cypress/component/Profile.cy.tsx` | negativo: contraseña actual incorrecta muestra el error y no cierra la sesión | `cy.get('[data-testid="error-servidor"]').should('have.text', 'La contraseña actual no es correcta')`<br>`cy.window().its('localStorage').invoke('getItem', 'cp_token').should('eq', 'tok')` |
| F-CY-018 | `cypress/component/Register.cy.tsx` | muestra la política de contraseñas antes de escribir | `cy.get('#password-ayuda').should('have.text', 'Mínimo 8 caracteres, con mayúscula, minúscula y número')` |
| F-CY-019 | `cypress/component/Register.cy.tsx` | negativo: vacío muestra los cuatro errores | `cy.get('.cp-field-error').should('have.length', 4)`<br>`cy.get('[aria-invalid="true"]').should('have.length', 4)` |
| F-CY-020 | `cypress/component/Register.cy.tsx` | negativo: rechaza  | `cy.get('#password-error').should('have.text', mensaje)`<br>`cy.get('@registroEspia').should('not.have.been.called')` |
| F-CY-021 | `cypress/component/Register.cy.tsx` | negativo: rechaza un dominio no permitido | `cy.get('#email-error').should('have.text', 'Correo inválido. Usa Gmail, Outlook, Hotmail, Yahoo o iCloud.')` |
| F-CY-022 | `cypress/component/Register.cy.tsx` | negativo: la confirmación debe coincidir | `cy.get('#confirmPassword-error').should('have.text', 'Las contraseñas no coinciden')` |
| F-CY-023 | `cypress/component/Register.cy.tsx` | positivo: crea la cuenta con datos normalizados y lleva al panel | `.should('deep.equal', { email: 'carla@gmail.com', name: 'Carla Rojas', password: 'Segura123' })`<br>`cy.get('[data-cy="ruta-destino"]').should('have.text', '/dashboard')` |
| F-CY-024 | `cypress/component/Register.cy.tsx` | negativo: el correo ya registrado muestra el error del servidor | `cy.get('[data-testid="error-servidor"]').should('have.text', 'El email ya está registrado')` |
| F-CY-025 | `cypress/e2e/api/servicios.cy.ts` | positivo: 201 con usuario público y token | `expect(r.status).to.eq(201)`<br>`expect(r.body.data.token).to.be.a('string')`<br>`expect(r.body.data.user).to.include({ email, name: 'Carla Rojas', role: 'USER' })`<br>(+1 aserciones más) |
| F-CY-026 | `cypress/e2e/api/servicios.cy.ts` | negativo: 409 si el correo ya existe | `expect(r.status).to.eq(409)`<br>`expect(r.body.error).to.eq('El email ya está registrado')` |
| F-CY-027 | `cypress/e2e/api/servicios.cy.ts` | negativo: 400 con el campo y la regla incumplida | `expect(r.status).to.eq(400)`<br>`expect(r.body.errors.map((e: { field: string }) => e.field)).to.include.members(['email', 'password', 'name'])` |
| F-CY-028 | `cypress/e2e/api/servicios.cy.ts` | positivo: 200 con token, aunque el correo venga con mayúsculas | `expect(r.status).to.eq(200)`<br>`expect(r.body.data.user.email).to.eq(email)` |
| F-CY-029 | `cypress/e2e/api/servicios.cy.ts` | negativo: 401 con el mismo mensaje para contraseña incorrecta y correo inexistente | `expect([a.status, b.status]).to.deep.eq([401, 401])`<br>`expect(a.body).to.deep.eq(b.body)` |
| F-CY-030 | `cypress/e2e/api/servicios.cy.ts` | negativo: 401 sin token en una ruta protegida | `cy.request({ url: api('/auth/me'), failOnStatusCode: false }).its('status').should('eq', 401)` |
| F-CY-031 | `cypress/e2e/api/servicios.cy.ts` | seguridad (solo backend real): el sexto intento fallido responde 429 | `cy.wrap(codigos).should('deep.equal', [401, 401, 401, 401, 401, 429])` |
| F-CY-032 | `cypress/e2e/api/servicios.cy.ts` | positivo: GET y PATCH /auth/me | `cy.request({ url: api('/auth/me'), headers: conToken(token) }).its('body.data.name').should('eq', 'Carla Ro...`<br>`.should('include', { name: 'Valentina Rojas', role: 'USER' })` |
| F-CY-033 | `cypress/e2e/api/servicios.cy.ts` | positivo y negativo: cambio de contraseña | `.its('status').should('eq', 400)`<br>`.its('status').should('eq', 204)`<br>`cy.request({ method: 'POST', url: api('/auth/login'), body: { email, password: 'Nueva4567' } }).its('status...` |
| F-CY-034 | `cypress/e2e/api/servicios.cy.ts` | negativo: un cliente recibe 403 en /admin | `expect(r.status, ruta).to.eq(403)`<br>`expect(r.body.error).to.eq('Acceso restringido a administradores')` |
| F-CY-035 | `cypress/e2e/api/servicios.cy.ts` | positivo: el admin promueve a un cliente y entonces accede | `cy.request({ url: api('/admin/stats'), headers: conToken(token) }).its('status').should('eq', 200)` |
| F-CY-036 | `cypress/e2e/api/servicios.cy.ts` | positivo y negativo: la alerta aparece al bajar del mínimo y se cierra al reponer | `alertasDelCelular().should('have.length', 1).its('0.type').should('eq', 'LOW_STOCK')`<br>`alertasDelCelular().should('have.length', 1).its('0.type').should('eq', 'OUT_OF_STOCK')`<br>`alertasDelCelular().should('have.length', 0)` |
| F-CY-037 | `cypress/e2e/regresion/regresiones.cy.ts` | (6) contraseña incorrecta: el error se ve y la página no se recarga | `cy.get('[data-testid="error-servidor"]').should('have.text', 'Credenciales inválidas')`<br>`cy.window().its('marca').should('eq', true) // misma página, sin recarga` |
| F-CY-038 | `cypress/e2e/regresion/regresiones.cy.ts` | (7) la sesión sobrevive a una recarga inmediata después de ingresar | `cy.location('pathname').should('eq', '/dashboard')`<br>`cy.location('pathname').should('eq', '/dashboard')`<br>`cy.contains('h1', 'Hola, Carla').should('be.visible')` |
| F-CY-039 | `cypress/e2e/regresion/regresiones.cy.ts` | (8) si el rol cambió en el servidor, la app lo aplica al abrirse | `cy.location('pathname').should('eq', '/unauthorized')` |
| F-CY-040 | `cypress/e2e/regresion/regresiones.cy.ts` | (9) una cuenta suspendida durante la sesión vuelve al login con el motivo | `cy.location('pathname').should('eq', '/login')`<br>`cy.get('[data-testid="aviso-sesion"]').should('contain.text', 'Motivo: fraude')` |
| F-CY-041 | `cypress/e2e/regresion/regresiones.cy.ts` | (11) el enlace Admin lleva al panel con las alertas | `cy.get('header a[href="/admin"]').should('be.visible')` |
| F-CY-042 | `cypress/e2e/regresion/regresiones.cy.ts` | interfaz: en 375 px la barra no se desborda y el menú incluye las acciones de cuenta | `expect(w.scrollX, 'desplazamiento horizontal').to.eq(0)`<br>`cy.contains('a', /registrarse/i).should('be.visible')` |
