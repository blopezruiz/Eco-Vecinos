<?php

class Chat {

    private $conn;

    public function __construct($db) {
        $this->conn = $db;
    }

    /* ============================================================
       ENVIAR MENSAJE (privado o global)
       ============================================================ */
    public function enviarMensaje($de_id, $para_id, $mensaje) {

        $sql = "INSERT INTO chat (de_id, para_id, mensaje)
                VALUES (?, ?, ?)";

        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param("iis", $de_id, $para_id, $mensaje);
        $stmt->execute();

        return [
            "status" => "ok",
            "id" => $stmt->insert_id
        ];
    }

    /* ============================================================
       LISTAR CHAT PRIVADO ENTRE DOS USUARIOS
       ============================================================ */
    public function listarConversacion($usuario_id, $otro_id) {

        $sql = "
            SELECT *
            FROM chat
            WHERE (de_id = ? AND para_id = ?)
               OR (de_id = ? AND para_id = ?)
            ORDER BY id ASC
        ";

        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param("iiii", $usuario_id, $otro_id, $otro_id, $usuario_id);
        $stmt->execute();
        $res = $stmt->get_result();

        $mensajes = [];
        while ($row = $res->fetch_assoc()) {
            $mensajes[] = $row;
        }

        return [
            "status" => "ok",
            "mensajes" => $mensajes
        ];
    }

    /* ============================================================
       LISTAR CHAT GLOBAL (para_id = 0)
       ============================================================ */
    public function listarGlobal($limite = 50) {

        $sql = "
            SELECT c.*, u.nombre AS de_nombre
            FROM chat c
            JOIN usuarios u ON u.id = c.de_id
            WHERE c.para_id = 0
            ORDER BY c.id DESC
            LIMIT ?
        ";

        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param("i", $limite);
        $stmt->execute();
        $res = $stmt->get_result();

        $mensajes = [];
        while ($row = $res->fetch_assoc()) {
            $mensajes[] = $row;
        }

        return [
            "status" => "ok",
            "mensajes" => array_reverse($mensajes)
        ];
    }
}
