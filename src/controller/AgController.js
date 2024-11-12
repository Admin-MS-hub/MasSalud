import pool from "../database.js";

export const getClinica = async (req, res) => {
    const query = 'SELECT * FROM Clinicas';
  
    try {
      const [results] = await pool.query(query);
      res.status(200).json(results);
    } catch (err) {
      console.error('Error al obtener las clínicas:', err);
      res.status(500).json({ message: 'Error al obtener las clínicas' });
    }
  };
  
export const postClinica = async (req, res) => {
  try {
      const { nombre, direccion, ruc, ubicacion, telefonos, ImagoTipo, IsoTipo } = req.body;

      // Validación de campos requeridos
      if (!nombre || typeof nombre !== 'string' || nombre.trim().length === 0) {
          return res.status(400).json({ error: 'El campo "nombre" es requerido y debe ser una cadena válida.' });
      }
      if (!ruc || typeof ruc !== 'string' || ruc.trim().length === 0) {
          return res.status(400).json({ error: 'El campo "ruc" es requerido y debe ser una cadena válida.' });
      }
      if (!ubicacion || typeof ubicacion !== 'string' || ubicacion.trim().length === 0) {
          return res.status(400).json({ error: 'El campo "ubicacion" es requerido y debe ser una cadena válida.' });
      }
      if (telefonos && (typeof telefonos !== 'string' || isNaN(telefonos))) {
          return res.status(400).json({ error: 'El campo "telefonos" debe ser un número válido.' });
      }
      // Validación de longitud o formato
      if (nombre.length > 100) {
          return res.status(400).json({ error: 'El campo "nombre" no puede exceder los 100 caracteres.' });
      }
      if (direccion && direccion.length > 255) {
          return res.status(400).json({ error: 'El campo "direccion" no puede exceder los 255 caracteres.' });
      }
      if (ruc.length > 20) {
          return res.status(400).json({ error: 'El campo "ruc" no puede exceder los 20 caracteres.' });
      }
      if (ubicacion.length > 255) {
          return res.status(400).json({ error: 'El campo "ubicacion" no puede exceder los 255 caracteres.' });
      }
      if (telefonos && (telefonos.length < 9 || telefonos.length > 9)) { // Suponiendo que el número de teléfono debe tener 9 dígitos
          return res.status(400).json({ error: 'El campo "telefonos" debe ser un número válido de 9 dígitos.' });
      }

      // Verifica si el RUC ya existe
      const checkRucSql = 'SELECT * FROM Clinicas WHERE ruc = ?';
      const [existingClinica] = await pool.query(checkRucSql, [ruc]);

      if (existingClinica.length > 0) {
          return res.status(400).json({ error: 'El RUC ya existe. Por favor, use uno diferente.' });
      }
      
      // Inserta los datos en la base de datos
      const sql = 'INSERT INTO Clinicas (nombre, direccion, ruc, ubicacion, telefonos, ImagoTipo, IsoTipo) VALUES (?, ?, ?, ?, ?, ?, ?)';
      const [results] = await pool.query(sql, [nombre, direccion, ruc, ubicacion, telefonos, ImagoTipo, IsoTipo]);
      res.status(201).json({ id: results.insertId, message: 'Clínica agregada exitosamente' });
  } catch (error) {
      console.error('Error insertando datos:', error);
      return res.status(500).json({ error: 'Error insertando datos' });
  }
};

export const crearUsuarioYClinica = async (req, res) => {
  const {
    correo,
    contraseña,
    nombres,
    apellidos,
    dni,
    estado_civil,
    rol_id,
    clinica,
    fechNac,
    telefono,
    direccion,
  } = req.body;

  // Validación de campos requeridos para el usuario y la clínica
  if (
    !correo ||
    !contraseña ||
    !nombres ||
    !apellidos ||
    !dni ||
    !fechNac ||
    !clinica.nombre ||
    !clinica.ruc ||
    !clinica.ubicacion
  ) {
    return res.status(400).json({
      message: 'Faltan datos obligatorios. Asegúrate de incluir todos los campos.',
    });
  }

  // Validación del correo electrónico
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(correo)) {
    return res.status(400).json({ message: 'El correo electrónico no es válido.' });
  }

  // Validación del DNI (8 dígitos)
  if (!/^\d{8}$/.test(dni)) {
    return res.status(400).json({ message: 'El DNI debe tener exactamente 8 dígitos.' });
  }

  // Validaciones de los campos de la clínica
  const { nombre: clinicaNombre, direccion: clinicaDireccion, ruc, ubicacion, telefonos} = clinica;

  if (clinicaNombre.length > 100) {
    return res.status(400).json({ message: 'El nombre de la clínica no puede exceder los 100 caracteres.' });
  }
  if (ruc.length !== 11 || !/^\d{11}$/.test(ruc)) {
    return res.status(400).json({ message: 'El RUC de la clínica debe tener exactamente 11 dígitos.' });
  }
  if (ubicacion.length > 255) {
    return res.status(400).json({ message: 'La ubicación de la clínica no puede exceder los 255 caracteres.' });
  }

  // Validación de teléfono de la clínica (si existe)
  if (telefonos && (!/^\d{7,15}$/.test(telefonos))) {
    return res.status(400).json({ message: 'El teléfono de la clínica debe ser un número válido.' });
  }

  // Validación de teléfono del usuario (opcional pero válido si existe)
  if (telefono && (!/^\d{7,15}$/.test(telefono))) {
    return res.status(400).json({ message: 'El teléfono del usuario debe ser un número válido.' });
  }

  // Iniciar transacción
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Insertar la clínica
    const clinicaSql = `
      INSERT INTO Clinicas (nombre, direccion, ruc, ubicacion, telefonos)
      VALUES (?, ?, ?, ?, ?)`;
    const [clinicaResult] = await connection.query(clinicaSql, [
      clinicaNombre,
      clinicaDireccion,
      ruc,
      ubicacion,
      telefonos,
    ]);

    // Obtenemos el ID de la clínica insertada
    const clinicaId = clinicaResult.insertId;

    // 2. Insertar el usuario
    const query = `
      INSERT INTO Usuarios (correo, contraseña, nombres, apellidos, dni, estado_civil, rol_id, clinica_id, fechNac, telefono, direccion)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const [usuarioResult] = await connection.query(query, [
      correo,
      contraseña,
      nombres,
      apellidos,
      dni,
      estado_civil,
      rol_id,
      clinicaId, // Asignar la clínica creada
      fechNac,
      telefono,
      direccion,
    ]);

    // Si todo salió bien, hacer commit
    await connection.commit();

    res.status(201).json({
      success: true,
      message: 'Usuario y clínica creados con éxito.',
      usuarioId: usuarioResult.insertId,
      clinicaId: usuarioResult,
    });
  } catch (err) {
    // Si ocurre un error, hacer rollback
    await connection.rollback();
    console.error('Error al crear usuario y clínica:', err);
    res.status(500).json({ success: false, message: 'Error al crear usuario y clínica.' });
  } finally {
    // Liberar la conexión
    connection.release();
  }
};



  export const editClinica = async (req, res) => {
    const { id } = req.params;
    const { nombre, direccion, ruc, ubicacion, telefonos } = req.body;
  
    // Validaciones básicas
    if (!id || isNaN(id)) {
      return res.status(400).json({ message: 'El ID es requerido y debe ser un número.' });
    }
  
    if (nombre && (typeof nombre !== 'string' || nombre.length > 100)) {
      return res.status(400).json({ message: 'El nombre debe ser un texto de hasta 100 caracteres.' });
    }
  
    if (direccion && typeof direccion !== 'string') {
      return res.status(400).json({ message: 'La dirección debe ser un texto.' });
    }
  
    if (ruc !== undefined && (isNaN(ruc) || ruc <= 0 || ruc.toString().length > 12)) {
      return res.status(400).json({ message: 'El RUC debe ser un número positivo y no debe exceder 12 dígitos.' });
    }
  
    if (ubicacion && typeof ubicacion !== 'string') {
      return res.status(400).json({ message: 'La ubicación debe ser un texto.' });
    }
  
    if (telefonos !== undefined && (isNaN(telefonos) || telefonos <= 0 || telefonos.toString().length > 10)) {
      return res.status(400).json({ message: 'Los teléfonos deben ser un número positivo y no deben exceder 10 dígitos.' });
    }
  
    const query = `UPDATE Clinicas SET nombre = ?, direccion = ?, ruc = ?, ubicacion = ?, telefonos = ? WHERE id = ?`;
  
    try {
      const [result] = await pool.query(query, [nombre, direccion, ruc, ubicacion, telefonos, id]);
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Clínica no encontrada.' });
      }
  
      res.status(200).json({ message: 'Clínica actualizada con éxito' });
    } catch (err) {
      console.error('Error al actualizar la clínica:', err);
      res.status(500).json({ message: 'Error al actualizar la clínica' });
    }
  };
  
  export const deleteClinica = async (req, res) => {
    const { id } = req.params;
  
    // Validación básica del ID
    if (!id || isNaN(id)) {
      return res.status(400).json({ message: 'El ID es requerido y debe ser un número.' });
    }
  
    const query = `DELETE FROM Clinicas WHERE id = ?`;
  
    try {
      const [result] = await pool.query(query, [id]);
  
      // Verificar si la clínica fue encontrada y eliminada
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Clínica no encontrada.' });
      }
  
      res.status(200).json({ message: 'Clínica eliminada con éxito' });
    } catch (err) {
      console.error('Error al eliminar la clínica:', err);
      res.status(500).json({ message: 'Error al eliminar la clínica' });
    }
  };

  export const uploadImages = async (req, res) => {
    try {
        const { id } = req.params; // Obtener el ID de la clínica desde los parámetros
        const { ImagoTipo, IsoTipo } = req.files; // Obtener ambos archivos

        // Si no se suben ambas imágenes
        if (!ImagoTipo || !IsoTipo) {
            return res.status(400).json({ message: 'Faltan imágenes para cargar.' });
        }

        // Obtener las rutas de las imágenes
        const imagePathImagoTipo = ImagoTipo[0].filename;
        const imagePathIsoTipo = IsoTipo[0].filename;

        // Actualizar la base de datos con las nuevas imágenes
        const query = `
            UPDATE Clinicas 
            SET ImagoTipo = ?, IsoTipo = ? 
            WHERE Id = ?
        `;
        const [result] = await pool.query(query, [imagePathImagoTipo, imagePathIsoTipo, id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Clínica no encontrada' });
        }

        res.status(201).json({
            message: 'Imagenes subidas con éxito',
            fotoPerfil: imagePathImagoTipo,
            fotoTipo: imagePathIsoTipo
        });
    } catch (err) {
        console.error("Error al actualizar las imágenes:", err);
        res.status(500).send("Error al actualizar las imágenes");
    }
};

