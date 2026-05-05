#!/bin/bash
# ============================================================
#  EcoVecinos — Script de instalación automática
#  Proyecto intermodular ASIR 2
#  Beatriz López Ruiz, Diego Martínez Fernández, Rocío Alondra Omonte Coronel
# ============================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
echo "  ╔═══════════════════════════════════════╗"
echo "  ║       EcoVecinos — Instalador         ║"
echo "  ║   Plataforma de intercambio de        ║"
echo "  ║          alimentos vecinal            ║"
echo "  ╚═══════════════════════════════════════╝"
echo -e "${NC}"

# ─── Comprobaciones previas ─────────────────────────────────
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}[ERROR] Este script debe ejecutarse como root (sudo).${NC}"
  exit 1
fi

if ! command -v apt &>/dev/null; then
  echo -e "${RED}[ERROR] Este instalador requiere un sistema basado en Debian/Ubuntu.${NC}"
  exit 1
fi

echo -e "${YELLOW}[INFO] Actualizando repositorios...${NC}"
apt update -y

# ─── 1. Instalar Apache ─────────────────────────────────────
echo -e "${YELLOW}[INFO] Instalando Apache2...${NC}"
apt install -y apache2
a2enmod ssl rewrite
systemctl enable apache2
systemctl start apache2
echo -e "${GREEN}[OK] Apache instalado y en ejecución.${NC}"

# ─── 2. Instalar PHP y módulos ──────────────────────────────
echo -e "${YELLOW}[INFO] Instalando PHP y módulos necesarios...${NC}"
apt install -y php libapache2-mod-php php-mysql php-mbstring php-gd php-curl php-json
echo -e "${GREEN}[OK] PHP instalado.${NC}"

# ─── 3. Instalar MySQL Server ───────────────────────────────
echo -e "${YELLOW}[INFO] Instalando MySQL Server...${NC}"
apt install -y mysql-server
systemctl enable mysql
systemctl start mysql
echo -e "${GREEN}[OK] MySQL instalado y en ejecución.${NC}"

# ─── 4. Instalar Python y dependencias ──────────────────────
echo -e "${YELLOW}[INFO] Instalando Python3 y dependencias...${NC}"
apt install -y python3 python3-pip
pip3 install mysql-connector-python --break-system-packages
echo -e "${GREEN}[OK] Python3 y mysql-connector instalados.${NC}"

# ─── 5. Instalar herramientas SSL ───────────────────────────
echo -e "${YELLOW}[INFO] Instalando herramientas SSL...${NC}"
apt install -y libnss3-tools openssl
echo -e "${GREEN}[OK] Herramientas SSL instaladas.${NC}"

# ─── 6. Crear estructura de directorios ─────────────────────
echo -e "${YELLOW}[INFO] Creando estructura de directorios del proyecto...${NC}"

PROYECTO_DIR="/var/www/html/Proyecto"
FRONTEND_DIR="$PROYECTO_DIR/frontend"
BACKEND_DIR="$PROYECTO_DIR/backend"
SCRIPTS_DIR="$PROYECTO_DIR/scripts"

mkdir -p "$FRONTEND_DIR/css"
mkdir -p "$FRONTEND_DIR/js"
mkdir -p "$FRONTEND_DIR/images"
mkdir -p "$BACKEND_DIR/config"
mkdir -p "$BACKEND_DIR/models"
mkdir -p "$BACKEND_DIR/uploads"
mkdir -p "$SCRIPTS_DIR"
mkdir -p "$PROYECTO_DIR/docs"

echo -e "${GREEN}[OK] Estructura creada en $PROYECTO_DIR${NC}"

# ─── 7. Copiar archivos del proyecto ────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ -d "$SCRIPT_DIR/Proyecto" ]; then
  echo -e "${YELLOW}[INFO] Copiando archivos del proyecto...${NC}"
  cp -r "$SCRIPT_DIR/Proyecto/frontend/"* "$FRONTEND_DIR/"
  cp -r "$SCRIPT_DIR/Proyecto/backend/"*  "$BACKEND_DIR/"
  cp -r "$SCRIPT_DIR/Proyecto/scripts/"*  "$SCRIPTS_DIR/"
  echo -e "${GREEN}[OK] Archivos copiados correctamente.${NC}"
else
  echo -e "${YELLOW}[AVISO] No se encontró la carpeta Proyecto/ junto al script."
  echo -e "         Copia manualmente los archivos a $PROYECTO_DIR${NC}"
fi

# ─── 8. Permisos ────────────────────────────────────────────
echo -e "${YELLOW}[INFO] Aplicando permisos...${NC}"
chown -R www-data:www-data "$PROYECTO_DIR"
chmod -R 755 "$PROYECTO_DIR"
chmod -R 775 "$BACKEND_DIR/uploads"
chmod +x "$SCRIPTS_DIR/notificar.py" 2>/dev/null || true
echo -e "${GREEN}[OK] Permisos aplicados.${NC}"

# ─── 9. Generar certificado SSL autofirmado ─────────────────
echo -e "${YELLOW}[INFO] Generando certificado SSL autofirmado...${NC}"

IP=$(hostname -I | awk '{print $1}')

openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/private/ecovecinos.key \
  -out /etc/ssl/certs/ecovecinos.crt \
  -subj "/CN=$IP/O=EcoVecinos/C=ES" \
  -addext "subjectAltName=IP:$IP"

# Copiar certificado al frontend para que los clientes puedan descargarlo
cp /etc/ssl/certs/ecovecinos.crt "$FRONTEND_DIR/ecovecinos.crt"

# Añadir certificado a la base de datos de Chrome/Chromium del sistema
mkdir -p /root/.pki/nssdb
certutil -d sql:/root/.pki/nssdb -N --empty-password 2>/dev/null || true
certutil -d sql:/root/.pki/nssdb -A -t "CT,," -n "EcoVecinos" \
  -i /etc/ssl/certs/ecovecinos.crt 2>/dev/null || true

echo -e "${GREEN}[OK] Certificado SSL generado para IP: $IP${NC}"

# ─── 10. Configurar VirtualHost Apache con HTTP + HTTPS ─────
echo -e "${YELLOW}[INFO] Configurando Apache (HTTP → HTTPS + Alias backend)...${NC}"

VHOST_FILE="/etc/apache2/sites-available/eco-vecinos.conf"

cat > "$VHOST_FILE" <<APACHECONF
# HTTP → redirige a HTTPS
<VirtualHost *:80>
    ServerAdmin webmaster@localhost
    DocumentRoot $FRONTEND_DIR
    RewriteEngine On
    RewriteRule ^(.*)$ https://%{HTTP_HOST}\$1 [R=307,L]
</VirtualHost>

# HTTPS
<VirtualHost *:443>
    ServerAdmin webmaster@localhost
    DocumentRoot $FRONTEND_DIR

    SSLEngine on
    SSLCertificateFile    /etc/ssl/certs/ecovecinos.crt
    SSLCertificateKeyFile /etc/ssl/private/ecovecinos.key

    <Directory $FRONTEND_DIR>
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    Alias /backend $BACKEND_DIR

    <Directory $BACKEND_DIR>
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    ErrorLog \${APACHE_LOG_DIR}/eco_vecinos_error.log
    CustomLog \${APACHE_LOG_DIR}/eco_vecinos_access.log combined
</VirtualHost>
APACHECONF

a2dissite 000-default.conf 2>/dev/null || true
a2ensite eco-vecinos.conf

systemctl reload apache2
echo -e "${GREEN}[OK] VirtualHost HTTP + HTTPS configurado.${NC}"

# ─── 11. Configurar base de datos ───────────────────────────
echo -e "${YELLOW}[INFO] Configurando base de datos MySQL...${NC}"

mysql <<MYSQL_SCRIPT
CREATE DATABASE IF NOT EXISTS eco_vecinos CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'eco_user'@'localhost' IDENTIFIED BY 'Alumno2026!';
GRANT ALL PRIVILEGES ON eco_vecinos.* TO 'eco_user'@'localhost';
FLUSH PRIVILEGES;
MYSQL_SCRIPT

echo -e "${GREEN}[OK] Usuario 'eco_user' y base de datos 'eco_vecinos' creados.${NC}"

SQL_FILE="$SCRIPTS_DIR/BD.sql"
if [ -f "$SQL_FILE" ]; then
  echo -e "${YELLOW}[INFO] Importando esquema y datos de prueba desde BD.sql...${NC}"
  mysql -u eco_user -p'Alumno2026!' eco_vecinos < "$SQL_FILE"
  echo -e "${GREEN}[OK] Base de datos importada correctamente.${NC}"
else
  echo -e "${YELLOW}[AVISO] No se encontró $SQL_FILE."
  echo -e "         Importa manualmente: mysql -u eco_user -p eco_vecinos < BD.sql${NC}"
fi

# ─── 12. Actualizar URLs en manifest.json y notificar.py ────
echo -e "${YELLOW}[INFO] Actualizando URLs con la IP del servidor ($IP)...${NC}"

MANIFEST="$FRONTEND_DIR/manifest.json"
NOTIFICAR="$SCRIPTS_DIR/notificar.py"

if [ -f "$MANIFEST" ]; then
  # Reemplazar cualquier IP hardcodeada por la IP actual
  sed -i "s|https://[0-9]\+\.[0-9]\+\.[0-9]\+\.[0-9]\+|https://$IP|g" "$MANIFEST"
  sed -i "s|http://[0-9]\+\.[0-9]\+\.[0-9]\+\.[0-9]\+|https://$IP|g"  "$MANIFEST"
  echo -e "${GREEN}[OK] manifest.json actualizado con IP: $IP${NC}"
fi

if [ -f "$NOTIFICAR" ]; then
  sed -i "s|https://[0-9]\+\.[0-9]\+\.[0-9]\+\.[0-9]\+|https://$IP|g" "$NOTIFICAR"
  sed -i "s|http://[0-9]\+\.[0-9]\+\.[0-9]\+\.[0-9]\+|https://$IP|g"  "$NOTIFICAR"
  echo -e "${GREEN}[OK] notificar.py actualizado con IP: $IP${NC}"
fi

# Actualizar también en app.js por si hay URLs hardcodeadas
APP_JS="$FRONTEND_DIR/js/app.js"
if [ -f "$APP_JS" ]; then
  sed -i "s|https://[0-9]\+\.[0-9]\+\.[0-9]\+\.[0-9]\+|https://$IP|g" "$APP_JS"
  sed -i "s|http://[0-9]\+\.[0-9]\+\.[0-9]\+\.[0-9]\+|https://$IP|g"  "$APP_JS"
fi

# ─── 13. Resumen final ──────────────────────────────────────
echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅  INSTALACIÓN COMPLETADA                            ${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  🌐 Web (HTTP→HTTPS):    http://$IP/"
echo -e "  🔒 Web segura:          https://$IP/"
echo -e "  🔑 Login:               https://$IP/login.html"
echo -e "  📊 Dashboard:           https://$IP/dashboard.html"
echo -e "  🔧 API test:            https://$IP/backend/api.php?action=test"
echo ""
echo -e "  📁 Proyecto:            $PROYECTO_DIR"
echo -e "  📁 Frontend:            $FRONTEND_DIR"
echo -e "  📁 Backend:             $BACKEND_DIR"
echo -e "  🗄️  BD:                  eco_vecinos | eco_user | Alumno2026!"
echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║              PASOS TRAS LA INSTALACIÓN                  ║${NC}"
echo -e "${BLUE}╠══════════════════════════════════════════════════════════╣${NC}"
echo -e "${BLUE}║                                                          ║${NC}"
echo -e "${BLUE}║  1. Abre Chrome y ve a:  https://$IP/           ║${NC}"
echo -e "${BLUE}║     Acepta el certificado autofirmado la primera vez.    ║${NC}"
echo -e "${BLUE}║                                                          ║${NC}"
echo -e "${BLUE}║  2. Para instalar el certificado en Chrome (Linux):      ║${NC}"
echo -e "${BLUE}║     certutil -d sql:\$HOME/.pki/nssdb -A -t \"CT,,\"       ║${NC}"
echo -e "${BLUE}║       -n \"EcoVecinos\" -i /etc/ssl/certs/ecovecinos.crt   ║${NC}"
echo -e "${BLUE}║                                                          ║${NC}"
echo -e "${BLUE}║  3. Para instalar cert en móvil Android:                 ║${NC}"
echo -e "${BLUE}║     Descarga https://$IP/ecovecinos.crt         ║${NC}"
echo -e "${BLUE}║     Ajustes → Seguridad → Instalar certificado           ║${NC}"
echo -e "${BLUE}║                                                          ║${NC}"
echo -e "${BLUE}║  4. Configura Mailtrap en:                               ║${NC}"
echo -e "${BLUE}║     $SCRIPTS_DIR/notificar.py                ║${NC}"
echo -e "${BLUE}║     Cambia SMTP_USER y SMTP_PASS con tus credenciales    ║${NC}"
echo -e "${BLUE}║                                                          ║${NC}"
echo -e "${BLUE}║  5. Usuarios de prueba (contraseña: Test1234!):          ║${NC}"
echo -e "${BLUE}║     marta@example.com / ana@test.com / luis@test.com     ║${NC}"
echo -e "${BLUE}║                                                          ║${NC}"
echo -e "${BLUE}║  6. PWA — Instalar como app en móvil:                    ║${NC}"
echo -e "${BLUE}║     Chrome → Menú → Añadir a pantalla de inicio          ║${NC}"
echo -e "${BLUE}║                                                          ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}  Si algo falla, revisa los logs:${NC}"
echo -e "  sudo tail -f /var/log/apache2/eco_vecinos_error.log"
echo ""
