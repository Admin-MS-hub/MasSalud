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
        const query = 'SELECT id, dni, nombres, apellidos, telefono, fotoPerfil, correo, contraseña, fechNac, direccion FROM Usuarios WHERE rol_id = 5 AND clinica_id = ?';
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

