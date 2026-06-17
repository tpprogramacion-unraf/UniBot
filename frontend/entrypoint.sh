#!/bin/sh
# Entrypoint: instala dependencias frescas cada vez que el contenedor inicia
# Esto asegura que después de un git pull, los nuevos paquetes se instalen
echo "==> Instalando dependencias..."
npm install --prefer-offline --no-audit 2>&1
echo "==> Iniciando servidor de desarrollo..."
exec npm run dev
