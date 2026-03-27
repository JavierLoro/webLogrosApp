#!/bin/bash
set -euo pipefail

# ─────────────────────────────────────────────
#  webLogrosApp — script de instalación en producción
#  Uso: bash setup.sh
#  Probado en: Debian 11/12, Ubuntu 22.04/24.04
# ─────────────────────────────────────────────

REPO_RAW="https://raw.githubusercontent.com/JavierLoro/webLogrosApp/main"
COMPOSE_FILE="docker-compose.prod.yml"
NGINX_CONF_PATH="infra/nginx/nginx.conf"
INSTALL_DIR="/opt/weblogros"

# ── Colores ──────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

info()    { echo -e "${CYAN}[INFO]${NC} $*"; }
success() { echo -e "${GREEN}[OK]${NC}   $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }
ask()     { echo -e "${BOLD}$*${NC}"; }

# ── Banner ────────────────────────────────────
echo ""
echo -e "${BOLD}╔══════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║     webLogrosApp — Setup de producción   ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════╝${NC}"
echo ""

# ── 1. Permisos ───────────────────────────────
if [[ $EUID -ne 0 ]]; then
  error "Este script debe ejecutarse como root o con sudo.\n   Ejecuta: sudo bash setup.sh"
fi

# ── 2. Sistema operativo ──────────────────────
info "Detectando sistema operativo..."
if [[ -f /etc/os-release ]]; then
  source /etc/os-release
  OS_NAME="${NAME:-unknown}"
  OS_ID="${ID:-unknown}"
else
  error "No se puede detectar el sistema operativo."
fi

case "$OS_ID" in
  debian|ubuntu)
    success "Sistema detectado: $OS_NAME"
    PKG_MANAGER="apt-get"
    ;;
  *)
    warn "Sistema no probado ($OS_NAME). Puede fallar la instalación de dependencias."
    PKG_MANAGER="apt-get"
    ;;
esac

# ── 3. Instalar dependencias del sistema ──────
info "Actualizando lista de paquetes..."
$PKG_MANAGER update -qq

install_if_missing() {
  local pkg=$1
  if ! command -v "$pkg" &>/dev/null; then
    info "Instalando $pkg..."
    $PKG_MANAGER install -y -qq "$pkg"
    success "$pkg instalado."
  else
    success "$pkg ya está instalado."
  fi
}

install_if_missing curl
install_if_missing git

# ── 4. Instalar Docker ────────────────────────
if command -v docker &>/dev/null; then
  success "Docker ya está instalado ($(docker --version))."
else
  info "Instalando Docker..."
  echo ""
  ask "  Docker se instalará usando el script oficial de get.docker.com."
  ask "  ¿Continuar? [s/N]"
  read -r CONFIRM_DOCKER
  if [[ "${CONFIRM_DOCKER,,}" != "s" ]]; then
    error "Instalación cancelada por el usuario."
  fi
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker --now
  success "Docker instalado y arrancado."
fi

# ── 5. Instalar Docker Compose ────────────────
if docker compose version &>/dev/null 2>&1; then
  success "Docker Compose ya está disponible ($(docker compose version --short))."
elif command -v docker-compose &>/dev/null; then
  success "docker-compose (v1) detectado. Se recomienda actualizar a v2, pero se puede continuar."
else
  info "Instalando Docker Compose plugin..."
  $PKG_MANAGER install -y -qq docker-compose-plugin
  success "Docker Compose instalado."
fi

# ── 6. Credenciales GHCR ──────────────────────
echo ""
echo -e "${BOLD}── Autenticación en GitHub Container Registry ──${NC}"
echo ""
info "Las imágenes Docker están en ghcr.io (GitHub Container Registry)."
info "Necesitas un Personal Access Token (PAT) con el permiso: read:packages"
info "Puedes crearlo en: https://github.com/settings/tokens"
echo ""

ask "  Usuario de GitHub:"
read -r GITHUB_USER

ask "  Personal Access Token (PAT):"
read -rs GITHUB_PAT
echo ""

info "Iniciando sesión en ghcr.io..."
echo "$GITHUB_PAT" | docker login ghcr.io -u "$GITHUB_USER" --password-stdin \
  && success "Login en GHCR correcto." \
  || error "No se pudo autenticar en GHCR. Comprueba el usuario y el PAT."

# ── 7. Variables de entorno ───────────────────
echo ""
echo -e "${BOLD}── Variables de entorno ──────────────────────${NC}"
echo ""

ask "  Contraseña de PostgreSQL (dejar vacío para generar una aleatoria):"
read -rs DB_PASS
echo ""
if [[ -z "$DB_PASS" ]]; then
  DB_PASS=$(openssl rand -hex 16)
  info "Contraseña generada automáticamente."
fi

ask "  JWT Secret (dejar vacío para generar uno aleatorio):"
read -rs JWT_SECRET
echo ""
if [[ -z "$JWT_SECRET" ]]; then
  JWT_SECRET=$(openssl rand -hex 32)
  info "JWT Secret generado automáticamente."
fi

# ── 8. Directorio de instalación ─────────────
echo ""
info "Directorio de instalación: ${INSTALL_DIR}"
ask "  ¿Usar este directorio? [S/n]"
read -r CONFIRM_DIR
if [[ "${CONFIRM_DIR,,}" == "n" ]]; then
  ask "  Introduce la ruta completa:"
  read -r INSTALL_DIR
fi

mkdir -p "${INSTALL_DIR}/infra/nginx"
cd "${INSTALL_DIR}"
success "Directorio listo: ${INSTALL_DIR}"

# ── 9. Descargar archivos del repositorio ─────
echo ""
info "Descargando archivos de configuración desde GitHub..."

curl -fsSL "${REPO_RAW}/${COMPOSE_FILE}" -o "${COMPOSE_FILE}" \
  && success "docker-compose.prod.yml descargado." \
  || error "No se pudo descargar docker-compose.prod.yml"

curl -fsSL "${REPO_RAW}/${NGINX_CONF_PATH}" -o "infra/nginx/nginx.conf" \
  && success "nginx.conf descargado." \
  || error "No se pudo descargar nginx.conf"

# ── 10. Crear .env.prod ───────────────────────
cat > .env.prod << EOF
POSTGRES_USER=admin
POSTGRES_PASSWORD=${DB_PASS}
POSTGRES_DB=weblogros
JWT_SECRET=${JWT_SECRET}
EOF

success ".env.prod creado."
warn "Guarda las credenciales en un lugar seguro:"
echo ""
echo -e "  POSTGRES_PASSWORD = ${YELLOW}${DB_PASS}${NC}"
echo -e "  JWT_SECRET        = ${YELLOW}${JWT_SECRET}${NC}"
echo ""

# ── 11. Levantar los contenedores ─────────────
echo ""
ask "  ¿Levantar los contenedores ahora? [S/n]"
read -r CONFIRM_UP
if [[ "${CONFIRM_UP,,}" == "n" ]]; then
  info "Puedes levantar manualmente con:"
  echo "  cd ${INSTALL_DIR}"
  echo "  docker compose -f docker-compose.prod.yml --env-file .env.prod up -d"
  exit 0
fi

info "Descargando imágenes y levantando servicios..."
docker compose -f "${COMPOSE_FILE}" --env-file .env.prod pull
docker compose -f "${COMPOSE_FILE}" --env-file .env.prod up -d

# ── 12. Estado final ──────────────────────────
echo ""
echo -e "${BOLD}── Estado de los contenedores ────────────────${NC}"
docker compose -f "${COMPOSE_FILE}" --env-file .env.prod ps

echo ""
success "¡Instalación completa!"
echo ""
info "La app está disponible en el puerto 8080 del servidor."
info "Configura Nginx Proxy Manager apuntando a: $(hostname -I | awk '{print $1}'):8080"
echo ""
info "Para ver los logs:"
echo "  docker compose -f ${INSTALL_DIR}/${COMPOSE_FILE} logs -f"
echo ""
info "Watchtower revisará actualizaciones cada 30 segundos automáticamente."
echo ""
