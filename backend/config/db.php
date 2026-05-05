<?php
/* ============================================================
   EcoVecinos — Conexión a la base de datos
============================================================ */

define('DB_HOST', 'localhost');
define('DB_USER', 'eco_user');
define('DB_PASS', 'Alumno2026!');
define('DB_NAME', 'eco_vecinos');

$conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
$conn->set_charset('utf8mb4');

if ($conn->connect_error) {
    http_response_code(500);
    header('Content-Type: application/json');
    die(json_encode([
        'status'  => 'error',
        'mensaje' => 'Error de conexión: ' . $conn->connect_error
    ]));
}
