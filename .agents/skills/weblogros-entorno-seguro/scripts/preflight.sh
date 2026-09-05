#!/usr/bin/env bash

# Preflight de solo lectura para evitar mezclar dos stacks o arrancar bajo presión.
set -uo pipefail

mode="${1:-local}"
operation="${2:-runtime}"
project_root="/srv/projects/webLogrosApp"
status=0

if [[ "$mode" != "local" && "$mode" != "containers" ]]; then
  echo "Uso: $0 [local|containers] [runtime|dev|build]" >&2
  exit 64
fi

case "$operation" in
  runtime)
    estimated_workload_mib=512
    safety_margin_mib=512
    ;;
  dev)
    estimated_workload_mib=1536
    safety_margin_mib=1024
    ;;
  build)
    estimated_workload_mib=2048
    safety_margin_mib=1024
    ;;
  *)
    echo "Uso: $0 [local|containers] [runtime|dev|build]" >&2
    exit 64
    ;;
esac

required_available_mib="${WEBLOGROS_REQUIRED_AVAILABLE_MIB:-$((estimated_workload_mib + safety_margin_mib))}"
if [[ ! "$required_available_mib" =~ ^[0-9]+$ || "$required_available_mib" -eq 0 ]]; then
  echo 'FALLO: WEBLOGROS_REQUIRED_AVAILABLE_MIB debe ser un entero positivo.' >&2
  exit 64
fi
required_available_kib=$((required_available_mib * 1024))

if [[ ! -d "$project_root" ]]; then
  echo "FALLO: no existe el proyecto esperado en $project_root" >&2
  exit 3
fi

mem_total_kib="$(awk '/^MemTotal:/ {print $2}' /proc/meminfo)"
mem_available_kib="$(awk '/^MemAvailable:/ {print $2}' /proc/meminfo)"
swap_total_kib="$(awk '/^SwapTotal:/ {print $2}' /proc/meminfo)"
swap_free_kib="$(awk '/^SwapFree:/ {print $2}' /proc/meminfo)"

if [[ "$swap_total_kib" -gt 0 ]]; then
  swap_used_pct=$(( (swap_total_kib - swap_free_kib) * 100 / swap_total_kib ))
else
  swap_used_pct=0
fi

printf 'Modo solicitado: %s\n' "$mode"
printf 'Operación: %s (%d MiB estimados + %d MiB de margen)\n' "$operation" "$estimated_workload_mib" "$safety_margin_mib"
printf 'Reserva de MemAvailable exigida: %d MiB\n' "$required_available_mib"
printf 'Memoria disponible: %d MiB de %d MiB\n' "$((mem_available_kib / 1024))" "$((mem_total_kib / 1024))"
printf 'Swap usada: %d%% (%d MiB libres de %d MiB)\n' "$swap_used_pct" "$((swap_free_kib / 1024))" "$((swap_total_kib / 1024))"

if [[ "$mem_available_kib" -lt "$required_available_kib" ]]; then
  echo "FALLO: la operación necesita ${required_available_mib} MiB disponibles y solo hay $((mem_available_kib / 1024)) MiB." >&2
  status=2
fi

if [[ "$swap_used_pct" -gt 90 ]]; then
  echo 'ADVERTENCIA: swap por encima del 90%; no bloquea porque la decisión se basa en MemAvailable.' >&2
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "FALLO: Docker no está disponible; no se puede descartar un stack duplicado." >&2
  exit 3
fi

if ! docker info >/dev/null 2>&1; then
  echo "FALLO: no se puede consultar Docker; el preflight falla de forma cerrada." >&2
  exit 3
fi

app_containers=()
for container_name in weblogros_backend weblogros_frontend weblogros_nginx; do
  container_state="$(docker inspect --format '{{.State.Status}}' "$container_name" 2>/dev/null || true)"
  if [[ "$container_state" == "running" ]]; then
    app_containers+=("$container_name")
  fi
done

db_state="$(docker inspect --format '{{.State.Status}}' weblogros_db 2>/dev/null || true)"
printf 'Base de datos Docker: %s\n' "${db_state:-no creada}"
if (( ${#app_containers[@]} > 0 )); then
  printf 'Contenedores de aplicación activos: %s\n' "${app_containers[*]}"
else
  echo 'Contenedores de aplicación activos: ninguno'
fi

mapfile -t local_processes < <(
  ps -eo pid=,comm=,args= | awk -v root="$project_root" '
    $2 != "awk" && index($0, root) && $0 ~ /(next dev|next start|next-server|ts-node|nodemon)/ { print }
  '
)

if (( ${#local_processes[@]} > 0 )); then
  echo 'Procesos locales de aplicación detectados:'
  printf '  %s\n' "${local_processes[@]}"
else
  echo 'Procesos locales de aplicación detectados: ninguno'
fi

if [[ "$mode" == "local" && ${#app_containers[@]} -gt 0 ]]; then
  echo 'FALLO: el modo local duplicaría los contenedores de aplicación activos.' >&2
  status=2
fi

if [[ "$mode" == "containers" && ${#local_processes[@]} -gt 0 ]]; then
  echo 'FALLO: el modo contenedores duplicaría procesos locales activos.' >&2
  status=2
fi

echo 'Puertos relevantes en escucha:'
if command -v ss >/dev/null 2>&1; then
  ss -ltn 2>/dev/null | awk 'NR == 1 || $4 ~ /:(3000|3001|5432)$/'
else
  echo '  ss no disponible'
fi

if [[ -r /sys/fs/cgroup/memory.events ]]; then
  echo 'Eventos de memoria del cgroup:'
  awk '$1 ~ /^(oom|oom_kill)$/ {printf "  %s: %s\n", $1, $2}' /sys/fs/cgroup/memory.events
fi

if [[ "$status" -ne 0 ]]; then
  echo 'RESULTADO: NO SEGURO. No iniciar servicios.' >&2
  exit "$status"
fi

echo 'RESULTADO: preflight correcto para el modo solicitado.'
