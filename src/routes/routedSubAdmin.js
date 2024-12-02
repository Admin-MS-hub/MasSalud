import { Router } from "express";
import { Afiliador, GenCode, GetPaginaHome, GetSubAdmin, GetSubAdministrador, Password } from "../controller/SubAdminController.js";
import { verificarToken } from "../controller/UserController.js";

const SubRoutes=Router();

SubRoutes.get('/GetSubAdmin/:id',verificarToken,GetSubAdmin);
SubRoutes.get('/GetSubAdministrador/:id',verificarToken,GetSubAdministrador);
SubRoutes.get('/GetPagHome',GetPaginaHome)
SubRoutes.put('/Afiliador/:id',verificarToken,Afiliador)
SubRoutes.put('/NewPasword/:id',Password)
SubRoutes.post('/CodeGenered/:id',verificarToken,GenCode)

export default SubRoutes;
