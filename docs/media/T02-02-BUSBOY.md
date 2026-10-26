# 7.10 / T02.02 — Viabilidad de recepción con Busboy

Fecha: 2026-10-12. **Busboy instalado y ensayo aislado PASS; API de subida pendiente de T03/T05.**

## Qué se ha realizado

- Dependencia runtime fijada: `busboy@1.6.0`.
- Tipos TypeScript fijados: `@types/busboy@1.5.5`, solo desarrollo.
- Compatibilidad comprobada con Node 24.14 y la configuración TypeScript/CommonJS actual del backend: `npm run build` PASS.
- El paquete Busboy instalado incluye `LICENSE` con texto MIT; los tipos declaran MIT. Busboy no devuelve campo `license` en la consulta npm realizada: se comprobó el archivo empaquetado, no se infirió licencia de ese campo ausente.
- Ensayo reproducible: `apps/backend/src/experiments/busboyCompatibility.test.ts`. Solo utiliza flujos y disco temporal; no se importa desde `server.ts`, no expone rutas y no toca PostgreSQL ni SeaweedFS.

## Recorrido del ensayo

```text
Multipart sintético, generado por fragmentos
  -> Busboy
  -> archivo temporal con nombre interno
  -> comprobación de resultado
  -> limpieza
```

El receptor de ensayo escribe mediante `pipeline` y un archivo exclusivo (`wx`), con directorio aleatorio por recepción. Ignora el nombre suministrado por el cliente, que en la prueba incluye `../../`. Los fallos cancelan los flujos, esperan su cierre y retiran archivo/directorio creados por el ensayo. Cada prueba comprueba que su directorio raíz queda vacío; no hay borrados recursivos.

El campo `image`, la ausencia de campos de texto y el límite de un archivo son el contrato **del ensayo**, no un contrato HTTP aprobado para la aplicación. T03 concretará rutas/campos/permisos y T05 construirá la recepción integrada con admisión y trabajos.

## Resultados

| Caso | Resultado |
| --- | --- |
| Bytes recibidos iguales a los enviados y nombre interno | PASS |
| Exactamente 10.000.000 bytes | PASS, admitido |
| 10.000.001 bytes | PASS, rechazado y temporal retirado |
| Multipart sin cierre final | PASS, rechazado y temporal retirado |
| Error en el flujo de entrada | PASS, rechazado y temporal retirado |
| Segundo archivo | PASS, rechazado y temporal retirado |
| Campo de texto adicional | PASS, rechazado y temporal retirado |
| Dos recepciones simultáneas | PASS, directorios distintos y tamaños correctos |

Busboy 1.6.0 emite `limit` cuando el archivo **alcanza** `fileSize`; configurar directamente 10.000.000 y rechazar ese evento excluiría la frontera permitida. El ensayo usa `fileSize = 10.000.001` y rechaza al detectar el primer byte extra. Las dos pruebas de frontera verifican que el límite del producto sigue siendo 10.000.000 bytes.

Para repetir desde `apps/backend`:

```powershell
npm run build
node dist/experiments/busboyCompatibility.test.js
```

Resultado observado: 8 pruebas, 8 PASS, 0 FAIL. La compilación inicial dentro del sandbox falló por permisos de escritura en `dist` (`EPERM`); fuera del sandbox compiló. La ejecución directa del ensayo funcionó dentro del sandbox. No se presenta el tiempo del ensayo como benchmark de memoria, disco o HTTP.

## Qué queda pendiente

Los bytes del ensayo son sintéticos y **no son una imagen validada**, aunque el multipart declare `image/jpeg`. El MIME y el nombre enviados son datos no confiables. Sharp deberá verificar contenido/formato real, píxeles y animación, y generar las variantes.

Quedan admisión global, sesión/permisos, timeouts de transferencia y proxy, desconexión HTTP real, capacidad del disco, recuperación tras caída del proceso y limpieza persistente. El ensayo demuestra manejo del error de un flujo, no todos los comportamientos de un navegador desconectado. Posteriormente se verificó [Sharp](T02-02-SHARP.md) y se cerró T02.02 como diseño local con [presupuesto/medición](T02-02-RESOURCES.md); esto no cierra T03 ni T05.01.

Fuentes primarias: [API y límites de Busboy](https://github.com/mscdex/busboy#api), [código que aplica fileSize](https://github.com/mscdex/busboy/blob/v1.6.0/lib/types/multipart.js), [licencia](https://github.com/mscdex/busboy/blob/v1.6.0/LICENSE). Versiones/engines consultados con `npm view`; versiones fijadas en el lockfile del backend.
