-- ============================================================
-- BASE DE DATOS
-- ============================================================
DROP DATABASE IF EXISTS eco_vecinos;
CREATE DATABASE eco_vecinos CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE eco_vecinos;

-- ============================================================
-- TABLA: usuarios
-- ============================================================
CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    puntos INT DEFAULT 0,
    barrio VARCHAR(100) NOT NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLA: alimentos
-- ============================================================
CREATE TABLE alimentos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    categoria VARCHAR(100) NOT NULL,
    fecha_caducidad DATE NOT NULL,
    imagen VARCHAR(255),
    ticket VARCHAR(255),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- ============================================================
-- TABLA: intercambios
-- ============================================================
CREATE TABLE intercambios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_solicitante INT NOT NULL,
    usuario_receptor INT NOT NULL,
    alimento_id INT NOT NULL,
    estado ENUM('pendiente','aceptado','rechazado') DEFAULT 'pendiente',
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_solicitante) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_receptor) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (alimento_id) REFERENCES alimentos(id) ON DELETE CASCADE
);

-- ============================================================
-- TABLA: chat
-- ============================================================
CREATE TABLE chat (
    id INT AUTO_INCREMENT PRIMARY KEY,
    de_id INT NOT NULL,
    para_id INT NOT NULL, -- 0 = chat global
    mensaje TEXT NOT NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (de_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Crear hases
-- php -r "echo password_hash('Test1234!', PASSWORD_DEFAULT), PHP_EOL;"

-- $2y$10$UzF4Aa16hPcR56TGkVVYn.gMtOFGBCjWuEShtmNmWrUTDbuyqFF1S

-- Test1234! Contraseña real

-- ============================================================
-- DATOS DE PRUEBA
-- ============================================================

-- Usuarios de prueba

INSERT INTO usuarios (nombre, email, password, puntos, barrio) VALUES
('Marta', 'marta@example.com', '$2y$10$UzF4Aa16hPcR56TGkVVYn.gMtOFGBCjWuEShtmNmWrUTDbuyqFF1S', 50, 'Centro'),
('Luis', 'luis@example.com', '$2y$10$UzF4Aa16hPcR56TGkVVYn.gMtOFGBCjWuEShtmNmWrUTDbuyqFF1S', 20, 'Norte'),
('Ana', 'ana@example.com', '$2y$10$UzF4Aa16hPcR56TGkVVYn.gMtOFGBCjWuEShtmNmWrUTDbuyqFF1S', 10, 'Sur');

-- Alimentos de prueba
INSERT INTO alimentos (usuario_id, nombre, categoria, fecha_caducidad, imagen, ticket)
VALUES
(1, 'Manzanas', 'Fruta', '2026-05-10', NULL, NULL),
(2, 'Pasta Integral', 'Cereales', '2026-06-01', NULL, NULL),
(3, 'Leche Entera', 'Lácteos', '2026-04-25', NULL, NULL);

-- Intercambios de prueba
INSERT INTO intercambios (usuario_solicitante, usuario_receptor, alimento_id, estado)
VALUES
(1, 2, 2, 'aceptado'),
(2, 3, 3, 'pendiente');

-- Chat global de prueba
INSERT INTO chat (de_id, para_id, mensaje)
VALUES
(1, 0, 'Hola vecinos!'),
(2, 0, 'Buenas tardes!'),
(3, 0, '¿Alguien necesita leche?');

-- Chat privado de prueba
INSERT INTO chat (de_id, para_id, mensaje)
VALUES
(1, 2, 'Hola Luis, ¿te interesa intercambiar?'),
(2, 1, 'Sí, claro. ¿Qué necesitas?');

GRANT ALL PRIVILEGES ON eco_vecinos.* TO 'eco_user'@'localhost';
FLUSH PRIVILEGES;