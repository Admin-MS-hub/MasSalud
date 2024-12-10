import multer from "multer";
import pool from "../database.js";

export const GetSubAdmin = async (req, res) => {
    const { id } = req.params; // Asegúrate de que estás recibiendo el parámetro 'id'
    try {
        const query = 'SELECT id, dni, nombres, apellidos, telefono, fotoPerfil, correo, contraseña, fechNac, direccion FROM Usuarios WHERE rol_id = 2 AND clinica_id = ?';
        const [subAdmins] = await pool.query(query, [id]); // Consulta con parámetro

        if (subAdmins.length === 0) {
            return res.status(404).json({ message: 'No se encontraron usuarios asociados a esta clínica' });
        }

        res.status(200).json(subAdmins); // Respuesta exitosa
    } catch (err) {
        console.error(err); // Log del error para depuración
        res.status(500).json({ message: 'Error al obtener los usuarios' }); // Manejo de errores
    }
};

export const GetSubAdministrador = async (req, res) => {
    const { id } = req.params; // Asegúrate de que estás recibiendo el parámetro 'id'
    try {
        const query = `
            SELECT 
                u.id, 
                u.dni, 
                u.nombres, 
                u.apellidos, 
                u.telefono, 
                u.fotoPerfil, 
                u.correo, 
                u.contraseña, 
                u.fechNac, 
                u.direccion,
                l.id AS local_id,        -- Añadimos el id del local
                l.nombre AS local_nombre  -- Añadimos el nombre del local
            FROM 
                Usuarios u
            LEFT JOIN 
                Locales l ON u.Local_id = l.id
            WHERE 
                u.rol_id = 5 AND u.clinica_id = ?
        `;
        const [subAdmins] = await pool.query(query, [id]); // Consulta con parámetro

        if (subAdmins.length === 0) {
            return res.status(404).json({ message: 'No se encontraron usuarios asociados a esta clínica' });
        }

        res.status(200).json(subAdmins); // Respuesta exitosa
    } catch (err) {
        console.error(err); // Log del error para depuración
        res.status(500).json({ message: 'Error al obtener los usuarios' }); // Manejo de errores
    }
};

export const GetPaginaHome = async (req, res) => {
    try {
        // Consultas individuales
        const ListatopQuery = `
            SELECT 
                Promociones.*, 
                Clinicas.IsoTipo 
            FROM 
                Promociones 
            LEFT JOIN 
                Clinicas ON Promociones.clinica_id = Clinicas.id
            ORDER BY 
                Promociones.calificacion DESC
            LIMIT 3
        `;
        
        const IsoTipoQuery = 'SELECT id, IsoTipo,nombre,direccion,telefonos,tarifario FROM Clinicas WHERE IsoTipo IS NOT NULL';
        const PromocionesQuery = `SELECT 
                Promociones.*, 
                Clinicas.IsoTipo 
            FROM 
                Promociones 
            LEFT JOIN 
                Clinicas ON Promociones.clinica_id = Clinicas.id
        `;

        // Realizar las consultas
        const [Listatop] = await pool.query(ListatopQuery);
        const [IsoTipo] = await pool.query(IsoTipoQuery);
        const [Promociones] = await pool.query(PromocionesQuery);

        // Preparar la respuesta con los resultados de las consultas
        const page = {
            Listatop,
            Img: IsoTipo,
            Promociones
        };

        // Enviar la respuesta al cliente
        res.status(200).json(page);

    } catch (error) {
        console.error('Error al obtener la página de inicio:', error);
        res.status(500).json({ message: 'Error al obtener los datos', error });
    }
};


export const Afiliador = async (req, res) => {
    const { id } = req.params; // Obtener el ID desde los parámetros de la URL
    const { codigo, rol_id } = req.body; // Obtener el código y rol_id desde el cuerpo de la solicitud

    // Verificar que los parámetros sean válidos
    if (!id || isNaN(id)) {
        return res.status(400).json({ message: 'El ID es requerido y debe ser un número.' });
    }

    if (!codigo || !rol_id) {
        return res.status(400).json({ message: 'El código y el rol_id son requeridos.' });
    }

    // Crear la consulta SQL para actualizar el usuario
    let query = 'UPDATE Usuarios SET codigo = ?, rol_id = ? WHERE id = ?';

    try {
        // Ejecutar la consulta en la base de datos
        const [response] = await pool.query(query, [codigo, rol_id, id]);

        // Verificar si se actualizó algún registro
        if (response.affectedRows === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado o no se realizaron cambios.' });
        }

        // Enviar una respuesta exitosa
        res.status(200).json({ message: 'Usuario actualizado exitosamente', response });
    } catch (error) {
        console.error(error); // Registrar el error en la consola
        res.status(500).json({ message: 'Error al actualizar los datos', error });
    }
};


export const Password = async (req, res) => {
    const { id } = req.params;
    const { contraseña, newcontraseña } = req.body;

    // Validación de entrada
    if (!contraseña || !newcontraseña) {
        return res.status(400).json({ message: 'La contraseña actual y la nueva son requeridas.' });
    }

    // Validar que la nueva contraseña tenga al menos 6 caracteres
    if (newcontraseña.length < 6) {
        return res.status(400).json({ message: 'La nueva contraseña debe tener al menos 6 caracteres.' });
    }

    try {
        // Obtener la contraseña actual del usuario desde la base de datos
        const [user] = await pool.query('SELECT * FROM Usuarios WHERE id = ?', [id]);

        if (user.length === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        // Comparar la contraseña antigua con la almacenada en la base de datos
        if (contraseña !== user[0].contraseña) {
            return res.status(401).json({ message: 'La contraseña antigua no es correcta' });
        }

        // Validar que la nueva contraseña no sea igual a la actual
        if (contraseña === newcontraseña) {
            return res.status(400).json({ message: 'La nueva contraseña no puede ser igual a la actual.' });
        }

        // Actualizar la contraseña en la base de datos (sin encriptar)
        await pool.query('UPDATE Usuarios SET contraseña = ? WHERE id = ?', [newcontraseña, id]);

        return res.status(200).json({
            message: 'Contraseña cambiada exitosamente',
            success: true
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al cambiar la contraseña', error });
    }
};

export const GenCode = async (req, res) => {
    const { id } = req.params; // Obtener el ID desde los parámetros de la URL
    const { rol_id } = req.body; // Obtener el rol_id desde el cuerpo de la solicitud

    // Verificar que los parámetros sean válidos
    if (!id || isNaN(id)) {
        return res.status(400).json({ message: 'El ID es requerido y debe ser un número.' });
    }

    if (!rol_id) {
        return res.status(400).json({ message: 'El rol_id es requerido.' });
    }

    try {
        // Obtener los datos del usuario (dni, nombres, apellidos)
        const [usuario] = await pool.query('SELECT dni, nombres, apellidos FROM Usuarios WHERE id = ?', [id]);

        // Si el usuario no existe
        if (usuario.length === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }

        const { dni, nombres, apellidos } = usuario[0];

        // Generar el código inicial basado en dni, nombres y apellidos
        let codigo = generarCodigo(dni, nombres, apellidos);

        // Verificar si el código ya existe en la base de datos
        const [verificacion] = await pool.query('SELECT COUNT(*) AS count FROM Usuarios WHERE codigo = ?', [codigo]);

        // Si ya existe, generamos uno nuevo con un número aleatorio en lugar de sufijo secuencial
        if (verificacion[0].count > 0) {
            let nuevoCodigo;
            let verificacionNuevo;

            do {
                // Generar un número aleatorio para el sufijo
                const sufijoAleatorio = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
                nuevoCodigo = `${codigo.substring(0, 6)}${sufijoAleatorio}`;

                // Verificamos si el nuevo código ya existe
                const [verificacionNuevoResult] = await pool.query('SELECT COUNT(*) AS count FROM Usuarios WHERE codigo = ?', [nuevoCodigo]);
                verificacionNuevo = verificacionNuevoResult[0].count;

            } while (verificacionNuevo > 0); // Continuamos hasta que encontremos un código único

            // Asignar el nuevo código generado
            codigo = nuevoCodigo;
        }

        // Actualizamos el usuario con el nuevo código y rol_id
        const query = 'UPDATE Usuarios SET codigo = ?, rol_id = ? WHERE id = ?';
        const [response] = await pool.query(query, [codigo, rol_id, id]);

        if (response.affectedRows === 0) {
            return res.status(404).json({ message: 'No se actualizó ningún usuario. Verifique el ID.' });
        }

        // Respuesta exitosa
        res.status(200).json({ message: 'Código y rol actualizados correctamente', codigo });

    } catch (error) {
        console.error('Error al generar y actualizar código:', error);
        res.status(500).json({ message: 'Error al generar o actualizar el código', error });
    }
};

// Función que genera el código basado en dni, nombres y apellidos
const generarCodigo = (dni, nombres, apellidos) => {
    const primerosDni = dni ? dni.substring(0, 3) : '000';
    const primerasLetrasNombre = nombres ? nombres.substring(0, 2).toUpperCase() : 'NA';
    const primerasLetrasApellido = apellidos ? apellidos.substring(0, 3).toUpperCase() : 'NA';
    
    let codigo = primerosDni + primerasLetrasNombre + primerasLetrasApellido;
    return codigo.padEnd(8, '0');
};

export const getGananciaTotalGeneral = async (req, res) => {
    try {
        const query = `
            SELECT 
                u.id AS usuario_id,
                u.nombres,
                u.apellidos,
                u.dni,
                u.telefono,
                r.nombre AS rol_nombre,
                -- Sumar ganancias del primer nivel
                SUM(CASE WHEN af.id IS NOT NULL THEN 20 ELSE 0 END) +
                -- Sumar ganancias del segundo nivel
                SUM(CASE WHEN af2.id IS NOT NULL THEN 10 ELSE 0 END) +
                -- Sumar ganancias del tercer nivel
                SUM(CASE WHEN af3.id IS NOT NULL THEN 5 ELSE 0 END) AS ganancia_total_general
            FROM 
                Usuarios u
            LEFT JOIN 
                Roles r ON u.rol_id = r.id  -- Obtener el nombre del rol
            LEFT JOIN 
                Usuarios af ON af.afiliador_id = u.id  -- Primer nivel (afiliados directos)
            LEFT JOIN 
                Usuarios af2 ON af2.afiliador_id = af.id  -- Segundo nivel (afiliados de los afiliados)
            LEFT JOIN 
                Usuarios af3 ON af3.afiliador_id = af2.id  -- Tercer nivel (afiliados de los afiliados de los afiliados)
            GROUP BY 
                u.id, u.nombres, u.apellidos, u.dni, u.telefono, r.nombre
        `;

        const [result] = await pool.query(query);

        if (result.length === 0) {
            return res.status(404).json({ message: 'No se encontraron usuarios' });
        }

        // Mapear los resultados a un formato adecuado
        const usuarios = result.map(usuario => ({
            usuario_id: usuario.usuario_id,
            nombres: usuario.nombres,
            apellidos: usuario.apellidos,
            dni: usuario.dni,
            telefono: usuario.telefono,
            rol: usuario.rol_nombre,
            ganancia_total_general: usuario.ganancia_total_general || 0
        }));

        // Responder con la lista de usuarios
        res.status(200).json(usuarios);

    } catch (error) {
        console.error('Error fetching total earnings for all users:', error);
        res.status(500).json({ message: "Error al obtener las ganancias totales de los usuarios" });
    }
};

export const GetFamiliares = async (req, res) => {
    try {
        const query = ` SELECT * FROM Familiares`;
        
        const [response] = await pool.query(query); // Consulta con parámetro

        res.status(200).json(response); // Respuesta exitosa
    } catch (err) {
        console.error(err); // Log del error para depuración
        res.status(500).json({ message: 'Error al obtener los usuarios' }); // Manejo de errores
    }
};


export const CambiarEstadosFam = async (req, res) => {
    const { id } = req.params;
    const Estado = 'Activo'; // Asignar el valor 'Activo' directamente
  
    // Validación del ID
    if (!id || isNaN(id)) {
      return res.status(400).json({ message: 'El ID es requerido y debe ser un número.' });
    }
  
    const query = 'UPDATE Familiares SET estado = ? WHERE id = ?';
    
    try {
      const [results] = await pool.query(query, [Estado, id]); // Primero el Estado y luego el ID en la query
      if (results.affectedRows > 0) {
        res.status(200).json({ message: 'Estado actualizado correctamente.' });
      } else {
        res.status(404).json({ message: 'Usuario no encontrado.' });
      }
    } catch (err) {
      console.error('Error:', err);
      res.status(500).json({ message: 'Error al actualizar el estado.' });
    }
  };
