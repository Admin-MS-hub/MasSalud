import multer from "multer";
import pool from "../database.js";
import jwt from 'jsonwebtoken';
import axios from "axios";

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
        // **Validar que el DNI ya esté registrado**
        const [dniExistente] = await pool.query('SELECT * FROM Usuarios WHERE dni = ?', [dni]);
        
        if (dniExistente.length > 0) {
            return res.status(400).json({ message: 'El DNI ya está registrado.' });
        }

        // // Validar que el afiliador tenga rol_id 3
        // if (afiliador_id) {
        //     const [afiliadorResult] = await pool.query('SELECT rol_id FROM Usuarios WHERE id = ?', [afiliador_id]);

        //     if (afiliadorResult.length === 0) {
        //         return res.status(400).json({ success: false, message: 'El afiliador no existe.' });
        //     }

        //     const afiliadorRol = afiliadorResult[0].rol_id;

        //     if (afiliadorRol !== 3) {
        //         return res.status(400).json({ success: false, message: 'No puedes afiliar a otros hasta que pagues el nuevo plan.' });
        //     }
        // }

        // Consulta para insertar el nuevo usuario
        const query = `
            INSERT INTO Usuarios (correo, contraseña, nombres, apellidos, dni, estado_civil, rol_id, afiliador_id, clinica_id, Local_id, fechNac, telefono, fotoPerfil, direccion)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        const [result] = await pool.query(query, [correo, contraseña, nombres, apellidos, dni, estado_civil, rol_id, afiliador_id, clinica_id, Local_id, fechNac, telefono, fotoPerfil, direccion]);

        // Responder con éxito
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
        cb(null, 'uploads/');  // Carpeta donde se guardarán las imágenes
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);  // Guardar la imagen con nombre único
    }
});

export const upload = multer({ storage: storage });

export const FotoPerfil = async (req, res) => {
    try {
        const Id = req.params.id;
        const imagePath = req.file.filename;  // Obtener el nombre del archivo guardado

        // Actualizar la ruta de la imagen en la base de datos
        const query = 'UPDATE Usuarios SET fotoPerfil = ? WHERE Id = ?';
        const [result] = await pool.query(query, [imagePath, Id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        res.status(201).json({ fotoPerfil: imagePath, message: 'Éxito' });
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
        clinica_id,
        fechNac,
        telefono,
        direccion,
        Local_id
    } = req.body;

    // Validar formato de correo
    const correoRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!correoRegex.test(correo)) {
        return res.status(400).json({ message: 'El correo no tiene un formato válido.' });
    }

    // Validar longitud de la contraseña si se proporciona
    if (contraseña && contraseña.length < 6) {
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

    // Validar Local_id
    if (Local_id && isNaN(Local_id)) {
        return res.status(400).json({ message: 'El Local_id debe ser un número válido.' });
    }

    // Validar teléfono
    if (telefono && (isNaN(telefono) || telefono.toString().length < 7 || telefono.toString().length > 15)) {
        return res.status(400).json({ message: 'El teléfono debe ser un número válido entre 7 y 15 dígitos.' });
    }

    try {
        // Si no se envía una nueva contraseña, se recupera la contraseña actual
        let updatePassword = contraseña;

        if (!contraseña) {
            // Obtener la contraseña actual del usuario
            const [userResult] = await pool.query('SELECT contraseña FROM Usuarios WHERE id = ?', [userId]);
            if (userResult.length === 0) {
                return res.status(404).json({ message: 'Usuario no encontrado' });
            }
            // Asignar la contraseña actual en caso de que no se haya proporcionado una nueva
            updatePassword = userResult[0].contraseña;
        } else {
            // Aquí puedes agregar la lógica de encriptación de la contraseña si es necesario
            // Ejemplo: updatePassword = bcrypt.hashSync(contraseña, 10);
        }

        const sql = `UPDATE Usuarios SET 
            correo = ?, 
            contraseña = ?, 
            nombres = ?, 
            apellidos = ?, 
            dni = ?, 
            estado_civil = ?, 
            rol_id = ?, 
            clinica_id = ?, 
            fechNac = ?, 
            telefono = ?, 
            direccion = ?,
            Local_id = ?
            WHERE id = ?`;

        const [result] = await pool.query(sql, [
            correo,
            updatePassword, // Usamos la contraseña actual o la nueva, dependiendo de si se envió
            nombres,
            apellidos,
            dni,
            estado_civil,
            rol_id,
            clinica_id,
            fechNac,
            telefono,
            direccion,
            Local_id,
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
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
}

function generateRefreshToken(payload) {
    return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: '5h' });
}

export const loginUsuario = async (req, res) => {
    const { dni, contraseña } = req.body; // Ahora se recibe el DNI en lugar de correo

    if (!dni || !contraseña) {
        return res.status(400).json({ message: 'DNI y contraseña son requeridos' });
    }

    try {
        // Buscar el usuario por DNI y obtener sus datos, junto con las vistas asociadas a su rol
        const [rows] = await pool.query(`
            SELECT 
                u.id AS usuarioId, 
                u.dni,
                u.correo,         -- Agregado correo en la consulta
                u.contraseña, 
                u.nombres, 
                u.apellidos, 
                u.fotoPerfil, 
                u.clinica_id, 
                u.Estado,
                u.EstadoPr,
                u.codigo,
                u.direccion,
                u.telefono,
                u.rol_id,
                u.estado_solicitud,
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
                u.dni = ?;
        `, [dni]);

        if (rows.length === 0) {
            return res.status(401).json({ message: 'DNI o contraseña incorrectos' });
        }

        const usuario = rows[0];

        // Comparar la contraseña proporcionada con la almacenada
        if (contraseña !== usuario.contraseña) {
            return res.status(401).json({ message: 'DNI o contraseña incorrectos' });
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
            dni: usuario.dni,  // Incluyendo el DNI en el token
            correo: usuario.correo,  // Incluyendo el correo en el token
            nombres: usuario.nombres,
            apellidos: usuario.apellidos,
            estado: usuario.Estado,  // Incluyendo el estado
            estadoPr: usuario.EstadoPr,
            codigo: usuario.codigo,  // Incluyendo el código
            rol: usuario.rol,
            ...(usuario.clinica_id ? { clinica_id: usuario.clinica_id } : {})
        };

        // Generar Access Token y Refresh Token
        const accessToken = generateAccessToken(tokenPayload);
        const refreshToken = generateRefreshToken(tokenPayload);

        // Configuración para el refreshToken (5 horas)
            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 5 * 60 * 60 * 1000, // 5 horas
                sameSite: 'None',
            });
            
            // Configuración para el accessToken (1 hora)
            res.cookie('accessToken', accessToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 5 * 60 * 60 * 1000, // 1 hora
                sameSite: 'None',
            });

        // Responder con éxito, incluyendo los datos del usuario, sus vistas y el access token generado
        return res.status(200).json({
            success: true,
            usuario: {
                id: usuario.usuarioId,
                dni: usuario.dni,  // Incluyendo el DNI en la respuesta
                correo: usuario.correo,  // Incluyendo el correo en la respuesta
                nombres: usuario.nombres,
                apellidos: usuario.apellidos,
                fotoPerfil: usuario.fotoPerfil,
                estado: usuario.Estado,  // Incluyendo el estado
                estadoPr: usuario.EstadoPr,
                codigo: usuario.codigo,  // Incluyendo el código
                rol: usuario.rol,
                estado_solicitud:usuario.estado_solicitud,
                rol_id: usuario.rol_id, // Agregado rol_id
                direccion: usuario.direccion, // Agregado direccion
                telefono: usuario.telefono, // Agregado telefono
                ...(usuario.clinica_id ? { clinica_id: usuario.clinica_id } : {}),
                vistas: vistas
            },
            token: accessToken,  // Enviar el accessToken en la respuesta
            message: 'Bienvenido'
        });

    } catch (error) {
        console.error('Error del servidor:', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
};

export const verificarToken = async (req, res, next) => {
    const { accessToken } = req.cookies;  // Obtenemos el accessToken desde las cookies

    if (!accessToken) {
        // Si no hay accessToken, intentamos renovar el token
        const tokenRenovado = await refreshToken(req, res);  // Llamamos a refreshToken asincrónicamente

        if (!tokenRenovado) {
            return res.status(401).json({ message: 'No autorizado, no se pudo renovar el token' });
        }

        // Si el token se renovó correctamente, procedemos al siguiente middleware
        return next();  // Añadimos "return" para evitar que se ejecute código posterior
    } else {
        // Si hay un accessToken, verificamos su validez
        jwt.verify(accessToken, process.env.JWT_SECRET, (err, decoded) => {
            if (err) {
                return res.status(401).json({ message: 'Token inválido o expirado', error: err.message });
            }

            // Si el token es válido, guardamos la información del usuario decodificada en req.usuario
            req.usuario = decoded;  // Guardamos los datos del usuario decodificados
            console.log("Usuario verificado:", req.usuario);

            // Continuamos con el siguiente middleware o ruta
            return next();  // Añadimos "return" aquí para evitar que se ejecute código posterior
        });
    }
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
                u.fecha_inscripcion AS usuario_fecha_inscripcion,
                a.id AS afiliador_id,
                af.id AS afiliado_id,
                af.nombres AS afiliado_nombres,
                af.apellidos AS afiliado_apellidos,
                af.dni AS afiliado_dni,
                af.telefono AS afiliado_telefono,
                af.rol_id AS afiliado_rol_id,
                r2.nombre AS afiliado_rol_nombre,
                af.fecha_inscripcion AS afiliado_fecha_inscripcion,
                af2.id AS afiliado_nivel_2_id,
                af2.nombres AS afiliado_nivel_2_nombres,
                af2.apellidos AS afiliado_nivel_2_apellidos,
                af2.dni AS afiliado_nivel_2_dni,
                af2.telefono AS afiliado_nivel_2_telefono,
                af2.rol_id AS afiliado_nivel_2_rol_id,
                r3.nombre AS afiliado_nivel_2_rol_nombre,
                af2.fecha_inscripcion AS afiliado_nivel_2_fecha_inscripcion,
                af3.id AS afiliado_nivel_3_id,
                af3.nombres AS afiliado_nivel_3_nombres,
                af3.apellidos AS afiliado_nivel_3_apellidos,
                af3.dni AS afiliado_nivel_3_dni,
                af3.telefono AS afiliado_nivel_3_telefono,
                af3.rol_id AS afiliado_nivel_3_rol_id,
                r4.nombre AS afiliado_nivel_3_rol_nombre,
                af3.fecha_inscripcion AS afiliado_nivel_3_fecha_inscripcion
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

        const response = {
            ganancia_total: 0, // Ganancia total inicializada
            children: []
        };

        const uniqueIds = new Set(); // To track unique user IDs

        result.forEach(item => {
            const formatDate = (date) => {
                if (!date) return null;
                const d = new Date(date);
                return d.toISOString().split('T')[0];
            };
        
            // Solo procesamos los afiliados si realmente existen (es decir, si tienen un id válido)
            if (item.afiliado_id && !uniqueIds.has(item.afiliado_id)) {
                uniqueIds.add(item.afiliado_id);
        
                const afiliado = {
                    id: item.afiliado_id,
                    nombres: item.afiliado_nombres,
                    apellidos: item.afiliado_apellidos,
                    dni: item.afiliado_dni,
                    telefono: item.afiliado_telefono,
                    rol: item.afiliado_rol_nombre,
                    fecha_inscripcion: formatDate(item.afiliado_fecha_inscripcion),
                    ganancia: 20,
                    ganancia_total: 20,
                    children: []
                };

                result.forEach(af2 => {
                    // Aseguramos que haya un afiliado de nivel 2 antes de agregarlo
                    if (af2.afiliado_id === item.afiliado_id && af2.afiliado_nivel_2_id) {
                        const nivel2 = {
                            id: af2.afiliado_nivel_2_id,
                            nombres: af2.afiliado_nivel_2_nombres,
                            apellidos: af2.afiliado_nivel_2_apellidos,
                            dni: af2.afiliado_nivel_2_dni,
                            telefono: af2.afiliado_nivel_2_telefono,
                            rol: af2.afiliado_nivel_2_rol_nombre,
                            fecha_inscripcion: formatDate(af2.afiliado_nivel_2_fecha_inscripcion),
                            ganancia: 10,
                            ganancia_total: 10,
                            children: []
                        };

                        result.forEach(af3 => {
                            // Aseguramos que haya un afiliado de nivel 3 antes de agregarlo
                            if (af3.afiliado_id === af2.afiliado_id && af3.afiliado_nivel_3_id) {
                                nivel2.children.push({
                                    id: af3.afiliado_nivel_3_id,
                                    nombres: af3.afiliado_nivel_3_nombres,
                                    apellidos: af3.afiliado_nivel_3_apellidos,
                                    dni: af3.afiliado_nivel_3_dni,
                                    telefono: af3.afiliado_nivel_3_telefono,
                                    rol: af3.afiliado_nivel_3_rol_nombre,
                                    fecha_inscripcion: formatDate(af3.afiliado_nivel_3_fecha_inscripcion),
                                    ganancia: 5,
                                    ganancia_total: 5
                                });

                                // Sumar ganancias del nivel 3 al nivel 2
                                nivel2.ganancia_total += 5;
                            }
                        });

                        afiliado.children.push(nivel2);
                        // Sumar ganancias del nivel 2 al afiliado
                        afiliado.ganancia_total += nivel2.ganancia_total;
                    }
                });

                // Solo agregamos a la respuesta si el afiliado tiene datos válidos
                if (afiliado.id) {
                    response.children.push(afiliado);
                    // Sumar ganancias del afiliado al total
                    response.ganancia_total += afiliado.ganancia_total;
                }
            }
        });

        // Si no hay afiliados, la respuesta será un arreglo vacío
        if (response.children.length === 0) {
            return res.status(200).json([]);
        }

        // Enviar la respuesta con los datos
        res.status(200).json([response]);

    } catch (error) {
        console.error('Error fetching user and affiliates:', error);
        res.status(500).json({ message: "Error al obtener el usuario" });
    }
};

export const logoutUsuario= async (req, res) => {
    try {
        // Eliminar las cookies de acceso y refresco
        res.clearCookie('accessToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'None',
        });

        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'None',
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
            `SELECT u.id, u.correo, u.fotoPerfil, u.nombres, u.apellidos, u.dni, u.telefono, u.Estado, r.nombre AS rol
             FROM Usuarios u
             LEFT JOIN Roles r ON u.rol_id = r.id
             WHERE u.rol_id IN (3, 4) AND u.Estado = 'Activo'`
        );

        // Responder con los usuarios encontrados
        return res.status(200).json(usuarios);
    } catch (error) {
        console.error('Error al obtener los usuarios:', error);
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
            maxAge: 1 * 60 * 60 * 1000, // 1 hora
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

    try {
        // Consultar la base de datos para obtener la información del usuario, incluyendo rol_id, dirección, teléfono, y estado_solicitud
        const [rows] = await pool.query(`
            SELECT 
                u.id AS usuarioId, 
                u.correo, 
                u.nombres, 
                u.apellidos, 
                u.fotoPerfil, 
                u.clinica_id, 
                u.estado_solicitud,
                r.nombre AS rol,
                v.id AS vistaId, 
                v.nombre AS vistaNombre, 
                v.logo, 
                v.ruta,
                u.estado AS estado,  
                u.estadoPr AS estadoPr,  
                u.codigo AS codigo,
                u.direccion,  -- Agregar el campo dirección
                u.telefono    -- Agregar el campo teléfono
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

        // Devolver los datos del usuario, las vistas, estado, estadoPr, código, rol_id, dirección, teléfono y estado_solicitud
        res.status(200).json({
            id: usuario.usuarioId,
            correo: usuario.correo,
            nombres: usuario.nombres,
            apellidos: usuario.apellidos,
            fotoPerfil: usuario.fotoPerfil,
            rol: usuario.rol,
            rol_id: usuario.rol_id,  // Incluir rol_id
            clinica_id: usuario.clinica_id || null, 
            estado: usuario.estado || 'No disponible', 
            estadoPr: usuario.estadoPr || 'No disponible', 
            codigo: usuario.codigo || 'No disponible', 
            direccion: usuario.direccion || 'No disponible',  // Incluir dirección
            telefono: usuario.telefono || 'No disponible',  // Incluir teléfono
            estado_solicitud: usuario.estado_solicitud || 'No disponible',  // Incluir estado_solicitud
            vistas: vistas 
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al obtener los datos del usuario' });
    }
}


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

    // Validaciones iniciales
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

    // Verificar si el DNI ya está registrado
    try {
        const [dniResult] = await pool.query('SELECT id FROM Usuarios WHERE dni = ?', [dni]);

        if (dniResult.length > 0) {
            return res.status(400).json({ message: 'El DNI ya está registrado en el sistema.' });
        }
    } catch (err) {
        console.error('Error al verificar el DNI:', err);
        return res.status(500).json({ message: 'Error al verificar el DNI.' });
    }

    // Validar estado civil
    const estadosCiviles = ['soltero', 'casado', 'divorciado', 'viudo'];
    if (estado_civil && !estadosCiviles.includes(estado_civil)) {
        return res.status(400).json({ message: 'Estado civil inválido.' });
    }

    // Validar rol_id (opcional, si se requiere más validación aquí, añadirla)
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
                return res.status(400).json({ message: 'Código2 no corresponde a un afiliador válido.' });
            }
        } catch (err) {
            console.error('Error al verificar el código2 de afiliador:', err);
            return res.status(500).json({ success: false, message: 'Error al verificar el código2 del afiliador.' });
        }
    }

    // Validación del DNI, nombre y apellido con la API externa
    if (dni) {
        try {
            // Hacer la solicitud a la API externa para obtener los datos del DNI
            const response = await axios.get(`https://api.perudevs.com/api/v1/dni/simple?document=${dni}&key=cGVydWRldnMucHJvZHVjdGlvbi5maXRjb2RlcnMuNjc1OWM1MWU5ZmE0MTczZjYxMzIwNTY0`);

            // Comprobamos si la API devuelve datos válidos
            if (response.data && response.data.estado && response.data.estado === true) {
                const apiNombres = response.data.resultado.nombres;
                const apiApellidoPaterno = response.data.resultado.apellido_paterno;
                const apiApellidoMaterno = response.data.resultado.apellido_materno;

                // Comparar los nombres y apellidos con los proporcionados
                if (
                    nombres.toLowerCase() !== apiNombres.toLowerCase() ||
                    !apellidos.toLowerCase().includes(apiApellidoPaterno.toLowerCase()) ||
                    !apellidos.toLowerCase().includes(apiApellidoMaterno.toLowerCase())
                ) {
                    return res.status(400).json({ message: 'El nombre y apellido no coinciden con los datos del DNI.' });
                }
            } else {
                return res.status(400).json({ message: 'No se pudo obtener los datos del DNI.' });
            }
        } catch (err) {
            console.error('Error al validar el DNI con la API externa:', err);
            return res.status(500).json({ message: 'Error al verificar el DNI con la API externa.' });
        }
    }

    try {
        // Query para insertar el nuevo usuario
        const query = `
            INSERT INTO Usuarios (correo, contraseña, nombres, apellidos, dni, estado_civil, rol_id, afiliador_id, fechNac, telefono, direccion, codigo2, Estado, EstadoPr)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        // Ejecutar la consulta de inserción
        const [result] = await pool.query(query, [
            correo, 
            contraseña, 
            nombres, 
            apellidos, 
            dni, 
            estado_civil, 
            rol_id,
            afiliador_id, 
            fechNac, 
            telefono, 
            direccion, 
            codigo2, 
            'desactivado', // Estado por defecto
            'desactivado'  // Estado por defecto
        ]);        

        // Si el afiliador_id existe, generar una notificación con el nombre y apellido del usuario nuevo
        if (afiliador_id) {
            const mensaje = `¡Nuevo usuario registrado! Nombre: ${nombres} ${apellidos}`;

            const notificacionQuery = `
                INSERT INTO Notificaciones (mensaje, usuario_id)
                VALUES (?, ?)
            `;

            // Insertar la notificación para el afiliador
            await pool.query(notificacionQuery, [mensaje, afiliador_id]);
        }

        // Notificación de bienvenida al nuevo usuario
        const mensajeBienvenida = `¡Bienvenido a MasSalud, ${nombres} ${apellidos}!`;
        await pool.query('INSERT INTO Notificaciones (mensaje, usuario_id) VALUES (?, ?)', [mensajeBienvenida, result.insertId]);

        // Notificación de confirmación de correo al nuevo usuario
        const mensajeConfirmacionCorreo = 'Por favor, confirma tu correo para activar tu cuenta.';
        await pool.query('INSERT INTO Notificaciones (mensaje, usuario_id) VALUES (?, ?)', [mensajeConfirmacionCorreo, result.insertId]);

        res.status(201).json({ success: true, message: 'Usuario creado con éxito', usuarioId: result.insertId });
    } catch (err) {
        console.error('Error al crear el usuario:', err);
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: 'El correo ya está en uso.' });
        }
        return res.status(500).json({ success: false, message: 'Error al crear el usuario.' });
    }
};

export const Notificaciones = async (req, res) => {
    try {
        const { usuarioId } = req.params;

        // Obtener las notificaciones más recientes (3), ordenadas por fecha
        const [notificaciones] = await pool.query(
            'SELECT * FROM Notificaciones WHERE es_global = TRUE OR usuario_id = ?',
            [usuarioId]
        );

        // Formatear la fecha de cada notificación para que sea solo "YYYY-MM-DD"
        const notificacionesFormateadas = notificaciones.map(notification => {
            const fecha = new Date(notification.fecha);
            // Obtener el formato "YYYY-MM-DD"
            const fechaFormateada = fecha.toISOString().split('T')[0];
            return {
                ...notification,
                fecha: fechaFormateada
            };
        });

        // Enviar las notificaciones con la fecha formateada
        res.status(200).json(notificacionesFormateadas);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al obtener notificaciones' });
    }
};


export const CreateMensagge = async (req, res) => {
    const { mensaje } = req.body;

    try {
        // Crear notificación global
        await pool.query('INSERT INTO Notificaciones (mensaje, es_global) VALUES (?, ?)', [mensaje, true]);

        res.status(200).send({ message: 'Notificación global enviada exitosamente' });
    } catch (error) {
        res.status(500).send({ error: 'Error al enviar notificación global' });
    }
};

