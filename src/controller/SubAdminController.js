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
        
        const IsoTipoQuery = 'SELECT id, IsoTipo,nombre,direccion,telefonos FROM Clinicas WHERE IsoTipo IS NOT NULL';
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


