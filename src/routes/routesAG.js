import { Router } from "express";
import { crearUsuarioYClinica, deleteClinica, editClinica, getClinica, getClinicaId, LinkCodigoId, postClinica, Tarifas, uploadImages, uploadPdf } from "../controller/AgController.js";
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

export default routerAG;
