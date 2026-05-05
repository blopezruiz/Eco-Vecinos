<?php

class Intercambios {

    private $conn;

    public function __construct($db) {
        $this->conn = $db;
    }

    /* ============================================================
       LISTAR INTERCAMBIOS ACEPTADOS (para chats)
       ============================================================ */
    public function listarAceptados($usuario_id) {

        $sql = "
            SELECT i.*, 
                   u1.nombre AS solicitante_nombre,
                   u2.nombre AS receptor_nombre
            FROM intercambios i
            JOIN usuarios u1 ON u1.id = i.usuario_solicitante
            JOIN usuarios u2 ON u2.id = i.usuario_receptor
            WHERE (i.usuario_solicitante = ? OR i.usuario_receptor = ?)
              AND i.estado = 'aceptado'
            ORDER BY i.creado_en DESC
        ";

        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param("ii", $usuario_id, $usuario_id);
        $stmt->execute();
        $res = $stmt->get_result();

        $datos = [];
        while ($row = $res->fetch_assoc()) {
            $datos[] = $row;
        }

        return [
            "status" => "ok",
            "intercambios" => $datos
        ];
    }
}
