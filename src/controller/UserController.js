import multer from "multer";
import pool from "../database.js";
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';  // Importa jsonwebtoken como módulo
import dotenv from 'dotenv';     // Importa dotenv como módulo
dotenv.config();  // Cargar las variables de entorno desde el archivo .env

export const crearUsuario = async (req, res) => {
    const {
        correo,
        contraseña,
        nombres,
        apellidos,
        dni,
        estado_civil,
        rol_id,
        afiliador_id,
        clinica_id,
        Local_id,
        fechNac,
        telefono,
        fotoPerfil,
        direccion
    } = req.body;

    // Validaciones
    if (!correo || !contraseña) {
        return res.status(400).json({ message: 'El correo y la contraseña son obligatorios.' });
    }

    // Validar formato de correo
    const correoRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!correoRegex.test(correo)) {
        return res.status(400).json({ message: 'El correo no tiene un formato válido.' });
    }

    // Validar longitud de la contraseña
    if (contraseña.length < 6) {
        return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres.' });
    }

    // Validar nombres y apellidos
    if (!nombres || typeof nombres !== 'string' || nombres.length > 100) {
        return res.status(400).json({ message: 'Los nombres son obligatorios y deben ser un texto de hasta 100 caracteres.' });
    }

    if (!apellidos || typeof apellidos !== 'string' || apellidos.length > 100) {
        return res.status(400).json({ message: 'Los apellidos son obligatorios y deben ser un texto de hasta 100 caracteres.' });
    }

    // Validar DNI
    if (dni && (isNaN(dni) || dni.toString().length > 8)) {
        return res.status(400).json({ message: 'El DNI debe ser un número y no puede tener más de 8 dígitos.' });
    }

    // Validar estado civil
    const estadosCiviles = ['Soltero', 'Casado', 'Divorciado', 'Viudo', 'Separado'];
    if (estado_civil && !estadosCiviles.includes(estado_civil)) {
        return res.status(400).json({ message: 'Estado civil inválido.' });
    }

    // Validar rol_id
    if (rol_id && isNaN(rol_id)) {
        return res.status(400).json({ message: 'El rol_id debe ser un número.' });
    }

    // Validar afiliador_id
    if (afiliador_id && isNaN(afiliador_id)) {
        return res.status(400).json({ message: 'El afiliador_id debe ser un número.' });
    }

    try {
        // Validar que el afiliador tenga rol_id 3
        if (afiliador_id) {
            const [afiliadorResult] = await pool.query('SELECT rol_id FROM Usuarios WHERE id = ?', [afiliador_id]);

            if (afiliadorResult.length === 0) {
                return res.status(400).json({ success: false, message: 'El afiliador no existe.' });
            }

            const afiliadorRol = afiliadorResult[0].rol_id;

            if (afiliadorRol !== 3) {
                return res.status(400).json({ success: false, message: 'No puedes afiliar a otros hasta que pagues el nuevo plan.' });
            }
        }

        const query = `
            INSERT INTO Usuarios (correo, contraseña, nombres, apellidos, dni, estado_civil, rol_id, afiliador_id, clinica_id, Local_id, fechNac, telefono, fotoPerfil, direccion)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        const [result] = await pool.query(query, [correo, contraseña, nombres, apellidos, dni, estado_civil, rol_id, afiliador_id, clinica_id, Local_id, fechNac, telefono, fotoPerfil, direccion]);

        res.status(201).json({ success: true, message: 'Usuario creado con éxito', usuarioId: result.insertId });
    } catch (err) {
        console.error('Error al crear el usuario:', err);
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: 'El correo ya está en uso.' });
        }
        return res.status(500).json({ success: false, message: 'Error al crear el usuario.' });
    }
};

export const getUsuario = async (req, res) => {
    try {
        const query = `
            SELECT 
                u.id AS usuario_id, 
                u.correo, 
                u.nombres, 
                u.apellidos, 
                u.dni, 
                u.estado_civil, 
                u.rol_id, 
                u.afiliador_id,
                a.id AS afiliador_id,
                a.correo AS afiliador_correo,
                a.nombres AS afiliador_nombres,
                a.apellidos AS afiliador_apellidos,
                a.dni AS afiliador_dni,
                a.estado_civil AS afiliador_estado_civil,
                a.rol_id AS afiliador_rol_id
            FROM 
                Usuarios u
            LEFT JOIN 
                usuarios a ON u.afiliador_id = a.id
        `;

        const [result] = await pool.query(query);

        // Map to hold users and their affiliates
        const usersMap = {};

        result.forEach(user => {
            const {
                usuario_id,
                correo,
                contraseña,
                nombres,
                apellidos,
                dni,
                estado_civil,
                rol_id,
                afiliador_id,
                afiliador_correo,
                afiliador_nombres,
                afiliador_apellidos,
                afiliador_dni,
                afiliador_estado_civil,
                afiliador_rol_id
            } = user;

            // Si el usuario no tiene afiliador, lo agregamos directamente
            if (!afiliador_id) {
                if (!usersMap[usuario_id]) {
                    usersMap[usuario_id] = {
                        id: usuario_id,
                        correo,
                        contraseña,
                        nombres,
                        apellidos,
                        dni,
                        estado_civil,
                        rol_id,
                        afiliados: [] // Inicializa el array de afiliados
                    };
                }
            } else {
                // Si el afiliador ya existe en el mapa, solo agregamos el afiliado
                if (!usersMap[afiliador_id]) {
                    usersMap[afiliador_id] = {
                        id: afiliador_id,
                        correo: afiliador_correo,
                        nombres: afiliador_nombres,
                        apellidos: afiliador_apellidos,
                        dni: afiliador_dni,
                        estado_civil: afiliador_estado_civil,
                        rol_id: afiliador_rol_id,
                        afiliados: [] // Inicializa el array de afiliados
                    };
                }

                // Agrega el afiliado a la lista de afiliados del afiliador
                usersMap[afiliador_id].afiliados.push({
                    id: usuario_id,
                    correo,
                    nombres,
                    apellidos,
                    dni,
                    estado_civil,
                    rol_id
                });
            }
        });

        // Convertimos el usersMap en un array para la respuesta
        const response = Object.values(usersMap);

        res.status(200).json(response);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: error.message });
    }
};

export const getUsuariosId = async (req, res) => {
    const query = 'SELECT * FROM Usuarios';

    try {
        const [results] = await pool.query(query);
        res.status(200).json(results);
    } catch (err) {
        console.error('Error al obtener los usuarios:', err);
        res.status(500).json({ message: 'Error al obtener los usuarios' });
    }
};

export const getUsuarioDatosId = async (req, res) => {
    const { id } = req.params; // Obtener el ID del usuario desde los parámetros de la URL
    const query = 'SELECT id, correo, nombres, apellidos, dni, estado_civil, rol_id, afiliador_id FROM Usuarios WHERE id = ?';

    try {
        const [results] = await pool.query(query, [id]); // Ejecutar la consulta con el ID proporcionado

        if (results.length === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        res.status(200).json(results[0]); // Devolver el primer resultado
    } catch (err) {
        console.error('Error al obtener el usuario:', err);
        res.status(500).json({ message: 'Error al obtener el usuario' });
    }
};

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Carpeta donde se guardarán las imágenes
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`); // Nombre único
    }
});

export const upload = multer({ storage: storage });

export const FotoPerfil = async (req, res) => {
    try {
        const Id = req.params.id;
        const newImagePath = req.file.filename; // Obtener el nuevo nombre del archivo

        // Obtener la ruta de la imagen actual
        const queryGetImage = 'SELECT fotoPerfil FROM Usuarios WHERE Id = ?';
        const [rows] = await pool.query(queryGetImage, [Id]);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        const currentImagePath = rows[0].fotoPerfil;

        // Eliminar la imagen anterior si existe
        if (currentImagePath) {
            const fullPath = path.join('uploads', currentImagePath);
            if (fs.existsSync(fullPath)) {
                fs.unlinkSync(fullPath); // Eliminar el archivo
            }
        }

        // Actualizar la ruta de la imagen en la base de datos
        const queryUpdateImage = 'UPDATE Usuarios SET fotoPerfil = ? WHERE Id = ?';
        const [result] = await pool.query(queryUpdateImage, [newImagePath, Id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        res.status(201).json({ fotoPerfil: newImagePath, message: 'Éxito' });
    } catch (err) {
        console.error("Error actualizando la imagen de perfil:", err);
        res.status(500).send("Error al actualizar la imagen de perfil");
    }
};

export const editUsuarioId = async (req, res) => {
    const userId = req.params.id;
    const {
        correo,
        contraseña,
        nombres,
        apellidos,
        dni,
        estado_civil,
        rol_id,
        afiliador_id,
        clinica_id,
        fechNac,
        telefono,
        direccion
    } = req.body;

    // Validaciones
    if (!correo || !contraseña) {
        return res.status(400).json({ message: 'El correo y la contraseña son obligatorios.' });
    }

    // Validar formato de correo
    const correoRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!correoRegex.test(correo)) {
        return res.status(400).json({ message: 'El correo no tiene un formato válido.' });
    }

    // Validar longitud de la contraseña
    if (contraseña.length < 6) {
        return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres.' });
    }

    // Validar nombres y apellidos
    if (!nombres || typeof nombres !== 'string' || nombres.length > 100) {
        return res.status(400).json({ message: 'Los nombres son obligatorios y deben ser un texto de hasta 100 caracteres.' });
    }

    if (!apellidos || typeof apellidos !== 'string' || apellidos.length > 100) {
        return res.status(400).json({ message: 'Los apellidos son obligatorios y deben ser un texto de hasta 100 caracteres.' });
    }

    // Validar DNI
    if (dni && (isNaN(dni) || dni.toString().length > 8)) {
        return res.status(400).json({ message: 'El DNI debe ser un número y no puede tener más de 8 dígitos.' });
    }

    // Validar estado civil
    const estadosCiviles = ['Soltero', 'Casado', 'Divorciado', 'Viudo', 'Separado'];
    if (estado_civil && !estadosCiviles.includes(estado_civil)) {
        return res.status(400).json({ message: 'Estado civil inválido.' });
    }

    // Validar rol_id
    if (rol_id && isNaN(rol_id)) {
        return res.status(400).json({ message: 'El rol_id debe ser un número.' });
    }

    // Validar afiliador_id
    if (afiliador_id && isNaN(afiliador_id)) {
        return res.status(400).json({ message: 'El afiliador_id debe ser un número.' });
    }

    try {
        // Validar que el afiliador tenga rol_id 3
        if (afiliador_id) {
            const afiliadorQuery = 'SELECT rol_id FROM Usuarios WHERE id = ?';
            const [afiliadorResult] = await pool.query(afiliadorQuery, [afiliador_id]);

            if (afiliadorResult.length === 0) {
                return res.status(400).json({ message: 'El afiliador no existe.' });
            }

            const afiliadorRol = afiliadorResult[0].rol_id;

            if (afiliadorRol !== 3) {
                return res.status(400).json({ message: 'No puedes afiliar a otros hasta que pagues el nuevo plan.' });
            }
        }

        const sql = `UPDATE Usuarios SET 
            correo = ?, 
            contraseña = ?, 
            nombres = ?, 
            apellidos = ?, 
            dni = ?, 
            estado_civil = ?, 
            rol_id = ?, 
            afiliador_id = ?,
            clinica_id = ?, 
            fechNac = ?, 
            telefono = ?, 
            direccion = ?
            WHERE id = ?`;

        // Nota el cambio en el orden de los parámetros aquí
        const [result] = await pool.query(sql, [
            correo,
            contraseña,
            nombres,
            apellidos,
            dni,
            estado_civil,
            rol_id,
            afiliador_id,
            clinica_id,
            fechNac,
            telefono,
            direccion,
            userId // userId debe ser el último
        ]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        res.json({ message: 'Usuario actualizado exitosamente' });
    } catch (err) {
        console.error('Error al actualizar el usuario:', err);
        return res.status(500).json({ message: 'Error al actualizar el usuario' });
    }
};

export const deleteUsuario = async (req, res) => {
    const { id } = req.params;

    try {
        const [result] = await pool.query('DELETE FROM Usuarios WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado para eliminar' });
        }

        res.status(200).json({ message: 'Usuario eliminado con id:', id });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
function generateAccessToken(payload) {
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '6h' });
}

function generateRefreshToken(payload) {
    return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: '12h' });
}

export const loginUsuario = async (req, res) => {
    const { correo, contraseña } = req.body;

    if (!correo || !contraseña) {
        return res.status(400).json({ message: 'Correo y contraseña son requeridos' });
    }

    try {
        // Buscar el usuario por correo y obtener sus datos, junto con las vistas asociadas a su rol
        const [rows] = await pool.query(`
            SELECT 
                u.id AS usuarioId, 
                u.correo, 
                u.contraseña, 
                u.nombres, 
                u.apellidos, 
                u.fotoPerfil, 
                u.clinica_id, 
                r.nombre AS rol,
                v.id AS vistaId, 
                v.nombre AS vistaNombre, 
                v.logo, 
                v.ruta
            FROM 
                Usuarios u
            LEFT JOIN 
                Roles r ON u.rol_id = r.id
            LEFT JOIN 
                Vistas v ON r.id = v.rol_id
            WHERE 
                u.correo = ?;
        `, [correo]);

        if (rows.length === 0) {
            return res.status(401).json({ message: 'Correo o contraseña incorrectos' });
        }

        const usuario = rows[0];

        // Comparar la contraseña proporcionada con la almacenada
        if (contraseña !== usuario.contraseña) {
            return res.status(401).json({ message: 'Correo o contraseña incorrectos' });
        }

        // Agrupar las vistas en un array de objetos
        const vistas = rows.map(row => ({
            id: row.vistaId,
            nombre: row.vistaNombre,
            logo: row.logo,
            ruta: row.ruta
        }));

        // Crear el payload del token con información relevante del usuario
        const tokenPayload = {
            id: usuario.usuarioId,
            correo: usuario.correo,
            nombres: usuario.nombres,
            apellidos: usuario.apellidos,
            rol: usuario.rol,
            ...(usuario.clinica_id ? { clinica_id: usuario.clinica_id } : {})
        };

        // Generar el token (expiración de 1 hora, puedes modificar el tiempo si lo deseas)
        const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '12h' });

        // Guarda el Refresh Token en una cookie
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'None',
            maxAge: 5 * 60 * 1000
        });
        // Enviar el Access Token en una cookie HttpOnly
        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // Solo en producción, usar https
            sameSite: 'None'  ,
            maxAge: 60 * 1000 // 1 minuto

        });

        // Responder con éxito, incluyendo los datos del usuario, sus vistas y el access token generado
        return res.status(200).json({
            success: true,
            usuario: {
                id: usuario.usuarioId,
                correo: usuario.correo,
                nombres: usuario.nombres,
                apellidos: usuario.apellidos,
                fotoPerfil: usuario.fotoPerfil,
                rol: usuario.rol,
                ...(usuario.clinica_id ? { clinica_id: usuario.clinica_id } : {}),
                vistas: vistas
            },
            token: token,  // Incluir el token en la respuesta
            message: 'Bienvenido'
        });

    } catch (error) {
        console.error('Error del servidor:', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
};
export const verificarToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(403).json({ message: 'Token no proporcionado o formato incorrecto' });
    }

    const token = authHeader.split(' ')[1]; // Extraer el token después de 'Bearer'

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({ message: 'Token inválido o expirado',err });
        }
        req.usuario = decoded; // Almacenar la información del usuario en req para usarla en las siguientes rutas
        next();
    });
};
export const postRol = async (req, res) => {
    try {
        const { nombre } = req.body;

        // Validate required field
        if (!nombre || typeof nombre !== 'string' || nombre.trim().length === 0) {
            return res.status(400).json({ error: 'El campo "nombre" es requerido y debe ser una cadena válida.' });
        }

        // Optional: Validate length
        if (nombre.length > 50) {
            return res.status(400).json({ error: 'El campo "nombre" no puede exceder los 50 caracteres.' });
        }

        // Insert data into the database
        const sql = 'INSERT INTO Roles (nombre) VALUES (?)';
        const [results] = await pool.query(sql, [nombre]);

        res.status(201).json({ id: results.insertId, message: 'Rol creado exitosamente' });
    } catch (error) {
        console.error('Error inserting data:', error);
        return res.status(500).json({ error: 'Error inserting data' });
    }
};

export const getUsuarioById = async (req, res) => {
    const userId = req.params.id;

    try {
        const query = `
            SELECT 
                u.id AS usuario_id, 
                u.nombres, 
                u.apellidos, 
                u.dni, 
                u.telefono,
                u.rol_id,
                r.nombre AS rol_nombre,
                a.id AS afiliador_id,
                af.id AS afiliado_id,
                af.nombres AS afiliado_nombres,
                af.apellidos AS afiliado_apellidos,
                af.dni AS afiliado_dni,
                af.telefono AS afiliado_telefono,
                af.rol_id AS afiliado_rol_id,
                r2.nombre AS afiliado_rol_nombre,
                af2.id AS afiliado_nivel_2_id,
                af2.nombres AS afiliado_nivel_2_nombres,
                af2.apellidos AS afiliado_nivel_2_apellidos,
                af2.dni AS afiliado_nivel_2_dni,
                af2.telefono AS afiliado_nivel_2_telefono,
                af2.rol_id AS afiliado_nivel_2_rol_id,
                r3.nombre AS afiliado_nivel_2_rol_nombre,
                af3.id AS afiliado_nivel_3_id,
                af3.nombres AS afiliado_nivel_3_nombres,
                af3.apellidos AS afiliado_nivel_3_apellidos,
                af3.dni AS afiliado_nivel_3_dni,
                af3.telefono AS afiliado_nivel_3_telefono,
                af3.rol_id AS afiliado_nivel_3_rol_id,
                r4.nombre AS afiliado_nivel_3_rol_nombre
            FROM 
                Usuarios u
            LEFT JOIN 
                Roles r ON u.rol_id = r.id
            LEFT JOIN 
                Usuarios a ON u.afiliador_id = a.id
            LEFT JOIN 
                Usuarios af ON af.afiliador_id = u.id
            LEFT JOIN 
                Roles r2 ON af.rol_id = r2.id
            LEFT JOIN 
                Usuarios af2 ON af2.afiliador_id = af.id
            LEFT JOIN 
                Roles r3 ON af2.rol_id = r3.id
            LEFT JOIN 
                Usuarios af3 ON af3.afiliador_id = af2.id
            LEFT JOIN 
                Roles r4 ON af3.rol_id = r4.id
            WHERE 
                u.id = ?

        `;

        const [result] = await pool.query(query, [userId]);

        if (result.length === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        const user = result[0];

        const response = {
            children: []
        };

        const uniqueIds = new Set(); // To track unique user IDs

        result.forEach(item => {
            // Check if the user is already in the response
            if (!uniqueIds.has(item.afiliado_id)) {
                uniqueIds.add(item.afiliado_id);

                const afiliado = {
                    id: item.afiliado_id,
                    nombres: item.afiliado_nombres,
                    apellidos: item.afiliado_apellidos,
                    dni: item.afiliado_dni,
                    telefono: item.afiliado_telefono,
                    rol: item.afiliado_rol_nombre,
                    children: []
                };

                // Now we populate the children for this afiliado
                result.forEach(af2 => {
                    if (af2.afiliado_id === item.afiliado_id && af2.afiliado_nivel_2_id) {
                        const nivel2 = {
                            id: af2.afiliado_nivel_2_id,
                            nombres: af2.afiliado_nivel_2_nombres,
                            apellidos: af2.afiliado_nivel_2_apellidos,
                            dni: af2.afiliado_nivel_2_dni,
                            telefono: af2.afiliado_nivel_2_telefono,
                            rol: af2.afiliado_nivel_2_rol_nombre,
                            children: []
                        };

                        // Populate the children for nivel 2
                        result.forEach(af3 => {
                            if (af3.afiliado_id === af2.afiliado_id && af3.afiliado_nivel_3_id) {
                                nivel2.children.push({
                                    id: af3.afiliado_nivel_3_id,
                                    nombres: af3.afiliado_nivel_3_nombres,
                                    apellidos: af3.afiliado_nivel_3_apellidos,
                                    dni: af3.afiliado_nivel_3_dni,
                                    telefono: af3.afiliado_nivel_3_telefono,
                                    rol: af3.afiliado_nivel_3_rol_nombre
                                });
                            }
                        });

                        afiliado.children.push(nivel2);
                    }
                });

                response.children.push(afiliado);
            }
        });

        res.status(200).json(response.children);

    } catch (error) {
        console.error('Error fetching user and affiliates:', error);
        res.status(500).json({ message: error.message });
    }
};
export const logoutUsuario= async (req, res) => {
    try {
        // Eliminar las cookies de acceso y refresco
        res.clearCookie('accessToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Strict'
        });
        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Strict'
        });

        // Responder con éxito
        return res.status(200).json({ message: 'Logout exitoso' });
    } catch (error) {
        console.error('Error al hacer logout:', error);
        res.status(500).json({ message: 'Error del servidor' });
    }


}
export const getAfiliadosPorUsuarioId = async (req, res) => {
    const userId = req.params.id;
    const {
        rol_id,
        codigo
    } = req.body;

    try {
        if (rol_id === undefined && codigo === undefined) {
            return res.status(400).json({ message: 'Se requiere al menos rol_id o codigo para actualizar.' });
        }
        const sql = `UPDATE Usuarios SET rol_id = ?, codigo =? WHERE id = ?`;
        const [result] = await pool.query(sql, [
            rol_id,
            codigo,
            userId
        ]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }
        res.json({ message: 'Usuario actualizado exitosamente' });
    } catch (err) {
        console.error('Error al actualizar el usuario:', err);
        return res.status(500).json({ message: 'Error al actualizar el usuario' });
    }
};


export const GetAfiliadorAfiliadores = async (req, res) => {
    try {
        // Consulta a la base de datos para obtener los usuarios con rol_id 3 (Afiliador) y 4 (Afiliado)
        const [usuarios] = await pool.query(
            `SELECT u.id, u.correo, u.fotoPerfil, u.nombres, u.apellidos, u.dni, u.telefono, r.nombre AS rol
             FROM Usuarios u
             LEFT JOIN Roles r ON u.rol_id = r.id
             WHERE u.rol_id IN (3, 4)`)
        // Responder con los usuarios encontrados
        return res.status(200).json(usuarios);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error al obtener los usuarios' });
    }
};
export const refreshToken = async (req, res) => {
    const { refreshToken } = req.cookies;

    if (!refreshToken) {
        return false;  // Si no hay refresh token, no podemos renovar
    }

    try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        const newAccessToken = generateAccessToken({ id: decoded.id, correo: decoded.correo });

        // Si los encabezados ya fueron enviados, no hacemos nada más
        if (res.headersSent) {
            return false;
        }

        res.cookie('accessToken', newAccessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // Solo en producción, usar https
            sameSite: 'None',
            maxAge: 60 * 1000, // 1 minuto
        });

        // Retornar un valor para indicar que el token fue renovado
        return true;
    } catch (err) {
        // Si ocurre un error al verificar el refreshToken, no renovar el accessToken
        return false;
    }
};
export const me = async (req, res) => {
    const user = req.usuario; // Los datos del usuario decodificados desde el JWT
    // Retornar los datos del usuario
    try {
        // Consultar la base de datos para obtener la información del usuario
        const [rows] = await pool.query(`
            SELECT 
                u.id AS usuarioId, 
                u.correo, 
                u.nombres, 
                u.apellidos, 
                u.fotoPerfil, 
                u.clinica_id, 
                r.nombre AS rol,
                v.id AS vistaId, 
                v.nombre AS vistaNombre, 
                v.logo, 
                v.ruta
            FROM 
                Usuarios u
            LEFT JOIN 
                Roles r ON u.rol_id = r.id
            LEFT JOIN 
                Vistas v ON r.id = v.rol_id
            WHERE 
                u.id = ?;
        `, [user?.id]);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        // Extraer la información del usuario
        const usuario = rows[0];

        // Agrupar las vistas en un array
        const vistas = rows.map(row => ({
            id: row.vistaId,
            nombre: row.vistaNombre,
            logo: row.logo,
            ruta: row.ruta
        }));

        // Devolver los datos del usuario y las vistas
        res.status(200).json({
            id: usuario.usuarioId,
            correo: usuario.correo,
            nombres: usuario.nombres,
            apellidos: usuario.apellidos,
            fotoPerfil: usuario.fotoPerfil,
            rol: usuario.rol,
            clinica_id: usuario.clinica_id || null, // Si no tiene clínica, poner null
            vistas: vistas // Devolver las vistas
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al obtener los datos del usuario' });
    }
    // res.status(200).json({

    //    id:user.id,
    //     correo: user.correo,
    //     nombre: user.nombres,

    // });
}














//opcional
// import fs from 'fs';
// import path from 'path';

// // Configuración de multer para subir imágenes
// const storage = multer.diskStorage({
//     destination: (req, file, cb) => {
//         cb(null, 'uploads/');  // Carpeta donde se guardarán las imágenes
//     },
//     filename: (req, file, cb) => {
//         cb(null, `${Date.now()}-${file.originalname}`);  // Guardar la imagen con nombre único
//     }
// });

// export const upload = multer({ storage: storage });

// export const FotoPerfil = async (req, res) => {
//     try {
//         const Id = req.params.id;

//         // Obtener la foto actual del usuario
//         const queryCurrentPhoto = 'SELECT fotoPerfil FROM Usuarios WHERE Id = ?';
//         const [currentPhotoResult] = await pool.query(queryCurrentPhoto, [Id]);

//         if (currentPhotoResult.length === 0) {
//             return res.status(404).json({ message: 'Usuario no encontrado' });
//         }

//         const currentPhotoPath = currentPhotoResult[0].fotoPerfil;

//         // Eliminar la foto anterior del sistema de archivos
//         if (currentPhotoPath) {
//             const filePath = path.join(__dirname, 'uploads', currentPhotoPath);
//             fs.unlink(filePath, (err) => {
//                 if (err) {
//                     console.error("Error eliminando la foto anterior:", err);
//                     // Continuar con la actualización aunque no se pueda eliminar la foto
//                 }
//             });
//         }

//         // Obtener el nombre del nuevo archivo guardado
//         const newImagePath = req.file.filename;

//         // Actualizar la ruta de la nueva imagen en la base de datos
//         const queryUpdatePhoto = 'UPDATE Usuarios SET fotoPerfil = ? WHERE Id = ?';
//         const [updateResult] = await pool.query(queryUpdatePhoto, [newImagePath, Id]);

//         res.status(201).json({ fotoPerfil: newImagePath, message: 'Éxito' });
//     } catch (err) {
//         console.error("Error actualizando la imagen de perfil:", err);
//         res.status(500).send("Error al actualizar la imagen de perfil");
//     }
// };

export const crearUsuarioCode = async (req, res) => {
    const {
        correo,
        contraseña,
        nombres,
        apellidos,
        dni,
        estado_civil,
        rol_id,
        fechNac,
        telefono,
        direccion,
        codigo2        // Nuevo campo codigo2
    } = req.body;

    // Validaciones
    if (!correo || !contraseña) {
        return res.status(400).json({ message: 'El correo y la contraseña son obligatorios.' });
    }

    // Validar formato de correo
    const correoRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!correoRegex.test(correo)) {
        return res.status(400).json({ message: 'El correo no tiene un formato válido.' });
    }

    // Validar longitud de la contraseña
    if (contraseña.length < 6) {
        return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres.' });
    }

    // Validar nombres y apellidos
    if (!nombres || typeof nombres !== 'string' || nombres.length > 100) {
        return res.status(400).json({ message: 'Los nombres son obligatorios y deben ser un texto de hasta 100 caracteres.' });
    }

    if (!apellidos || typeof apellidos !== 'string' || apellidos.length > 100) {
        return res.status(400).json({ message: 'Los apellidos son obligatorios y deben ser un texto de hasta 100 caracteres.' });
    }

    // Validar DNI
    if (dni && (isNaN(dni) || dni.toString().length > 8)) {
        return res.status(400).json({ message: 'El DNI debe ser un número y no puede tener más de 8 dígitos.' });
    }

    // Validar estado civil
    const estadosCiviles = ['Soltero', 'Casado', 'Divorciado', 'Viudo', 'Separado'];
    if (estado_civil && !estadosCiviles.includes(estado_civil)) {
        return res.status(400).json({ message: 'Estado civil inválido.' });
    }

    // Validar rol_id
    if (rol_id && isNaN(rol_id)) {
        return res.status(400).json({ message: 'El rol_id debe ser un número.' });
    }

    // Verificación para el código2 del afiliador
    let afiliador_id = null;

    if (codigo2) {
        try {
            // Buscar si existe un usuario con el mismo código y rol_id = 3 (afiliador)
            const [afiliadorResult] = await pool.query(
                'SELECT id FROM Usuarios WHERE codigo = ? AND rol_id = 3',
                [codigo2]
            );

            if (afiliadorResult.length > 0) {
                // Si encontramos un afiliador con ese código2, asignamos su id al campo afiliador_id
                afiliador_id = afiliadorResult[0].id;
            } else {
                console.log('No se encontró un afiliador con el código2 proporcionado.');
            }
        } catch (err) {
            console.error('Error al verificar el código2 de afiliador:', err);
            return res.status(500).json({ success: false, message: 'Error al verificar el código2 del afiliador.' });
        }
    }

    try {
        // Query para insertar el nuevo usuario
        const query = `
            INSERT INTO Usuarios (correo, contraseña, nombres, apellidos, dni, estado_civil, rol_id, afiliador_id, fechNac, telefono, direccion, codigo2)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        // Ejecutar la consulta de inserción
        const [result] = await pool.query(query, [
            correo, contraseña, nombres, apellidos, dni, estado_civil, rol_id,
            afiliador_id, fechNac, telefono, direccion, codigo2
        ]);

        res.status(201).json({ success: true, message: 'Usuario creado con éxito', usuarioId: result.insertId, result });
    } catch (err) {
        console.error('Error al crear el usuario:', err);
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: 'El correo ya está en uso.' });
        }
        return res.status(500).json({ success: false, message: 'Error al crear el usuario.' });
    }
};


