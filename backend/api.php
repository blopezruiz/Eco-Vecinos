<?php
/* ============================================================
   EcoVecinos — API REST
   Archivo: backend/api.php
   Apache: Alias /backend → /var/www/html/Proyecto/backend/
============================================================ */

require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/models/Usuarios.php';
require_once __DIR__ . '/models/Alimentos.php';
require_once __DIR__ . '/models/Intercambios.php';
require_once __DIR__ . '/models/Chat.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

function json_ok($data = []) {
    echo json_encode(array_merge(['status' => 'ok'], $data));
    exit;
}

function json_error($msg, $code = 400) {
    http_response_code($code);
    echo json_encode(['status' => 'error', 'mensaje' => $msg]);
    exit;
}

$accion = $_POST['action'] ?? $_GET['action'] ?? '';

$usuarios     = new Usuarios($conn);
$alimentos    = new Alimentos($conn);
$intercambios = new Intercambios($conn);
$chat         = new Chat($conn);

switch ($accion) {

    /* ============================================================
       AUTH
    ============================================================ */
    case 'login':
        $email    = trim($_POST['email']    ?? '');
        $password = trim($_POST['password'] ?? '');
        if (!$email || !$password) json_error('Datos incompletos');

        $user = $usuarios->buscarPorEmail($email);
        if (!$user) json_error('Usuario no encontrado', 401);
        if (!password_verify($password, $user['password'])) json_error('Credenciales incorrectas', 401);

        json_ok(['usuario' => [
            'id'     => $user['id'],
            'nombre' => $user['nombre'],
            'email'  => $user['email'],
            'puntos' => $user['puntos'] ?? 0,
        ]]);
        break;

    case 'registro':
        $nombre   = trim($_POST['nombre']   ?? '');
        $email    = trim($_POST['email']    ?? '');
        $password = trim($_POST['password'] ?? '');
        $barrio   = trim($_POST['barrio']   ?? '');

        if (!$nombre || !$email || !$password) json_error('Datos incompletos');
        if (strlen($password) < 8) json_error('La contraseña debe tener al menos 8 caracteres');
        if ($usuarios->buscarPorEmail($email)) json_error('El email ya está registrado', 409);

        $hash  = password_hash($password, PASSWORD_DEFAULT);
        $nuevo = $usuarios->crear($nombre, $email, $hash, $barrio ?: 'Sin barrio');

        json_ok(['usuario' => [
            'id'     => $nuevo['id'],
            'nombre' => $nuevo['nombre'],
            'email'  => $nuevo['email'],
            'puntos' => 0,
        ]]);
        break;

    /* ============================================================
       USUARIOS
    ============================================================ */
    case 'mis_puntos':
        $usuario_id = (int)($_GET['usuario_id'] ?? 0);
        if (!$usuario_id) json_error('ID inválido');
        $res = $conn->query("SELECT puntos FROM usuarios WHERE id=$usuario_id");
        $row = $res->fetch_assoc();
        json_ok(['puntos' => $row['puntos'] ?? 0]);
        break;

    case 'mi_barrio':
        $usuario_id = (int)($_GET['usuario_id'] ?? 0);
        if (!$usuario_id) json_error('ID inválido');

        $urow   = $conn->query("SELECT barrio FROM usuarios WHERE id=$usuario_id")->fetch_assoc();
        $barrio = $conn->real_escape_string($urow['barrio'] ?? 'Sin barrio');

        $totalAlimentos = $conn->query("
            SELECT COUNT(*) AS total FROM alimentos a
            JOIN usuarios u ON a.usuario_id = u.id
            WHERE u.barrio = '$barrio'
        ")->fetch_assoc()['total'];

        $totalVecinos = $conn->query("
            SELECT COUNT(*) AS total FROM usuarios WHERE barrio='$barrio'
        ")->fetch_assoc()['total'];

        $totalIntercambios = $conn->query("
            SELECT COUNT(*) AS total FROM intercambios i
            JOIN alimentos a ON i.alimento_id = a.id
            JOIN usuarios u ON a.usuario_id = u.id
            WHERE u.barrio='$barrio' AND i.estado='aceptado'
        ")->fetch_assoc()['total'];

        json_ok([
            'barrio'             => $urow['barrio'] ?? 'Sin barrio',
            'total_alimentos'    => (int)$totalAlimentos,
            'total_vecinos'      => (int)$totalVecinos,
            'total_intercambios' => (int)$totalIntercambios,
        ]);
        break;

    /* ============================================================
       ALIMENTOS
    ============================================================ */
    case 'crear_alimento':
        $usuario_id = (int)($_POST['usuario_id'] ?? 0);
        $nombre     = trim($_POST['nombre']          ?? '');
        $categoria  = trim($_POST['categoria']       ?? '');
        $fecha      = trim($_POST['fecha_caducidad'] ?? '');

        if (!$usuario_id || !$nombre || !$categoria || !$fecha) json_error('Datos incompletos');

        $uploads_dir = __DIR__ . '/uploads/';
        if (!is_dir($uploads_dir)) mkdir($uploads_dir, 0755, true);

        $imagen_path = null;
        if (!empty($_FILES['imagen']['name']) && $_FILES['imagen']['error'] === 0) {
            $ext        = strtolower(pathinfo($_FILES['imagen']['name'], PATHINFO_EXTENSION));
            $permitidas = ['jpg','jpeg','png','gif','webp'];
            if (!in_array($ext, $permitidas)) json_error('Formato de imagen no permitido');
            $nombre_img  = time() . '_' . uniqid() . '_img.' . $ext;
            $imagen_path = 'uploads/' . $nombre_img;
            move_uploaded_file($_FILES['imagen']['tmp_name'], $uploads_dir . $nombre_img);
        }

        $ticket_path = null;
        if (!empty($_FILES['ticket']['name']) && $_FILES['ticket']['error'] === 0) {
            $ext        = strtolower(pathinfo($_FILES['ticket']['name'], PATHINFO_EXTENSION));
            $permitidas = ['jpg','jpeg','png','gif','webp','pdf'];
            if (!in_array($ext, $permitidas)) json_error('Formato de ticket no permitido');
            $nombre_tkt  = time() . '_' . uniqid() . '_ticket.' . $ext;
            $ticket_path = 'uploads/' . $nombre_tkt;
            move_uploaded_file($_FILES['ticket']['tmp_name'], $uploads_dir . $nombre_tkt);
        }

        $res = $alimentos->crearAlimento($usuario_id, $nombre, $categoria, $fecha, $imagen_path, $ticket_path);
        echo json_encode($res);
        exit;

    case 'alimentos_barrio':
        $usuario_id = (int)($_GET['usuario_id'] ?? 0);
        echo json_encode($alimentos->listarAlimentosBarrio($usuario_id));
        exit;

    case 'mis_alimentos':
        $usuario_id = (int)($_GET['usuario_id'] ?? 0);
        if (!$usuario_id) json_error('ID inválido');
        echo json_encode($alimentos->listarMisAlimentos($usuario_id));
        exit;

    /* ============================================================
       INTERCAMBIOS
    ============================================================ */
    case 'solicitar_intercambio':
        $usuario_id  = (int)($_POST['usuario_id']  ?? 0);
        $alimento_id = (int)($_POST['alimento_id'] ?? 0);
        if (!$usuario_id || !$alimento_id) json_error('Datos incompletos');

        // Obtener dueño del alimento → será usuario_receptor
        $alimento = $conn->query("SELECT usuario_id FROM alimentos WHERE id=$alimento_id")->fetch_assoc();
        if (!$alimento) json_error('Alimento no encontrado');
        if ($alimento['usuario_id'] == $usuario_id) json_error('No puedes solicitar tu propio alimento');

        $usuario_receptor = (int)$alimento['usuario_id'];

        // Evitar duplicados
        $existe = $conn->query("
            SELECT id FROM intercambios
            WHERE alimento_id=$alimento_id
              AND usuario_solicitante=$usuario_id
              AND estado IN ('pendiente','aceptado')
        ")->fetch_assoc();
        if ($existe) json_error('Ya has solicitado este alimento');

        $stmt = $conn->prepare("
            INSERT INTO intercambios (alimento_id, usuario_solicitante, usuario_receptor)
            VALUES (?, ?, ?)
        ");
        $stmt->bind_param('iii', $alimento_id, $usuario_id, $usuario_receptor);
        if ($stmt->execute()) {
            $nuevo_id = $conn->insert_id;

            // Notificar al dueño por email via Python
            $script = '/var/www/html/Proyecto/scripts/notificar.py';
            shell_exec("python3 $script $nuevo_id > /dev/null 2>&1 &");

            json_ok(['mensaje' => 'Solicitud enviada correctamente']);
        } else {
            json_error('Error al crear solicitud: ' . $conn->error);
        }
        break;

        

    case 'responder_intercambio':
        $intercambio_id = (int)($_POST['intercambio_id'] ?? 0);
        $estado         = trim($_POST['estado']          ?? '');
        $usuario_id     = (int)($_POST['usuario_id']     ?? 0);

        if (!$intercambio_id || !in_array($estado, ['aceptado', 'rechazado'])) json_error('Datos inválidos');

        $check = $conn->query("
            SELECT id, usuario_receptor FROM intercambios WHERE id=$intercambio_id
        ")->fetch_assoc();

        if (!$check) json_error('Intercambio no encontrado');
        if ($check['usuario_receptor'] != $usuario_id) json_error('No autorizado', 403);

        $stmt = $conn->prepare("UPDATE intercambios SET estado=? WHERE id=?");
        $stmt->bind_param('si', $estado, $intercambio_id);
        $stmt->execute();

        if ($estado === 'aceptado') {
            $conn->query("UPDATE usuarios SET puntos = puntos + 10 WHERE id=$usuario_id");
        }

        json_ok(['estado' => $estado]);
        break;

    case 'intercambios_recibidos':
        $usuario_id = (int)($_GET['usuario_id'] ?? 0);
        if (!$usuario_id) json_error('ID inválido');

        // Recibidos = yo soy el receptor (dueño del alimento)
        $sql = "SELECT i.id, i.estado, i.creado_en AS fecha,
                       a.nombre AS alimento_nombre,
                       u.nombre AS otro_nombre
                FROM intercambios i
                JOIN alimentos a ON i.alimento_id = a.id
                JOIN usuarios u  ON i.usuario_solicitante = u.id
                WHERE i.usuario_receptor = ?
                ORDER BY i.creado_en DESC";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param('i', $usuario_id);
        $stmt->execute();
        $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        json_ok(['intercambios' => $rows]);
        break;

    case 'intercambios_enviados':
        $usuario_id = (int)($_GET['usuario_id'] ?? 0);
        if (!$usuario_id) json_error('ID inválido');

        // Enviados = yo soy el solicitante
        $sql = "SELECT i.id, i.estado, i.creado_en AS fecha,
                       a.nombre AS alimento_nombre,
                       u.nombre AS otro_nombre
                FROM intercambios i
                JOIN alimentos a ON i.alimento_id = a.id
                JOIN usuarios u  ON i.usuario_receptor = u.id
                WHERE i.usuario_solicitante = ?
                ORDER BY i.creado_en DESC";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param('i', $usuario_id);
        $stmt->execute();
        $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        json_ok(['intercambios' => $rows]);
        break;

    case 'intercambios_aceptados':
        $usuario_id = (int)($_GET['usuario_id'] ?? 0);
        if (!$usuario_id) json_error('ID inválido');
        echo json_encode($intercambios->listarAceptados($usuario_id));
        exit;

    /* ============================================================
       RANKING
    ============================================================ */
    case 'ranking':
        json_ok(['ranking' => $usuarios->obtenerRanking()]);
        break;

    /* ============================================================
       CHAT
    ============================================================ */
    case 'chat_enviar':
        $de_id   = (int)($_POST['de_id']   ?? 0);
        $para_id = (int)($_POST['para_id'] ?? 0);
        $mensaje = trim($_POST['mensaje']  ?? '');
        if (!$de_id || !$mensaje) json_error('Datos no válidos');
        echo json_encode($chat->enviarMensaje($de_id, $para_id, $mensaje));
        exit;

    case 'chat_listar':
        $usuario_id = (int)($_GET['usuario_id'] ?? 0);
        $otro_id    = (int)($_GET['otro_id']    ?? 0);
        if (!$usuario_id || !$otro_id) json_error('Datos no válidos');
        echo json_encode($chat->listarConversacion($usuario_id, $otro_id));
        exit;

    case 'chat_global_listar':
        $limite = min((int)($_GET['limite'] ?? 50), 100);
        echo json_encode($chat->listarGlobal($limite));
        exit;

    /* ============================================================
       TEST
    ============================================================ */
    case 'contar_pendientes':
    $usuario_id = (int)($_GET['usuario_id'] ?? 0);
    if (!$usuario_id) json_error('ID inválido');

    $res = $conn->query("
        SELECT COUNT(*) AS total FROM intercambios
        WHERE usuario_receptor = $usuario_id
          AND estado = 'pendiente'
    ");
    $total = $res->fetch_assoc()['total'] ?? 0;
    json_ok(['pendientes' => (int)$total]);
    break;

    case 'test':
        json_ok(['mensaje' => 'API EcoVecinos funcionando correctamente ✅']);
        break;

    default:
        json_error("Acción '$accion' no válida");
}