import pool from "../database.js";
import multer from "multer"; 
import fs from 'fs';
import path from 'path';

export const getPromocionesId = async (req, res) => {
    const { id } = req.params; // Obtener el ID de la clínica de los parámetros
  
    // Validación del ID de la clínica
    if (!id || isNaN(id)) {
      return res.status(400).json({ message: 'El ID de la clínica es requerido y debe ser un número.' });
    }
  
    const query = 'SELECT * FROM Promociones WHERE clinica_id = ?';
  
    try {
      const [results] = await pool.query(query, [id]);
      res.status(200).json(results);
    } catch (err) {
      console.error('Error al obtener las promociones:', err);
      res.status(500).json({ message: 'Error al obtener las promociones' });
    }
  };  

  export const getPromociones = async (req, res) => {
    const query = `
      SELECT 
        Promociones.*, 
        Clinicas.IsoTipo,
        Clinicas.nombre AS nombre_clinica 
      FROM 
        Promociones 
      LEFT JOIN 
        Clinicas ON Promociones.clinica_id = Clinicas.id
    `; // Consulta que une ambas tablas
  
    try {
      const [results] = await pool.query(query);
      
      // Verificar si se encontraron resultados
      if (results.length === 0) {
        return res.status(404).json({ message: 'No se encontraron promociones.' });
      }
  
      res.status(200).json(results);
    } catch (err) {
      console.error('Error al obtener las promociones:', err);
      res.status(500).json({ message: 'Error al obtener las promociones. Intente nuevamente más tarde.' });
    }
  };

export const getTopPromociones = async (req, res) => {
  const query = `
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
  `; // Consulta para obtener las 3 promociones con mayor calificación

  try {
    const [results] = await pool.query(query);
    
    // Verificar si se encontraron resultados
    if (results.length === 0) {
      return res.status(404).json({ message: 'No se encontraron promociones.' });
    }

    res.status(200).json(results);
  } catch (err) {
    console.error('Error al obtener las promociones:', err);
    res.status(500).json({ message: 'Error al obtener las promociones. Intente nuevamente más tarde.' });
  }
  };

export const postPromocion = async (req, res) => {
    const { area, descuento, descripcion, id } = req.body;

    // Validación de 'area'
    if (!area || typeof area !== 'string' || area.length > 100) {
      return res.status(400).json({ message: 'El área es requerida y debe ser un texto de hasta 100 caracteres.' });
    }

    // Validación de 'descuento'
    if (descuento === undefined || isNaN(descuento) || descuento < 0 || descuento > 100) {
      return res.status(400).json({ message: 'El descuento debe ser un número entre 0 y 100.' });
    }

    // Validación de 'descripcion' (opcional, pero recomendado)
    // if (descripcion && typeof descripcion !== 'string') {
    //   return res.status(400).json({ message: 'La descripción debe ser un texto válido.' });
    // }

    try {
      const query = `INSERT INTO Promociones (area, descuento, clinica_id) 
                     VALUES (?, ?, ?, ?)`;

      const [result] = await pool.query(query, [area, descuento, id]);
      res.status(201).json({
        message: 'Promoción creada con éxito',
        promocionId: result.insertId
      });
    } catch (err) {
      console.error('Error al crear la promoción:', err);
      res.status(500).json({ message: 'Error al crear la promoción. Intenta de nuevo más tarde.' });
    }
};
  
export const editPromocion = async (req, res) => {
    const { id } = req.params;
    const { area, descuento, descripcion, clinica_id } = req.body;
  
    // Validaciones
    if (!id || isNaN(id)) {
      return res.status(400).json({ message: 'El ID es requerido y debe ser un número.' });
    }
  
    if (area && (typeof area !== 'string' || area.length > 100)) {
      return res.status(400).json({ message: 'El área debe ser un texto de hasta 100 caracteres.' });
    }
  
    if (descuento !== undefined && (isNaN(descuento) || descuento < 0 || descuento > 100)) {
      return res.status(400).json({ message: 'El descuento debe ser un número entre 0 y 100.' });
    }
  
    if (clinica_id !== undefined && isNaN(clinica_id)) {
      return res.status(400).json({ message: 'El ID de la clínica debe ser un número.' });
    }
  
    const query = `UPDATE Promociones SET area = ?, descuento = ?, descripcion = ?, clinica_id = ? WHERE id = ?`;
  
    try {
      const [result] = await pool.query(query, [area, descuento, descripcion, clinica_id, id]);
  
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Promoción no encontrada.' });
      }
  
      res.status(200).json({ message: 'Promoción actualizada con éxito' });
    } catch (err) {
      console.error('Error al actualizar la promoción:', err);
      res.status(500).json({ message: 'Error al actualizar la promoción' });
    }
  };

export const deletePromocion = async (req, res) => {
    const { id } = req.params;
  
    // Validación del ID
    if (!id || isNaN(id)) {
      return res.status(400).json({ message: 'El ID es requerido y debe ser un número.' });
    }
  
    const query = `DELETE FROM Promociones WHERE id = ?`;
  
    try {
      const [result] = await pool.query(query, [id]);
  
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Promoción no encontrada.' });
      }
  
      res.status(200).json({ message: 'Promoción eliminada con éxito' });
    } catch (err) {
      console.error('Error al eliminar la promoción:', err);
      res.status(500).json({ message: 'Error al eliminar la promoción' });
    }
  };
  
export const AfiliadorEdit = async (req, res) => {
    const { id } = req.params;

    try {
        const [result] = await pool.query('UPDATE datospersonales SET Afiliador = true WHERE Id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Datos no encontrados' });
        }

        res.status(200).json({ message: 'Datos editados correctamente' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
  };

  export const Image = async (req, res) => {
    try {
        const Id = req.params.id;
        const newImagePath = req.file.filename; // Obtener el nuevo nombre del archivo
  
        // Consultar la ruta de la imagen actual en la base de datos
        const queryGetImage = 'SELECT imagen FROM promociones WHERE Id = ?';
        const [rows] = await pool.query(queryGetImage, [Id]);
  
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Promoción no encontrada' });
        }
  
        const currentImagePath = rows[0].imagen;
  
        // Eliminar la imagen anterior si existe
        if (currentImagePath) {
            const fullPath = path.join('uploads', currentImagePath);
            if (fs.existsSync(fullPath)) {
                fs.unlinkSync(fullPath); // Eliminar el archivo del sistema
            }
        }
  
        // Actualizar la ruta de la imagen en la base de datos
        const queryUpdateImage = 'UPDATE promociones SET imagen = ? WHERE Id = ?';
        const [result] = await pool.query(queryUpdateImage, [newImagePath, Id]);
  
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Promoción no encontrada' });
        }
  
        res.status(201).json({ imagen: newImagePath, message: 'Éxito' });
    } catch (err) {
        console.error("Error actualizando la imagen de la promoción:", err);
        res.status(500).send("Error al actualizar la imagen de la promoción");
    }
  };  

export const Rutas = async (req, res) => {
  const { id } = req.params;  // Obtener el ID de la clínica de los parámetros
  
  // Validación del ID de la clínica
  if (!id || isNaN(id)) {
    return res.status(400).json({ message: 'El ID del usuario es necesario y debe ser un número' });
  }

  const queryUsuario = 'SELECT rol_id FROM Usuarios WHERE id = ?';
  
  try {
    const [resultsUsu] = await pool.query(queryUsuario, [id]);

    // Validar que se haya encontrado un usuario
    if (resultsUsu.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const rolId = resultsUsu[0].rol_id; // Extraer rol_id

    const query = 'SELECT nombre, logo, ruta FROM Vistas WHERE rol_id = ?';
    const [results] = await pool.query(query, [rolId]);
    
    res.status(200).json(results);
  } catch (err) {
    console.error('Error al obtener las rutas:', err);
    res.status(500).json({ message: 'Error al obtener las rutas' });
  }
  }

  export const UsuariosRol = async (req,res) =>{
    const {id} = req.params
    const queryRol = `select id,correo,nombres,apellidos,telefono,rol_id,clinica_id from Usuarios where rol_id = ?`;
    try {
      const [users] = await pool.query(queryRol,[id]);
      res.status(200).json(users)
    } catch (error) {
      res.status(500).json({message:'error',error})      
    }
  }

  export const RolUsuario = async (req, res) => {
    const { id } = req.params; // Obtener el ID del usuario de los parámetros
    
    // Validación del ID del usuario
    if (!id || isNaN(id)) {
      return res.status(400).json({ message: 'El ID del usuario es necesario y debe ser un número' });
    }
  
    const queryUsuario = 'SELECT rol_id FROM Usuarios WHERE id = ?';
    
    try {
      const [resultsUsu] = await pool.query(queryUsuario, [id]);
  
      // Validar que se haya encontrado un usuario
      if (resultsUsu.length === 0) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
      }
      
      // Enviar solo el rol_id
      res.status(200).json({ rol_id: resultsUsu[0].rol_id });
    } catch (err) {
      console.error('Error al obtener las rutas:', err);
      res.status(500).json({ message: 'Error al obtener las rutas' });
    }
}

export const postFamiliares = async (req, res) => {
  const { dni, nombres, apellidos, parentesco, familiar_id } = req.body;

  // Validation checks
  if (!dni || !nombres || !apellidos || !parentesco || !familiar_id) {
    return res.status(400).json({ message: 'Todos los campos son obligatorios.' });
  }

  if (typeof dni !== 'string' || !/^\d{8,10}$/.test(dni)) {
    return res.status(400).json({ message: 'El DNI debe ser un número válido de 8 a 10 dígitos.' });
  }

  if (typeof nombres !== 'string' || nombres.trim().length === 0) {
    return res.status(400).json({ message: 'El campo "nombres" debe ser una cadena no vacía.' });
  }

  if (typeof apellidos !== 'string' || apellidos.trim().length === 0) {
    return res.status(400).json({ message: 'El campo "apellidos" debe ser una cadena no vacía.' });
  }

  if (typeof parentesco !== 'string' || parentesco.trim().length === 0) {
    return res.status(400).json({ message: 'El campo "parentesco" debe ser una cadena no vacía.' });
  }

  // Verifica si familiar_id es un número válido
  if (isNaN(familiar_id) || !Number.isInteger(Number(familiar_id))) {
    return res.status(400).json({ message: 'El campo "Familiar_id" debe ser un número entero válido.' });
  }

  try {
    // SQL query to insert the familiar into the "Familiares" table
    const query = `INSERT INTO Familiares (dni, nombres, apellidos, parentesco, familiar_id) 
                   VALUES (?, ?, ?, ?, ?)`;

    // Ejecutar la consulta con el familiar_id convertido a número
    const [result] = await pool.query(query, [dni, nombres, apellidos, parentesco, familiar_id]);

    // Responder con éxito
    res.status(201).json({
      message: 'Familiar creado con éxito',
      familiarId: result.insertId  // ID del familiar recién creado
    });
  } catch (err) {
    console.error('Error al crear el familiar:', err);
    res.status(500).json({ message: 'Error al crear el familiar. Intenta de nuevo más tarde.' });
  }
};

export const getFamiliares = async (req, res) => {
  const { id } = req.params;

  // Validación del ID de la clínica
  if (!id || isNaN(id)) {
    return res.status(400).json({ message: 'El ID es requerido y debe ser un número.' });
  }

  const query = 'SELECT dni, nombres, apellidos, parentesco, estado FROM Familiares WHERE Familiar_id = ?';

  try {
    const [results] = await pool.query(query, [id]);
    res.status(200).json(results);
  } catch (err) {
    console.error('Error al obtener los Familiares:', err);
    res.status(500).json({ message: 'Error al obtener los Familiares' });
  }
};  

export const getEstadosUser = async (req, res) => {
  const query = `
    SELECT 
      u.id,
      u.dni, 
      u.nombres, 
      u.apellidos, 
      u.fecha_inscripcion, 
      u.codigo,
      u.Estado, 
      u.EstadoPr, 
      r.nombre AS rol_nombre  -- Obtener el nombre del rol
    FROM 
      Usuarios u
    JOIN 
      Roles r ON u.rol_id = r.id  -- Hacemos el JOIN con la tabla Roles
    WHERE 
      u.rol_id IN (6, 3, 4)
  `;

  try {
    const [results] = await pool.query(query);

    // Modificar el formato de la fecha_inscripcion
    const formattedResults = results.map(result => {
      // Convierte la fecha a un formato 'YYYY-MM-DD'
      const formattedDate = result.fecha_inscripcion.toISOString().split('T')[0];
      return {
        ...result,
        fecha_inscripcion: formattedDate
      };
    });

    res.status(200).json(formattedResults);
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ message: 'Error al obtener Usuarios' });
  }
};

export const CambiarEstados = async (req, res) => {
  const { id } = req.params;
  const Estado = 'Activo'; // Asignar el valor 'Activo' directamente
  const rol_id = '4'

  // Validación del ID
  if (!id || isNaN(id)) {
    return res.status(400).json({ message: 'El ID es requerido y debe ser un número.' });
  }

  const query = 'UPDATE Usuarios SET Estado = ?, rol_id = ? WHERE id = ?';
  
  try {
    const [results] = await pool.query(query, [Estado,rol_id, id]); // Primero el Estado y luego el ID en la query
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


export const CambiarEstadoPR = async (req, res) => {
  const { id } = req.params;
  const EstadoPr = 'Activo'; // Asignar el valor 'Activo' directamente
    const rol_id = '3'

  // Validación del ID
  if (!id || isNaN(id)) {
    return res.status(400).json({ message: 'El ID es requerido y debe ser un número.' });
  }

  const query = 'UPDATE Usuarios SET EstadoPr = ?, rol_id = ? WHERE id = ?';
  
  try {
    const [results] = await pool.query(query, [EstadoPr,rol_id, id]); // Primero el Estado y luego el ID en la query
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


