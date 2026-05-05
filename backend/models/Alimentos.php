<?php
class Alimentos {
    private $conn;

    public function __construct($conn) {
        $this->conn = $conn;
    }

    public function crearAlimento($usuario_id, $nombre, $categoria, $fecha, $imagen = null, $ticket = null) {
        $stmt = $this->conn->prepare(
            "INSERT INTO alimentos (usuario_id, nombre, categoria, fecha_caducidad, imagen, ticket)
             VALUES (?, ?, ?, ?, ?, ?)"
        );
        $stmt->bind_param('isssss', $usuario_id, $nombre, $categoria, $fecha, $imagen, $ticket);

        if (!$stmt->execute()) {
            return ['status' => 'error', 'mensaje' => 'No se pudo crear el alimento'];
        }

        // Sumar puntos directamente en la tabla usuarios
        $this->sumarPuntos($usuario_id, 10);

        return ['status' => 'ok', 'id' => $this->conn->insert_id];
    }

    public function listarAlimentosBarrio($usuario_id_excluir = 0) {
        $sql = "SELECT a.id, a.nombre, a.fecha_caducidad, a.imagen, a.ticket,
                       a.usuario_id, u.nombre AS usuario_nombre, a.categoria
                FROM alimentos a
                JOIN usuarios u ON a.usuario_id = u.id
                WHERE a.usuario_id != ?
                ORDER BY a.creado_en DESC
                LIMIT 50";
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param('i', $usuario_id_excluir);
        $stmt->execute();
        return ['status' => 'ok', 'alimentos' => $stmt->get_result()->fetch_all(MYSQLI_ASSOC)];
    }

    public function listarMisAlimentos($usuario_id) {
        $sql = "SELECT a.id, a.nombre, a.fecha_caducidad, a.imagen, a.ticket,
                       a.usuario_id, u.nombre AS usuario_nombre, a.categoria
                FROM alimentos a
                JOIN usuarios u ON a.usuario_id = u.id
                WHERE a.usuario_id = ?
                ORDER BY a.creado_en DESC";
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param('i', $usuario_id);
        $stmt->execute();
        return ['status' => 'ok', 'alimentos' => $stmt->get_result()->fetch_all(MYSQLI_ASSOC)];
    }

    private function sumarPuntos($usuario_id, $cantidad) {
        $stmt = $this->conn->prepare(
            "UPDATE usuarios SET puntos = puntos + ? WHERE id = ?"
        );
        $stmt->bind_param('ii', $cantidad, $usuario_id);
        $stmt->execute();
    }
}