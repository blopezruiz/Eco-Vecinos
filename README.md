# 🌿 EcoVecinos

**Plataforma comunitaria de intercambio de alimentos entre vecinos**

<img width="129" height="72" alt="logo" src="https://github.com/user-attachments/assets/a98595ce-01cb-4065-9892-45dbe3457386" />


> Proyecto Intermodular — ASIR 2  
> Beatriz López Ruiz · Diego Martínez Fernández · Rocío Alondra Omonte Coronel

---

## 📋 Descripción

EcoVecinos es una aplicación web progresiva (PWA) que permite a los vecinos de una misma comunidad compartir alimentos próximos a caducar, reduciendo el desperdicio alimentario y fomentando la economía colaborativa. Los usuarios pueden publicar alimentos con foto y ticket de compra, solicitar intercambios, chatear con otros vecinos y acumular puntos ecológicos por su participación. Al realizarse una solicitud de intercambio, el sistema notifica automáticamente al dueño del alimento por email mediante un script Python integrado.

---

## 🏗️ Arquitectura

**Stack LAMP + Python + PWA:**

```
Ubuntu Server
    └── Apache 2.4 (HTTP → HTTPS con certificado SSL)
            ├── DocumentRoot → /var/www/html/Proyecto/frontend/
            └── Alias /backend → /var/www/html/Proyecto/backend/

MySQL 8.x  ←→  PHP 8.x (API REST)  ←→  Frontend HTML/CSS/JS
                    ↓
              Python 3 (notificar.py)
                    ↓
              Mailtrap SMTP (notificaciones email)
```

### Estructura de carpetas

```
Proyecto/
├── frontend/                    # Interfaz web (HTML + CSS + JS)
│   ├── index.html               # Página principal / landing
│   ├── login.html               # Login y registro
│   ├── dashboard.html           # Panel del usuario
│   ├── manifest.json            # Configuración PWA
│   ├── sw.js                    # Service Worker (caché offline)
│   ├── ecovecinos.crt           # Certificado SSL (para clientes)
│   ├── css/
│   │   ├── estilos.css          # Estilos landing y login
│   │   └── estilos_dashboard.css # Estilos dashboard + responsive móvil
│   ├── js/
│   │   └── app.js               # Lógica frontend completa (fetch API)
│   └── images/
│       ├── logo.png             # Logo oficial
│       ├── icon-192_v2.png      # Icono PWA 192×192
│       └── icon-512_v2.png      # Icono PWA 512×512
│
├── backend/                     # Lógica de servidor (PHP)
│   ├── api.php                  # Punto de entrada único (API REST)
│   ├── config/
│   │   └── db.php               # Conexión MySQL
│   ├── models/
│   │   ├── Usuarios.php
│   │   ├── Alimentos.php
│   │   ├── Intercambios.php
│   │   └── Chat.php
│   └── uploads/                 # Imágenes y tickets subidos por usuarios
│
├── scripts/
│   ├── BD.sql                   # Esquema completo + datos de prueba
│   └── notificar.py             # Script Python — notificaciones por email
│
├── docs/                        # Documentación adicional y diagramas
├── instalar_eco_vecinos.sh      # Script de instalación automática
└── README.md
```

---

## ⚡ Instalación rápida

### Requisitos previos

- Ubuntu Server 22.04 LTS o superior
- Acceso root / sudo
- Conexión a internet (para `apt` y `pip`)

### Pasos

```bash
# 1. Descomprimir el proyecto en el servidor
unzip Proyecto.zip

# 2. Dar permisos de ejecución al instalador
chmod +x instalar_eco_vecinos.sh

# 3. Ejecutar como root
sudo ./instalar_eco_vecinos.sh
```

El script realiza automáticamente:

1. Instala Apache2, PHP, MySQL, Python3 y herramientas SSL
2. Genera un certificado SSL autofirmado con SAN para la IP del servidor
3. Configura Apache con redirección HTTP → HTTPS y Alias `/backend`
4. Crea la estructura de directorios en `/var/www/html/Proyecto/`
5. Copia los archivos del proyecto y aplica permisos
6. Crea el usuario MySQL `eco_user` y la base de datos `eco_vecinos`
7. Importa el esquema y datos de prueba desde `BD.sql`
8. Instala el conector MySQL para Python (`mysql-connector-python`)
9. Actualiza automáticamente las URLs con la IP del servidor

---

## 🔒 HTTPS y certificado SSL

EcoVecinos usa HTTPS con un certificado autofirmado generado durante la instalación. Es necesario para que la PWA funcione correctamente en modo standalone.

### Instalar el certificado en el navegador (Linux/Chrome)

```bash
certutil -d sql:$HOME/.pki/nssdb -A -t "CT,," \
  -n "EcoVecinos" -i /etc/ssl/certs/ecovecinos.crt
```

Cierra y vuelve a abrir Chrome.

### Instalar el certificado en móvil Android

1. Descarga el certificado desde el navegador del móvil:
   ```
   https://IP_SERVIDOR/ecovecinos.crt
   ```
2. **Ajustes → Seguridad → Instalar certificado → Certificado CA**
3. Selecciona el archivo descargado

> ⚠️ Android 11+ no permite instalar CAs de terceros. Usa un dispositivo con Android 9 o 10, o accede vía ngrok para HTTPS real.

---

## 🌐 URLs del proyecto

Una vez instalado (ejemplo con IP `192.168.1.137`):

| Recurso | URL |
|---|---|
| Página principal | `https://IP/` |
| Login / Registro | `https://IP/login.html` |
| Dashboard | `https://IP/dashboard.html` |
| API (test) | `https://IP/backend/api.php?action=test` |
| API (ranking) | `https://IP/backend/api.php?action=ranking` |
| Certificado SSL | `https://IP/ecovecinos.crt` |

---

## 🗄️ Base de datos

**Nombre:** `eco_vecinos`  
**Usuario:** `eco_user`  
**Contraseña:** `Alumno2026!`  
**Host:** `localhost`

### Diagrama ER

```
┌─────────────┐       ┌──────────────┐       ┌─────────────────┐
│  usuarios   │       │   alimentos  │       │   intercambios  │
│─────────────│       │──────────────│       │─────────────────│
│ id (PK)     │──┐    │ id (PK)      │──┐    │ id (PK)         │
│ nombre      │  └───>│ usuario_id   │  └───>│ alimento_id     │
│ email       │       │ nombre       │       │ usuario_solicit.│
│ password    │  ┌───>│ categoria    │  ┌───>│ usuario_recept. │
│ puntos      │  │    │ fecha_cad.   │  │    │ estado ENUM     │
│ barrio      │──┘    │ imagen       │  │    │ creado_en       │
│ creado_en   │       │ ticket       │  │    └─────────────────┘
└─────────────┘       │ creado_en    │  │
                      └──────────────┘  │    ┌─────────────┐
                                        │    │    chat     │
                                        └───>│─────────────│
                                             │ id (PK)     │
                                             │ de_id       │
                                             │ para_id     │
                                             │ mensaje     │
                                             │ creado_en   │
                                             └─────────────┘
```

### Tablas

| Tabla | Descripción |
|---|---|
| `usuarios` | Registro de usuarios con puntos y barrio |
| `alimentos` | Publicaciones con imagen, ticket y categoría |
| `intercambios` | Solicitudes (pendiente / aceptado / rechazado) con receptor explícito |
| `chat` | Mensajes globales (`para_id=0`) y privados entre usuarios |

### Importar manualmente

```bash
mysql -u eco_user -p'Alumno2026!' eco_vecinos < scripts/BD.sql
```

---

## 🔑 Usuarios de prueba

> Contraseña para todos: **`Test1234!`**

| Nombre | Email | Barrio | Puntos |
|---|---|---|---|
| Marta | marta@example.com | Centro | 50 |
| Luis | luis@example.com | Norte | 20 |
| Ana | ana@example.com | Sur | 10 |

> ⚠️ Si el login falla con credenciales correctas, regenera el hash en tu versión de PHP:
> ```bash
> php -r "echo password_hash('Test1234!', PASSWORD_DEFAULT);"
> ```
> Y actualiza el campo `password` en MySQL.

---

## 🔧 API REST — Referencia completa

Todos los endpoints se invocan desde `https://IP/backend/api.php`.

### Autenticación

| Acción | Método | Parámetros | Descripción |
|---|---|---|---|
| `login` | POST | `email`, `password` | Devuelve datos del usuario + puntos |
| `registro` | POST | `nombre`, `email`, `password`, `barrio` | Crea nuevo usuario |

### Usuarios

| Acción | Método | Parámetros | Descripción |
|---|---|---|---|
| `mis_puntos` | GET | `usuario_id` | Puntos actuales del usuario |
| `mi_barrio` | GET | `usuario_id` | Estadísticas del barrio del usuario |

### Alimentos

| Acción | Método | Parámetros | Descripción |
|---|---|---|---|
| `crear_alimento` | POST | `usuario_id`, `nombre`, `categoria`, `fecha_caducidad`, `imagen` (file), `ticket` (file) | Publica un alimento con foto y ticket |
| `alimentos_barrio` | GET | `usuario_id` | Lista alimentos del barrio |
| `mis_alimentos` | GET | `usuario_id` | Lista alimentos propios |

### Intercambios

| Acción | Método | Parámetros | Descripción |
|---|---|---|---|
| `solicitar_intercambio` | POST | `usuario_id`, `alimento_id` | Solicita un alimento + notifica por email |
| `responder_intercambio` | POST | `usuario_id`, `intercambio_id`, `estado` | Acepta o rechaza (suma 10 pts si acepta) |
| `intercambios_recibidos` | GET | `usuario_id` | Solicitudes recibidas |
| `intercambios_enviados` | GET | `usuario_id` | Solicitudes enviadas |
| `intercambios_aceptados` | GET | `usuario_id` | Intercambios aceptados (para chat) |
| `contar_pendientes` | GET | `usuario_id` | Nº de solicitudes pendientes (badge) |

### Chat

| Acción | Método | Parámetros | Descripción |
|---|---|---|---|
| `chat_enviar` | POST | `de_id`, `para_id` (0=global), `mensaje` | Envía mensaje |
| `chat_listar` | GET | `usuario_id`, `otro_id` | Conversación privada |
| `chat_global_listar` | GET | `limite` (máx. 100) | Chat global del barrio |

### Utilidades

| Acción | Método | Descripción |
|---|---|---|
| `ranking` | GET | Top usuarios por puntos |
| `test` | GET | Comprueba que la API responde |

---

## 🐍 Notificaciones por email (Python)

Al solicitar un intercambio, PHP llama automáticamente al script Python en segundo plano:

```php
$script = '/var/www/html/Proyecto/scripts/notificar.py';
shell_exec("python3 $script $nuevo_id > /dev/null 2>&1 &");
```

El script `notificar.py`:
1. Conecta a MySQL y obtiene los datos del intercambio
2. Compone un email HTML con el alimento, solicitante y botón de acción
3. Lo envía via SMTP a Mailtrap (entorno de pruebas)

### Configurar Mailtrap

Edita `scripts/notificar.py` y cambia las credenciales:

```python
SMTP_HOST = 'sandbox.smtp.mailtrap.io'
SMTP_PORT = 2525
SMTP_USER = 'TU_USER_MAILTRAP'   # mailtrap.io → Sandboxes → SMTP Settings
SMTP_PASS = 'TU_PASS_MAILTRAP'
```

### Probar manualmente

```bash
# Ver ID del último intercambio
mysql -u eco_user -p eco_vecinos \
  -e "SELECT id FROM intercambios ORDER BY id DESC LIMIT 1;"

# Ejecutar el script
python3 /var/www/html/Proyecto/scripts/notificar.py ID
```

### Para producción real

Sustituye Mailtrap por SendGrid o Mailgun cambiando solo las credenciales SMTP — el código Python no varía.

---

## 📱 PWA — Progressive Web App

EcoVecinos es instalable como app nativa en móvil y escritorio.

### Archivos PWA

| Archivo | Descripción |
|---|---|
| `frontend/manifest.json` | Nombre, iconos, colores, modo standalone |
| `frontend/sw.js` | Service Worker — caché offline |
| `frontend/images/icon-192_v2.png` | Icono 192×192 (fondo blanco) |
| `frontend/images/icon-512_v2.png` | Icono 512×512 (fondo blanco) |

### Instalar en móvil

1. Abre Chrome y ve a `https://IP/login.html`
2. Acepta el certificado autofirmado
3. Menú (⋮) → **Añadir a pantalla de inicio**
4. La app se abre sin barra de navegador en modo standalone

### Responsive móvil

En pantallas ≤768px el sidebar desaparece y se muestra una **barra de navegación inferior** con acceso a todas las secciones. El badge de notificaciones aparece tanto en el sidebar (escritorio) como en la nav inferior (móvil).

---

## 🔒 Seguridad

- Contraseñas hasheadas con `password_hash()` / `PASSWORD_DEFAULT` (bcrypt)
- Consultas preparadas con `mysqli` (protección SQL injection)
- Validación de extensiones de archivo en uploads (jpg, png, gif, webp, pdf)
- Verificación de propiedad antes de aceptar/rechazar intercambios
- Cabeceras CORS configuradas en la API
- HTTPS obligatorio con redirección automática desde HTTP

---

## 🛠️ Configuración Apache (referencia)

```apache
# HTTP → HTTPS
<VirtualHost *:80>
    DocumentRoot /var/www/html/Proyecto/frontend
    RewriteEngine On
    RewriteRule ^(.*)$ https://%{HTTP_HOST}$1 [R=307,L]
</VirtualHost>

# HTTPS
<VirtualHost *:443>
    DocumentRoot /var/www/html/Proyecto/frontend
    SSLEngine on
    SSLCertificateFile    /etc/ssl/certs/ecovecinos.crt
    SSLCertificateKeyFile /etc/ssl/private/ecovecinos.key
    Alias /backend /var/www/html/Proyecto/backend
    <Directory /var/www/html/Proyecto/backend>
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
```

---

## 🐛 Solución de problemas

| Problema | Solución |
|---|---|
| API devuelve "acción no válida" al hacer login | Accede por HTTPS, no HTTP — el POST se pierde en la redirección 301 |
| Service Worker no se registra | Acepta el certificado en el navegador primero |
| Las imágenes no se suben | `sudo chown -R www-data:www-data backend/uploads && chmod 775 backend/uploads` |
| Notificaciones Python no llegan | `sudo -u www-data python3 scripts/notificar.py ID` — verifica permisos y credenciales Mailtrap |
| PWA no abre en modo standalone | Requiere HTTPS — instala el certificado en el dispositivo |
| Error 404 en `/backend/api.php` | Verifica que el Alias de Apache esté activo: `sudo a2ensite eco-vecinos.conf && systemctl reload apache2` |
| Login falla con credenciales correctas | Regenera hash bcrypt con tu versión de PHP (ver sección usuarios de prueba) |
| Badge de notificaciones no aparece en móvil | Limpia caché del navegador — el SW puede estar sirviendo CSS antiguo |

### Ver logs

```bash
sudo tail -f /var/log/apache2/eco_vecinos_error.log
sudo tail -f /var/log/apache2/eco_vecinos_access.log
```

---

## 📦 Tecnologías utilizadas

| Componente | Tecnología |
|---|---|
| Sistema operativo | Ubuntu Server 22.04 LTS |
| Servidor web | Apache 2.4 con SSL |
| Backend | PHP 8.x (API REST) |
| Base de datos | MySQL 8.x |
| Frontend | HTML5, CSS3, JavaScript ES6+ |
| Notificaciones | Python 3 + smtplib + Mailtrap |
| App móvil | PWA (manifest + Service Worker) |
| Comunicación | API REST (JSON) |
| Seguridad | HTTPS, bcrypt, consultas preparadas |

---

## 📄 Licencia

Proyecto educativo — ASIR 2 — Uso académico.
