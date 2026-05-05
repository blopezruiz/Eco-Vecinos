#!/usr/bin/env python3
# =============================================================
#  EcoVecinos — notificar.py
#  Envía email al dueño del alimento cuando alguien lo solicita
#  Coloca este archivo en: /var/www/html/Proyecto/scripts/
# =============================================================

import sys
import smtplib
import mysql.connector
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# ── Configuración base de datos ──────────────────────────────
DB_CONFIG = {
    'host':     'localhost',
    'user':     'eco_user',
    'password': 'Alumno2026!',
    'database': 'eco_vecinos'
}

# ── Configuración SMTP Mailtrap ──────────────────────────────
# Consigue estas credenciales en mailtrap.io → Email Testing → Inboxes
SMTP_HOST = 'sandbox.smtp.mailtrap.io'
SMTP_PORT = 2525
SMTP_USER = '23d173432a7501'     # ← cambia esto
SMTP_PASS = '64abf8caa4c364'     # ← cambia esto
FROM_EMAIL = 'EcoVecinos <noreply@ecovecinos.local>'


def notificar_solicitud(intercambio_id):
    """
    Obtiene los datos del intercambio y envía un email
    al dueño del alimento avisándole de la solicitud.
    """

    # Conectar a la BD
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cur  = conn.cursor(dictionary=True)
    except mysql.connector.Error as e:
        print(f"[ERROR] No se pudo conectar a la BD: {e}", file=sys.stderr)
        sys.exit(1)

    # Obtener datos del intercambio
    cur.execute("""
        SELECT
            i.id,
            a.nombre            AS alimento,
            a.fecha_caducidad   AS caducidad,
            a.categoria,
            u_dueno.nombre      AS dueno_nombre,
            u_dueno.email       AS dueno_email,
            u_sol.nombre        AS solicitante_nombre,
            u_sol.email         AS solicitante_email
        FROM intercambios i
        JOIN alimentos a        ON i.alimento_id         = a.id
        JOIN usuarios u_dueno   ON i.usuario_receptor    = u_dueno.id
        JOIN usuarios u_sol     ON i.usuario_solicitante = u_sol.id
        WHERE i.id = %s
    """, (intercambio_id,))

    row = cur.fetchone()
    cur.close()
    conn.close()

    if not row:
        print(f"[ERROR] Intercambio {intercambio_id} no encontrado", file=sys.stderr)
        sys.exit(1)

    # Emojis por categoría
    emojis = {
        'fruta':    '🍎',
        'verdura':  '🥦',
        'pan':      '🍞',
        'lacteos':  '🧀',
        'cereales': '🌾',
        'otros':    '📦'
    }
    emoji = emojis.get((row['categoria'] or '').lower(), '🍽️')

    # Componer email HTML
    msg = MIMEMultipart('alternative')
    msg['Subject'] = f"🌿 {row['solicitante_nombre']} quiere tu {row['alimento']}"
    msg['From']    = FROM_EMAIL
    msg['To']      = row['dueno_email']

    html = f"""
<!DOCTYPE html>
<html lang="es">
<body style="margin:0;padding:0;font-family:'DM Sans',Arial,sans-serif;background:#F5F6F0;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table width="480" cellpadding="0" cellspacing="0"
               style="background:white;border-radius:16px;overflow:hidden;border:1px solid #D5DDD6;">

          <!-- Cabecera verde -->
          <tr>
            <td style="background:#2E7D32;padding:24px 28px;">
              <h1 style="margin:0;color:white;font-size:22px;font-weight:700;">
                🌿 EcoVecinos
              </h1>
              <p style="margin:4px 0 0;color:rgba(255,255,255,.75);font-size:13px;">
                Red de Intercambio Alimentario
              </p>
            </td>
          </tr>

          <!-- Cuerpo -->
          <tr>
            <td style="padding:28px;">

              <p style="margin:0 0 16px;color:#1C2B1E;font-size:15px;">
                Hola <strong>{row['dueno_nombre']}</strong>,
              </p>

              <p style="margin:0 0 20px;color:#1C2B1E;font-size:15px;">
                <strong>{row['solicitante_nombre']}</strong> ha solicitado
                uno de tus alimentos en EcoVecinos:
              </p>

              <!-- Tarjeta alimento -->
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="background:#F5F6F0;border-radius:12px;border:1px solid #D5DDD6;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px;">
                    <p style="margin:0 0 6px;font-size:20px;">
                      {emoji} <strong style="color:#1C2B1E;">{row['alimento']}</strong>
                    </p>
                    <p style="margin:0;color:#5A6B5C;font-size:13px;">
                      📅 Caduca: {row['caducidad']}
                    </p>
                    <p style="margin:4px 0 0;color:#5A6B5C;font-size:13px;">
                      👤 Solicitado por: {row['solicitante_nombre']}
                      ({row['solicitante_email']})
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 24px;color:#1C2B1E;font-size:15px;">
                Entra en EcoVecinos y decide si quieres
                <strong>aceptar o rechazar</strong> la solicitud.
              </p>

              <!-- Botón -->
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#2E7D32;border-radius:10px;">
                    <a href="https://192.168.1.137/dashboard.html"
                       style="display:inline-block;padding:14px 28px;color:white;
                              text-decoration:none;font-size:15px;font-weight:600;">
                      Ver solicitud →
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Pie -->
          <tr>
            <td style="background:#F5F6F0;padding:16px 28px;
                       border-top:1px solid #D5DDD6;">
              <p style="margin:0;color:#5A6B5C;font-size:12px;">
                EcoVecinos · Red de Intercambio Alimentario · 2026
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""

    msg.attach(MIMEText(html, 'html'))

    # Enviar
    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as s:
            s.starttls()
            s.login(SMTP_USER, SMTP_PASS)
            s.sendmail(FROM_EMAIL, row['dueno_email'], msg.as_string())
        print(f"[OK] Email enviado a {row['dueno_email']} — intercambio #{intercambio_id}")
    except Exception as e:
        print(f"[ERROR] No se pudo enviar el email: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Uso: python3 notificar.py <intercambio_id>", file=sys.stderr)
        sys.exit(1)

    try:
        intercambio_id = int(sys.argv[1])
    except ValueError:
        print("[ERROR] El intercambio_id debe ser un número", file=sys.stderr)
        sys.exit(1)

    notificar_solicitud(intercambio_id)