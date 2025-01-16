import pool from "../database.js";
import multer from "multer";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from "url";
import nodemailer from "nodemailer"

const __dirname = path.dirname(fileURLToPath(import.meta.url));
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

  export const getClinicaId = async (req, res) => {
    const {id} = req.params;
    const query = 'SELECT * FROM Clinicas WHERE id = ?';
  
    try {
      const [results] = await pool.query(query,[id]);
      res.status(200).json(results[0]);
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
    // 1. Verificar si el DNI ya está registrado
    const [dniExistente] = await connection.query('SELECT * FROM Usuarios WHERE dni = ?', [dni]);

    if (dniExistente.length > 0) {
      return res.status(400).json({ message: 'El DNI ya está registrado.' });
    }

    await connection.beginTransaction();

    // 2. Insertar la clínica
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

    // 3. Insertar el usuario
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
      clinicaId: clinicaId, // Corregir esto para que sea el ID de la clínica
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
        const { id } = req.params; // ID de la clínica desde los parámetros
        const { ImagoTipo, IsoTipo } = req.files; // Obtener ambos archivos

        // Validar que ambas imágenes estén presentes
        if (!ImagoTipo || !IsoTipo) {
            return res.status(400).json({ message: 'Faltan imágenes para cargar.' });
        }

        // Obtener las nuevas rutas de las imágenes
        const newImagePathImagoTipo = ImagoTipo[0].filename;
        const newImagePathIsoTipo = IsoTipo[0].filename;

        // Obtener las rutas actuales de las imágenes desde la base de datos
        const queryGetImages = `
            SELECT ImagoTipo, IsoTipo 
            FROM Clinicas 
            WHERE Id = ?
        `;
        const [rows] = await pool.query(queryGetImages, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Clínica no encontrada' });
        }

        const { ImagoTipo: currentImagoTipo, IsoTipo: currentIsoTipo } = rows[0];

        // Eliminar las imágenes anteriores si existen
        const deleteImage = (imagePath) => {
            if (imagePath) {
                const fullPath = path.join('uploads', imagePath);
                if (fs.existsSync(fullPath)) {
                    fs.unlinkSync(fullPath); // Eliminar el archivo del sistema
                }
            }
        };

        deleteImage(currentImagoTipo);
        deleteImage(currentIsoTipo);

        // Actualizar la base de datos con las nuevas imágenes
        const queryUpdateImages = `
            UPDATE Clinicas 
            SET ImagoTipo = ?, IsoTipo = ? 
            WHERE Id = ?
        `;
        const [result] = await pool.query(queryUpdateImages, [newImagePathImagoTipo, newImagePathIsoTipo, id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Clínica no encontrada' });
        }

        res.status(201).json({
            message: 'Imágenes subidas y actualizadas con éxito',
            ImagoTipo: newImagePathImagoTipo,
            IsoTipo: newImagePathIsoTipo
        });
    } catch (err) {
        console.error("Error al actualizar las imágenes:", err);
        res.status(500).send("Error al actualizar las imágenes");
    }
};

const uploadFile = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../../FilePdf");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir); // Crear directorio si no existe
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const fileName = `${Date.now()}_${file.originalname}`;
    cb(null, fileName);
  },
});

// Configuración de Multer
export const uploadPdf = multer({ storage: uploadFile });

export const Tarifas = async (req, res) => {
  try {
    // Verificar si se subió un archivo
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const clinicaId = req.params.clinicaId;

    // Construir la ruta del archivo
    const filePath = path.join("FilePdf", req.file.filename).replace(/\\/g, "/");

    // Actualizar la columna 'tarifario' con la ruta del archivo en la base de datos
    const query = "UPDATE Clinicas SET tarifario = ? WHERE id = ?";
    const [results]= await pool.query(query, [filePath, clinicaId]);

    if (results.affectedRows === 0) {
      return res.status(404).json({ message: "Clinic not found" });
    }
    return res.status(200).json({
      message: "File uploaded and tarifario updated successfully",
      filePath: filePath,
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    res.status(500).json({
      message: "An unexpected error occurred while processing the request",
      error: error.message,
    });
  }
};

export const LinkCodigoId = async (req, res) => {
  const { id } = req.params;
  const query = 'SELECT codigo FROM Usuarios WHERE id = ?';
  
  try {
    const [results] = await pool.query(query, [id]);

    // Asegurarse de que haya resultados
    if (results.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const codigo = results[0].codigo; // Obtener el código del usuario
    const Link = `https://massalud.org.pe/Register?ref=${codigo}`;
    
    res.status(200).json({ link: Link }); // Enviar el link en la respuesta
  } catch (err) {
    console.error('Error al obtener el código:', err);
    res.status(500).json({ message: 'Error al obtener el código' });
  }
};

const transporter = nodemailer.createTransport({
  service: "Gmail", 
  auth: {
    user: "dgst1704@gmail.com", 
    pass: "kkvw sapm vyzm fcdj", 
  },
  tls: {
    rejectUnauthorized: false, 
  },
});

function generarCodigo() {
  const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let codigo = '';
  for (let i = 0; i < 6; i++) {
    codigo += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
  }
  return codigo;
}

export const enviarCodigoCorreo = async (req, res) => {
  const { usuario_id, destinatario } = req.body; // Asumimos que el destinatario es el correo del usuario

  if (!usuario_id || !destinatario) {
    return res.status(400).json({ error: "Faltan datos: usuario_id o destinatario" });
  }

  // Generar el código de confirmación
  const codigo = generarCodigo();

  // Almacenar el código en la base de datos
  const expiracion = new Date(Date.now() + 24 * 60 * 60 * 1000); // El código expira en 24 horas
  try {
    await pool.query(
      'INSERT INTO ConfirmacionesCorreo (usuario_id, token, expiracion) VALUES (?, ?, ?)',
      [usuario_id, codigo, expiracion]
    );

    // Configuración del correo
    const mailOptions = {
      from: "dgst1704@gmail.com", // Tu dirección de correo
      to: destinatario,            // Correo del destinatario
      subject: "Código de Confirmación", // Asunto
      text: `Tu código de confirmación es: ${codigo}`, // Cuerpo del mensaje
    };

    // Enviar el correo
    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: "Correo enviado correctamente con el código de confirmación" });
  } catch (error) {
    console.error("Error al enviar el correo:", error);
    res.status(500).json({ error: "No se pudo enviar el correo o almacenar el código en la base de datos" });
  }
};

export const verificarCodigo = async (req, res) => {
  const { usuario_id, codigo_ingresado } = req.body; // El código que el usuario ingresa

  if (!usuario_id || !codigo_ingresado) {
    return res.status(400).json({ error: "Faltan datos: usuario_id o codigo_ingresado" });
  }

  try {
    // Buscar el código almacenado en la base de datos
    const [result] = await pool.query(
      'SELECT * FROM ConfirmacionesCorreo WHERE usuario_id = ? AND token = ? AND confirmado = FALSE',
      [usuario_id, codigo_ingresado]
    );

    if (result.length === 0) {
      return res.status(400).json({ error: "Código no válido o ya confirmado" });
    }

    const confirmacion = result[0];

    // Verificar si el código ha expirado
    const now = new Date();
    if (now > new Date(confirmacion.expiracion)) {
      return res.status(400).json({ error: "El código ha expirado" });
    }

    // Marcar el código como confirmado
    await pool.query('UPDATE ConfirmacionesCorreo SET confirmado = TRUE WHERE id = ?', [confirmacion.id]);

    res.status(200).json({ message: "Código confirmado correctamente" });
  } catch (error) {
    console.error("Error al verificar el código:", error);
    res.status(500).json({ error: "No se pudo verificar el código" });
  }
};

export const solicitarRecuperacionCuenta = async (req, res) => {
  const { correo } = req.body;

  if (!correo) {
    return res.status(400).json({ error: "Falta el correo electrónico" });
  }

  try {
    // Verificar si el correo existe en la base de datos
    const [result] = await pool.query('SELECT id FROM Usuarios WHERE correo = ?', [correo]);

    if (result.length === 0) {
      return res.status(404).json({ error: "Correo no encontrado" });
    }

    const usuario_id = result[0].id;

    // Generar un token único para la recuperación
    const token = generarCodigo(); // Un token seguro para la recuperación
    const expiracion = new Date(Date.now() + 15 * 60 * 1000); // El token expira en 15 minutos

    // Almacenar el token de recuperación en la base de datos
    await pool.query(
      'INSERT INTO recuperacionescuenta (usuario_id, token, expiracion) VALUES (?, ?, ?)',
      [usuario_id, token, expiracion]
    );

    // Configuración del correo
    const mailOptions = {
      from: "dgst1704@gmail.com",
      to: correo,
      subject: "Recuperación de cuenta",
      text: `Solicitaste recuperar tu cuenta. Usa el siguiente código para restablecer tu contraseña: ${token}. Este código expirará en 15 minutos.`,
    };

    // Enviar el correo
    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: "Correo enviado con el código de recuperación" });
  } catch (error) {
    console.error("Error al enviar el correo:", error);
    res.status(500).json({ error: "No se pudo enviar el correo o almacenar el token" });
  }
};

export const verificarCodigoRecuperacion = async (req, res) => {
  const { correo, token } = req.body;

  if (!correo || !token) {
    return res.status(400).json({ error: "Faltan datos: correo o token" });
  }

  try {
    // Verificar si el correo existe
    const [result] = await pool.query('SELECT id FROM Usuarios WHERE correo = ?', [correo]);

    if (result.length === 0) {
      return res.status(404).json({ error: "Correo no encontrado" });
    }

    const usuario_id = result[0].id;

    // Buscar el token en la base de datos
    const [tokenResult] = await pool.query(
      'SELECT * FROM recuperacionescuenta WHERE usuario_id = ? AND token = ?',
      [usuario_id, token]
    );

    if (tokenResult.length === 0) {
      return res.status(400).json({ error: "Código de recuperación no válido" });
    }

    const recuperacion = tokenResult[0];

    // Verificar si el token ha expirado
    const now = new Date();
    if (now > new Date(recuperacion.expiracion)) {
      return res.status(400).json({ error: "El código ha expirado" });
    }

    // El código es válido y no ha expirado
    res.status(200).json({ message: "Código de recuperación válido" });
  } catch (error) {
    console.error("Error al verificar el código:", error);
    res.status(500).json({ error: "No se pudo verificar el código" });
  }
};

export const cambiarContrasena = async (req, res) => {
  const { correo, token, nuevaContrasena } = req.body;

  if (!correo || !token || !nuevaContrasena) {
    return res.status(400).json({ error: "Faltan datos: correo, token o nueva contraseña" });
  }

  try {
    // Verificar si el correo existe
    const [result] = await pool.query('SELECT id FROM Usuarios WHERE correo = ?', [correo]);

    if (result.length === 0) {
      return res.status(404).json({ error: "Correo no encontrado" });
    }

    const usuario_id = result[0].id;

    // Buscar el token en la base de datos
    const [tokenResult] = await pool.query(
      'SELECT * FROM recuperacionescuenta WHERE usuario_id = ? AND token = ?',
      [usuario_id, token]
    );

    if (tokenResult.length === 0) {
      return res.status(400).json({ error: "Código de recuperación no válido" });
    }

    const recuperacion = tokenResult[0];

    // Verificar si el token ha expirado
    const now = new Date();
    if (now > new Date(recuperacion.expiracion)) {
      return res.status(400).json({ error: "El código ha expirado" });
    }

    // Actualizar la contraseña en la base de datos sin encriptar
    await pool.query('UPDATE Usuarios SET contraseña = ? WHERE id = ?', [nuevaContrasena, usuario_id]);

    // Eliminar el token de recuperación ya que ya se usó
    await pool.query('DELETE FROM recuperacionescuenta WHERE id = ?', [recuperacion.id]);

    res.status(200).json({ message: "Contraseña actualizada correctamente" });
  } catch (error) {
    console.error("Error al cambiar la contraseña:", error);
    res.status(500).json({ error: "No se pudo cambiar la contraseña" });
  }
};