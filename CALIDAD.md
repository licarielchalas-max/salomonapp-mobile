# Control de calidad: detectar problemas antes que los usuarios

Todo se corre desde la carpeta `mobile/`.

| Comando | Qué revisa | Cuándo usarlo |
|---|---|---|
| `npm run check` | Tipos (`tsc`) y las pruebas (`jest`) | Se corre solo antes de cada commit |
| `npm run check:full` | Lo anterior, más compilar la app de usuarios y la de admin y comprobar que cada paquete solo contiene lo suyo | Antes de publicar |
| `npm run test:e2e` | Abre las dos apps compiladas en un navegador real (tamaño celular) y comprueba que cargan sin errores, que no tienen fallas graves de accesibilidad ni desbordes, que el login valida sus campos y que el paquete de admin sigue separado. Requiere `check:full` o los dos `build:*` antes | Antes de publicar |
| `e2e/dashboard.spec.ts`, `e2e/modules.spec.ts` | (dentro de `test:e2e`) Prueban pantallas **con sesión iniciada** sin usar cuentas reales: `e2e/mockBackend.ts` simula Supabase con datos de ejemplo (presupuestos, movimientos, cuentas). Para probar otra pantalla, agrega datos al `mockBackend` y un test | Al cambiar pantallas |
| `npm run doctor` | Salud del entorno: conexión con Supabase, correo, seguridad con la clave pública y funciones de PayPal | Cuando algo "no funciona" y no sabes dónde |
| `npm run test:db` | Lo de `doctor` más las reglas de la base de datos (`supabase/tests/invariants.sql`) | Después de tocar migraciones |

## Qué detecta `doctor`
- Proyecto de Supabase **pausado** o sin conexión.
- Confirmación por correo activa con el correo gratuito de Supabase (por eso no llegan los enlaces).
- Funciones de administración o tablas abiertas a visitantes sin sesión.
- PayPal: `paypal-webhook` y `paypal-subscribe` desplegados, y credenciales que PayPal acepta.
- Con `--db`: tablas sin RLS, funciones de admin ejecutables por visitantes, funciones sin `search_path`,
  funciones solo de servidor abiertas, y cobros sin la marca de prueba/real.

## Que un cambio no dañe a los demás
- El **commit se detiene** si falla `tsc` o alguna prueba (`.githooks/pre-commit`; se activa con
  `git config core.hooksPath .githooks`, ya configurado en este repositorio).
- `check:full` falla si el panel de admin aparece en el paquete de usuarios o el cobro de PayPal en el de admin.
- Cada módulo vive en su archivo (`lib/` para la lógica con pruebas, `hooks/` para datos, `screens/` y `components/`
  para pantallas). Agrega siempre una prueba en `src/lib/__tests__/` cuando cambies cálculos de dinero, fechas o planes.

## Cuando agregues algo nuevo
1. Escribe la lógica en `lib/` con su prueba.
2. Si toca la base de datos, agrega la migración y, si crea una función de administración, que empiece con `admin_`
   y que `doctor --db` siga en verde.
3. `npm run check` antes de guardar; `npm run check:full` antes de publicar.
