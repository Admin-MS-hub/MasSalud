import { Router } from "express";
import { crearUsuarioYClinica, deleteClinica, editClinica, getClinica, GetIsoTipo, postClinica, uploadImages } from "../controller/AgController.js";
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

routerAG.get('/clinicas/isotipos',verificarToken, GetIsoTipo)

routerAG.post('/crearUsuarioYClinica', crearUsuarioYClinica)

export default routerAG;
