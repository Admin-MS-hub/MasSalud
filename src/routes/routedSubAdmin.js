import { Router } from "express";
import { Afiliador, GetPaginaHome, GetSubAdmin, GetSubAdministrador } from "../controller/SubAdminController.js";
import { verificarToken } from "../controller/UserController.js";

const SubRoutes=Router();

SubRoutes.get('/GetSubAdmin/:id',verificarToken,GetSubAdmin);
SubRoutes.get('/GetSubAdministrador/:id',verificarToken,GetSubAdministrador);
SubRoutes.get('/GetPagHome',GetPaginaHome)
SubRoutes.put('/Afiliador/:id',verificarToken,Afiliador)

export default SubRoutes;
