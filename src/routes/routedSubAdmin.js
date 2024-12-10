import { Router } from "express";
import { Afiliador, CambiarEstadosFam, GenCode, GetFamiliares, getGananciaTotalGeneral, GetPaginaHome, GetSubAdmin, GetSubAdministrador, Password } from "../controller/SubAdminController.js";
import { verificarToken } from "../controller/UserController.js";


const SubRoutes=Router();

SubRoutes.get('/GetSubAdmin/:id',verificarToken,GetSubAdmin);
SubRoutes.get('/GetSubAdministrador/:id',verificarToken,GetSubAdministrador);
SubRoutes.get('/GetPagHome',verificarToken,GetPaginaHome)
SubRoutes.put('/Afiliador/:id',verificarToken,Afiliador)
SubRoutes.put('/NewPasword/:id',verificarToken,Password)
SubRoutes.post('/CodeGenered/:id',verificarToken,GenCode)
SubRoutes.get('/GanaciaTotal/:id',verificarToken,getGananciaTotalGeneral)
SubRoutes.get('/GetFamiliaresGeneral',verificarToken,GetFamiliares)
SubRoutes.put('/CambioEstadoFam/:id',verificarToken,CambiarEstadosFam)

export default SubRoutes;
