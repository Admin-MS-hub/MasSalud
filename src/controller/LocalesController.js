import multer from "multer";
import pool from "../database.js";

export const crearLocal = async (req, res) => {
    const { nombre, direccion, clinica_id } = req.body;

    // Verifica que se envíen todos los campos obligatorios
    if (!nombre || !direccion || !clinica_id) {
        return res.status(400).json({ message: 'Todos los campos son obligatorios: nombre, direccion, clinica_id' });
    }

    try {
        // Consulta SQL para insertar un nuevo local
        const [result] = await pool.query(
            'INSERT INTO Locales (nombre, direccion, clinica_id) VALUES (?, ?, ?)',
            [nombre, direccion, clinica_id]
        );

        // Responder con éxito y el ID del local creado
        return res.status(201).json({
            message: 'Local creado con éxito',
            localId: result.insertId, // Devuelve el ID del nuevo local
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error al crear el local' });
    }
};

export const editarLocal = async (req, res) => {
    const { id } = req.params; // Obtener el ID del local a editar
    const { nombre, direccion, clinica_id } = req.body; // Obtener los nuevos datos del cuerpo de la solicitud

    // Verifica que se envíen todos los campos obligatorios
    if (!nombre || !direccion || !clinica_id) {
        return res.status(400).json({ message: 'Todos los campos son obligatorios: nombre, direccion, clinica_id' });
    }

    try {
        // Verificar si el local existe antes de actualizarlo
        const [local] = await pool.query('SELECT * FROM Locales WHERE id = ?', [id]);
        if (local.length === 0) {
            return res.status(404).json({ message: 'El local no existe' });
        }

        // Consulta SQL para actualizar el local
        await pool.query(
            'UPDATE Locales SET nombre = ?, direccion = ?, clinica_id = ? WHERE id = ?',
            [nombre, direccion, clinica_id, id]
        );

        // Responder con éxito si la actualización fue exitosa
        return res.status(200).json({
            message: 'Local actualizado con éxito',
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error al actualizar el local' });
    }
};

export const GetLocales = async (req, res) => {
    try {
        // Consulta para obtener todos los locales
        const [locales] = await pool.query('SELECT * FROM Locales');

        // Verificar si hay locales en la base de datos
        if (locales.length === 0) {
            return res.status(404).json({ message: 'No se encontraron locales' });
        }

        // Enviar la lista de locales en la respuesta
        return res.status(200).json(locales);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error al obtener los locales' });
    }
};

export const LocalesClinica = async (req, res) => {
    const { clinica_id } = req.params; // Obtener el clinica_id desde los parámetros de la ruta

    try {
        // Consulta para obtener los locales filtrados por clinica_id
        const [locales] = await pool.query('SELECT * FROM Locales WHERE clinica_id = ?', [clinica_id]);

        // Verificar si se encontraron locales para la clínica
        if (locales.length === 0) {
            return res.status(404).json({ message: 'No se encontraron locales para esta clínica' });
        }

        // Enviar la lista de locales en la respuesta
        return res.status(200).json(locales);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error al obtener los locales para esta clínica' });
    }
};

export const DeleteLocal = async (req, res) => {
    const { id } = req.params; // Obtener el id del local desde los parámetros de la ruta

    try {
        // Ejecutar la consulta para eliminar el local
        const [result] = await pool.query('DELETE FROM Locales WHERE id = ?', [id]);

        // Verificar si el local fue eliminado
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Local no encontrado' });
        }

        // Enviar respuesta de éxito
        return res.status(200).json({ message: 'Local eliminado exitosamente' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error al eliminar el local' });
    }
};

export const Logistica = async (req, res) => {
    try {
        const [data] = await pool.query(`
            SELECT 
                COUNT(CASE WHEN rol_id IN (3, 4) THEN 1 END) AS total_afiliados,
                COUNT(CASE WHEN rol_id = 3 THEN 1 END) AS total_afiliador,
                COUNT(CASE WHEN rol_id = 4 THEN 1 END) AS total_afiliado,
                (SELECT COUNT(*) FROM Clinicas) AS total_clinicas,
                (SELECT COUNT(*) FROM Usuarios WHERE MONTH(fecha_inscripcion) = MONTH(CURRENT_DATE) AND YEAR(fecha_inscripcion) = YEAR(CURRENT_DATE) AND rol_id IN (3, 4)) AS mes_actual
            FROM Usuarios
        `);

        // Obtener la cantidad de nuevos afiliadores y afiliados este mes
        const [nuevosAfiliadores] = await pool.query(`
            SELECT COUNT(*) AS cambio
            FROM Usuarios 
            WHERE rol_id = 3 AND MONTH(fecha_inscripcion) = MONTH(CURRENT_DATE) AND YEAR(fecha_inscripcion) = YEAR(CURRENT_DATE)
        `);

        const [nuevosAfiliados] = await pool.query(`
            SELECT COUNT(*) AS cambio
            FROM Usuarios 
            WHERE rol_id = 4 AND MONTH(fecha_inscripcion) = MONTH(CURRENT_DATE) AND YEAR(fecha_inscripcion) = YEAR(CURRENT_DATE)
        `);

        const [AfiliadorPorMes] = await pool.query(`
            SELECT 
                MONTH(fecha_inscripcion) AS mes, 
                YEAR(fecha_inscripcion) AS anio,
                COUNT(*) AS total
            FROM Usuarios
            WHERE rol_id=3
            GROUP BY anio, mes
            ORDER BY anio ASC, mes ASC;
        `);

        const PorMesAFR = AfiliadorPorMes.map(row => ({
            mes: row.mes,
            total: row.total,
        }));
        const [AfiliadosPorMes] = await pool.query(`
            SELECT 
                MONTH(fecha_inscripcion) AS mes, 
                YEAR(fecha_inscripcion) AS anio,
                COUNT(*) AS total
            FROM Usuarios
            WHERE rol_id=4
            GROUP BY anio, mes
            ORDER BY anio ASC, mes ASC;
        `);

        const PorMesAFS = AfiliadosPorMes.map(row => ({
            mes: row.mes,
            total: row.total,
        }));

        const [clinicasLista] = await pool.query('SELECT id, nombre, ruc, IsoTipo FROM Clinicas WHERE id IN (1, 2, 3)');
        const [promocionesLista] = await pool.query('SELECT id, area, calificacion, imagen FROM Promociones WHERE id IN (1, 2, 3)');

        const total_usuarios = {
            total: [
                {
                    cantidad: data[0].total_afiliados,
                    title: 'Afiliados',
                    icono: 'pi pi-users',
                    severity: 'info',
                    cambio: data[0].mes_actual // Cambios de usuarios este mes
                },
                {
                    cantidad: data[0].total_afiliador,
                    title: 'Afiliador',
                    icono: 'pi pi-user',
                    severity: 'info',
                    cambio: nuevosAfiliadores[0].cambio // Nuevos afiliadores este mes
                },
                {
                    cantidad: data[0].total_afiliado,
                    title: 'Afiliados',
                    icono: 'pi pi-user',
                    severity: 'info',
                    cambio: nuevosAfiliados[0].cambio // Nuevos afiliados este mes
                },
                {
                    cantidad: data[0].total_clinicas,
                    title: 'Clínicas',
                    icono: 'pi pi-building',
                    severity: 'info',
                    cambio: '5' // Asegúrate de que esto refleje datos precisos
                }
            ],
            clinicasLista,
            promocionesLista,
            AfiliadorPorMes:PorMesAFR,
            AfiliadosPorMes:PorMesAFS
        };

        return res.status(200).json(total_usuarios);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error al obtener los datos de logística' });
    }
};


export const ConfigUser = async (req, res) => {
    const  {id} = req.params;  // El ID del usuario se pasa como parámetro
    const { correo, telefono, direccion } = req.body;  // Los nuevos datos a actualizar

    // Validaciones
    if (!correo && !telefono && !direccion) {
        return res.status(400).json({ message: 'No se proporcionaron datos para actualizar.' });
    }

    // Verificar teléfono (si se proporciona)
    if (telefono && !/^\d{7,15}$/.test(telefono)) {
        return res.status(400).json({ message: 'El teléfono debe ser un número válido entre 7 y 15 dígitos.' });
    }

    try {
        // Diagnóstico: Verificar si el ID de usuario es correcto
        console.log('Intentando actualizar el usuario con ID:', id);

        // Query para actualizar el usuario
        const query = `
            UPDATE Usuarios
            SET
                correo = ?,
                telefono = ?,
                direccion = ?
            WHERE id = ?`;

        // Ejecutar la consulta de actualización
        const [result] = await pool.query(query, [correo, telefono, direccion, id]);

        // Diagnóstico: Verificar el resultado de la actualización
        console.log('Resultado de la actualización:', result);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado o no hubo cambios.' });
        }

        res.status(200).json({ success: true, message: 'Usuario actualizado con éxito.' });
    } catch (err) {
        console.error('Error al actualizar el usuario:', err);
        return res.status(500).json({ message: 'Error al actualizar el usuario.' });
    }
};

