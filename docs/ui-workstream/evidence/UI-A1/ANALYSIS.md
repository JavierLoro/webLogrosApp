# UI-A1 — Análisis de acceso público

## Fuente y alcance

- Referencia canónica: `apps/frontend/LockerBoard-marca/ReferenciasPaginas/_compartidas/acceso-onboarding-desktop-v1.png` (1536 × 1024 px).
- Regiones válidas: panel 1 (`/login`) y panel 2 (`/register`), únicamente sus superficies interiores.
- Se excluyen de la aplicación los títulos y marcos de la lámina, los paneles 3–6 y toda fotografía decorativa.
- La fotografía lateral se traduce a un placeholder CSS oscuro con la misma función geométrica. El logo horizontal existente sí puede reutilizarse.

## Lectura medida

| Región | Medida aproximada en la referencia | Traducción ejecutable |
| --- | --- | --- |
| Login interior | x 20–496, y 108–539; 476 × 431 px | Dos superficies full-bleed y oscuras, por override posterior del usuario |
| Registro interior | x 530–1010, y 108–539; 480 × 431 px | Misma composición reusable que login |
| División login | x 264; 244/232 px | Columnas ~51/49 |
| División registro | x 769; 239/241 px | Columnas ~50/50 |
| Padding formulario | 20–22 px en la maqueta | 32–48 px al escalar a viewport real |
| Control | ~26 px alto en la lámina reducida | 44–48 px para accesibilidad y tactilidad |
| Radio exterior | ~10 px | Radio contenido, 16–18 px en pantalla real |
| Jerarquía | título 18–20 px, cuerpo 9–11 px en maqueta | título fluido 28–36 px; cuerpo 14–16 px |

La composición usa negro azulado, superficies apenas elevadas, borde gris frío y rojo como único acento. El panel lateral concentra logo, frase grande y una base gráfica; el formulario mantiene una jerarquía sobria con título, subtítulo, campos, CTA ancho y cambio de ruta al pie.

## Contrato reusable

`AuthLayout` será agnóstico al negocio y aceptará:

- `children`: contenido completo del panel derecho;
- `asideTitle`: mensaje principal del lateral;
- `asideCopy`: apoyo opcional del lateral;
- `footer`: cambio de ruta u otro cierre del formulario;
- `ariaLabelledBy`: asociación del frame con el título real del formulario.

El layout no conoce endpoints, estado de autenticación ni redirects. `AuthFormHeader`, `AuthField`, `PasswordField`, `AuthError` y `AuthSubmitButton` encapsulan la jerarquía y los controles repetidos. `PasswordField` incorpora mostrar/ocultar con un botón de texto accesible —adaptación funcional del ojo de la maqueta sin añadir iconografía nueva— y no altera el valor.

La implementación seguirá el enfoque vigente del proyecto: clases Tailwind y tokens `--lb-*` ya disponibles. No introduce CSS Modules, CSS global, dependencias ni una migración de estilos.

## Contrato funcional por ruta

### `/login`

- Título: **Bienvenido de nuevo**.
- Subtítulo: **Entra en tu equipo y sigue sumando.**
- Campos enviados: `{ email, password }` a `POST /api/auth/login`.
- Conserva token, equipos, flag de superadmin, evento `auth-change` y redirect actuales.
- CTA: **Entrar**; estado ocupado: **Entrando…**.

### `/register`

- Título: **Crea tu cuenta**.
- Subtítulo: **Empieza a formar parte de LockerBoard.**
- Campos enviados: `{ email, password }` a `POST /api/auth/register`.
- `confirmPassword` existe solo en frontend y bloquea el envío cuando no coincide.
- No se añade nombre porque el contrato no lo persiste.
- CTA: **Crear cuenta**; estado ocupado: **Creando cuenta…**.

Ambos formularios conservan los valores ante error, impiden doble envío, usan labels reales, `autocomplete`, alertas anunciables y campos de contraseña con visibilidad conmutable.

## Exclusiones funcionales

No se implementan recordar sesión, recuperar contraseña, OAuth, Google/GitHub, términos o privacidad inexistentes, nombre no persistido, Auth Hardening ni nuevas rutas. La omisión es deliberada aunque esos conceptos aparezcan dibujados en la referencia.

## Responsive y captura

- **1440 px:** composición full-bleed 50/50, sin frame exterior, padding de página, borde, radio ni sombra de tarjeta. Cada mitad ocupa al menos `100dvh`; el contenido del formulario conserva un máximo legible independiente del ancho de columna.
- **768 px:** se mantienen dos columnas; se reduce padding y escala tipográfica sin comprimir controles por debajo de 44 px.
- **390 px:** una columna full-width; placeholder lateral compacto arriba y formulario prioritario debajo, ambos con altura natural y sin overflow horizontal ni clips.
- Capturas posteriores: `/login` y `/register` a 1440 × 1024, ambas a 390 px, y smoke intermedio a 768 px.
- Regiones ignoradas para crítica: contenido figurativo de la fotografía lateral. Sí se evalúan su proporción, contraste, marco y peso visual.

## Riesgos

- Los errores del servidor aumentan la altura natural del formulario; el frame debe admitir contenido sin clip.
- Registro tiene un campo adicional y necesita más altura que login, pero ambos deben conservar la misma familia visual.
- El header global debe omitirse solo en `/login` y `/register`; el resto de superficies públicas no cambia.
- El full-bleed es un override explícito del usuario sobre la tarjeta contenida de la referencia; no debe reinterpretarse como permiso para cambiar la jerarquía interna.
