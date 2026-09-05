import { z } from "zod"

// 📚 Validamos y limpiamos la entrada en el límite HTTP antes de guardarla. `trim()` va
//    antes de las reglas de longitud para que una cadena de espacios cuente como vacía.
export const crearTeamRequestSchema = z.object({
    teamName: z.string().trim().min(3).max(80),
    // 📚 Normalizamos el correo antes de persistirlo para comparar y mostrar un formato estable.
    officialEmail: z.string().trim().toLowerCase().email().max(254),
    // 📚 El mensaje es obligatorio pero no impone calidad mínima: el SUPER_ADMIN revisa
    //    la información aportada y decide si basta para aceptar el equipo.
    message: z.string().trim().nonempty().max(1500),
})
