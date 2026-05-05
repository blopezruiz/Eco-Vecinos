<?php
class Usuarios {
    private $conn;

    public function __construct($conn) {
        $this->conn = $conn;
    }

    public function buscarPorEmail($email) {
        $stmt = $this->conn->prepare(
            "SELECT id, nombre, email, password, puntos, barrio FROM usuarios WHERE email = ? LIMIT 1"
        );
        $stmt->bind_param('s', $email);
        $stmt->execute();
        return $stmt->get_result()->fetch_assoc();
    }

    public function crear($nombre, $email, $hash, $barrio = 'Sin barrio') {
        $stmt = $this->conn->prepare(
            "INSERT INTO usuarios (nombre, email, password, barrio) VALUES (?, ?, ?, ?)"
        );
        $stmt->bind_param('ssss', $nombre, $email, $hash, $barrio);
        $stmt->execute();
        $id = $this->conn->insert_id;

        return [
            'id'     => $id,
            'nombre' => $nombre,
            'email'  => $email,
        ];
    }

    public function obtenerRanking($limite = 20) {
        $sql = "SELECT id, nombre, puntos
                FROM usuarios
                ORDER BY puntos DESC
                LIMIT ?";
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param('i', $limite);
        $stmt->execute();
        return $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    }
}