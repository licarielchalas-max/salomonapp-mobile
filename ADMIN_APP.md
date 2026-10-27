# App de administración (separada de la app de usuarios)

Un solo código, dos paquetes web. El interruptor es `EXPO_PUBLIC_APP_MODE`:

| | Usuarios | Administración |
|---|---|---|
| Modo | `user` (por defecto) | `admin` |
| Raíz de la app | `src/navigation/appRoot.ts` → `RootNavigator` | `src/navigation/appRoot.admin.tsx` (login + panel) |
| Compilar | `npm run build:web` → `dist/` | `npm run build:admin` → `dist-admin/` |
| Desarrollo | `npm run web` (puerto 19006) | `npm run web:admin` (puerto 19007) |

`metro.config.js` cambia `appRoot` por `appRoot.admin.tsx` en modo admin, así que cada paquete solo contiene su propio
código: el de usuarios no trae el panel de admin (ni sus llamadas `admin_*`) y el de admin no trae las pantallas de
usuario ni PayPal. Se comprobó buscando textos y funciones en los paquetes compilados.

El paquete de admin además: se llama "Salomón Admin", lleva `noindex` y un `robots.txt` que bloquea buscadores, no tiene
registro y, si entra alguien que no está en `app_admins`, solo ve "Acceso restringido".

## La seguridad real está en la base de datos
Ocultar el panel no basta y no es lo que protege: cada función `admin_*` de Supabase exige `is_app_admin()`
(o `admin_guard()`), así que un usuario normal no puede ejecutarlas aunque conozca su nombre. La app de admin solo
añade comodidad y un paquete más pequeño. Los administradores están en la tabla `app_admins`.

## Publicar en Vercel (dos proyectos del mismo repositorio)
Crea dos proyectos apuntando al repositorio, con **Root Directory = `mobile`**:

| Ajuste | Usuarios (`app.tudominio.com`) | Admin (`admin.tudominio.com`) |
|---|---|---|
| Build Command | `npm run build:web` | `npm run build:admin` |
| Output Directory | `dist` | `dist-admin` |
| Variable de entorno | — | `EXPO_PUBLIC_APP_MODE=admin` |
| Variables comunes | `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` | las mismas |

El archivo `vercel.json` ya redirige todas las rutas a `index.html`; sirve para los dos.

## En Supabase
- Authentication → URL Configuration: agrega la dirección del admin a **Redirect URLs** (y deja la de usuarios).
- Opcional, recomendado para el admin: activar **MFA (TOTP)** en Authentication → Multi-Factor y exigirlo en el login de admin.
- Opcional: poner la dirección del admin detrás de Cloudflare Access o una lista de IP.

## Sacar de Admin a un usuario o agregar otro
Se hace con SQL en Supabase (tabla `app_admins`); la app no lo permite desde la interfaz.
