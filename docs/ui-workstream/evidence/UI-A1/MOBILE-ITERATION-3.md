# UI-A1 — Ajuste móvil solicitado

Usuario confirmó fullscreen y pidió móvil sin decoración, con logo encima del formulario. Cambio acotado del Coordinator en AuthLayout: aside oculto bajo 768 px, logo alternativo dentro del panel de formulario visible solo bajo ese breakpoint, panel a min-height 100dvh y altura natural. Desktop conserva 50/50.

Validación: ESLint del archivo PASS. IAB a 390 × 844: login y registro muestran logo/formulario y ningún lateral; display del aside `none`, ancho documento/viewport 390/390. Capturas guardadas y abiertas: `login-mobile-iteration-3.png` (autocompletado del navegador visible, contraseña enmascarada), `register-mobile-iteration-3.png` (vacío). Al restaurar viewport normal reapareció lateral desktop en AX. Navegación login/registro PASS.

No se modificó lógica funcional. La crítica independiente y el gate A1 siguen pendientes contra el contrato fullscreen/móvil actualizado; no reutilizar la crítica del frame anterior como aprobación.
