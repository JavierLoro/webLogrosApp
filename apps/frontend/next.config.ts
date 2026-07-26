import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // 📚 outputFileTracingRoot: en este monorepo manual, le dice a Next dónde está la raíz
  //    real (../../) para que rastree bien las dependencias al empaquetar.
  outputFileTracingRoot: path.join(__dirname, "../../"),
  // 📚 rewrites(): PROXY de desarrollo. En dev no hay nginx, así que Next reenvía toda
  //    petición a /api/* hacia el backend (localhost:3001). Esto es lo que hace que las
  //    rutas relativas /api de los Client Components funcionen en local, imitando a nginx.
  //    Ojo: este rewrite corre en el SERVIDOR de Next, por eso "localhost" aquí es el backend.
  async rewrites() {
  return [
    {
      // 📚 :path* captura el resto de la ruta y lo reinyecta en destination, sin el /api.
      source: "/api/:path*",
      destination: "http://localhost:3001/:path*",
    },
    ];
  }
};

export default nextConfig;


