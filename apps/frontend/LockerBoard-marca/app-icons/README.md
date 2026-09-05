# Iconos de aplicación Lockerboard

Todos los iconos emplean fondo carbón opaco `#0D0F12` y el símbolo LB aprobado.

## Masters

- `source/lockerboard-app-icon.svg`: composición principal, sin esquinas redondeadas dibujadas.
- `source/lockerboard-app-icon-maskable.svg`: símbolo reducido dentro de la zona segura.
- `source/favicon.svg`: símbolo ampliado ópticamente para tamaños pequeños.

## Entregables

- `favicon/favicon.ico`: 16, 32 y 48 px.
- `favicon/favicon-16x16.png`, `favicon-32x32.png`, `favicon-48x48.png`.
- `apple/apple-touch-icon.png`: 180 × 180 px.
- `apple/apple-touch-icon-152x152.png` y `apple-touch-icon-167x167.png`.
- `pwa/icon-192.png` y `pwa/icon-512.png`.
- `pwa/icon-192-maskable.png` y `pwa/icon-512-maskable.png`.
- `app/lockerboard-app-icon-1024.png`: exportación general de alta resolución.

Las plataformas aplican sus propias máscaras y radios. No redondear manualmente los masters.

## Integración web orientativa

```html
<link rel="icon" href="/icons/favicon.ico" sizes="any">
<link rel="icon" href="/icons/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
<link rel="manifest" href="/manifest.webmanifest">
```

El bloque `icons` para el manifiesto está disponible en `manifest-icons.example.json`; deben ajustarse las rutas al proyecto real.
