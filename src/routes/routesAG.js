import { Router } from "express";
import { cambiarContrasena, crearUsuarioYClinica, deleteClinica, editClinica, enviarCodigoCorreo, getClinica, getClinicaId, LinkCodigoId, postClinica, solicitarRecuperacionCuenta, Tarifas, uploadImages, uploadPdf, verificarCodigo, verificarCodigoRecuperacion } from "../controller/AgController.js";
import { upload, verificarToken } from "../controller/UserController.js";

const routerAG = Router();

routerAG.get('/listaClinicas',verificarToken,getClinica);

routerAG.post('/CreateClinica',verificarToken, postClinica)

routerAG.put('/editClinica/:id',verificarToken, editClinica)

routerAG.delete('/deleteclinica/:id',verificarToken, deleteClinica)

routerAG.post('/Clinica/:id/SubirImagenes', verificarToken, upload.fields([
    { name: 'ImagoTipo', maxCount: 1 },  // Imagen de perfil
    { name: 'IsoTipo', maxCount: 1 }     // Imagen tipo
]), uploadImages);

routerAG.post('/tarifario/:clinicaId', uploadPdf.single('file'),Tarifas)

routerAG.post('/crearUsuarioYClinica',verificarToken, crearUsuarioYClinica)

routerAG.get('/getClinicaId/:id',verificarToken,getClinicaId)

routerAG.get('/LinkCodigo/:id', verificarToken,LinkCodigoId)

// Ruta para enviar el código
routerAG.post('/enviar-codigo', verificarToken, enviarCodigoCorreo);

// Ruta para verificar el código
routerAG.post('/verificar-codigo', verificarToken, verificarCodigo);

// Ruta para solicitar la recuperación de cuenta
routerAG.post('/solicitar-recuperacion', solicitarRecuperacionCuenta);

// Ruta para verificar el código de recuperación
routerAG.post('/verificar-codigo-recuperacion', verificarCodigoRecuperacion);

// Ruta para cambiar la contraseña
routerAG.post('/cambiar-contrasena', cambiarContrasena);

export default routerAG;
