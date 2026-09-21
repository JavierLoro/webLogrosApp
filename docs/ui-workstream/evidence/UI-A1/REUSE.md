# Reutilización del acceso

## Responsabilidades

- `AuthLayout`: composición lateral/formulario; no conoce rutas API, permisos ni datos de sesión. `asideTitle`, `asideCopy`, `footer` y `children` permiten variar contenido.
- `AuthFormHeader`: título y descripción del apartado principal.
- `AuthField`: etiqueta visible independiente del `name`, atributos nativos del input y estilo consistente.
- `PasswordField`: mismo estilo, con visibilidad controlada localmente y etiqueta accesible.
- `AuthError`: presentación y anuncio de errores.
- `AuthSubmitButton`: presentación común y estado ocupado.
- Cada página: estado, validación, payload, llamadas y navegación.

## Apartados y futuras variantes

El formulario se compone con `children`: una pantalla puede agrupar sus campos en elementos nativos `fieldset`/`legend` sin modificar el layout ni añadir condiciones por nombre de ruta. Login y registro no necesitan apartados artificiales porque son formularios cortos.

No se ha construido un motor de formularios JSON, un registro de endpoints o un componente con ramas `if login/register/unirse`. Tampoco se han adaptado otras pantallas. Cuando otra tarea aprobada use el marco, podrá componer sus propios campos y conservar su comportamiento existente.

Los estilos usan Tailwind y tokens del repositorio. El contenido figurativo del lateral sigue fuera de alcance. Cambiar esos placeholders por imágenes será una decisión posterior, no un efecto de reutilizar el componente.
