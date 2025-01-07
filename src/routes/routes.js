import { Router } from "express";
import {
    deleteUsuario, editUsuarioId, getUsuario, loginUsuario, postRol, crearUsuario, getUsuariosId, getUsuarioById,
    getAfiliadosPorUsuarioId, getUsuarioDatosId, FotoPerfil, upload, GetAfiliadorAfiliadores, verificarToken, crearUsuarioCode,
    refreshToken,me,logoutUsuario,
    Notificaciones
} from "../controller/UserController.js";

const router = Router();

// Crear un nuevo usuario
router.post('/CreateUsuario', verificarToken, crearUsuario);

// Obtener lista de usuarios
router.get('/list', verificarToken, getUsuario);

// Obtener usuario por ID
router.get('/user', verificarToken, getUsuariosId);

router.get('/user/:id', verificarToken, getUsuarioDatosId);

// Editar usuario por ID
router.put('/user/edit/:id', verificarToken, editUsuarioId);

// Eliminar usuario por ID
router.delete('/user/delete/:id', verificarToken, deleteUsuario);

// Ruta para login
router.post('/login', loginUsuario);

router.get('/usuarios/:id', verificarToken, getUsuarioById)

router.post('/roles', verificarToken, postRol);;

router.put('/CambioRol/:id', verificarToken, getAfiliadosPorUsuarioId);

router.post('/Usuario/:id/uploadProfileImage', verificarToken, upload.single('image'), FotoPerfil);

router.get('/afiliadores-afiliados', verificarToken, GetAfiliadorAfiliadores);

router.get('/notificaciones/:usuarioId', verificarToken,Notificaciones)

router.post('/UserCode', crearUsuarioCode)
router.post('/refresh-token',refreshToken)
router.get("/me",verificarToken,me)
router.post("/logout",verificarToken,logoutUsuario)

export default router;
