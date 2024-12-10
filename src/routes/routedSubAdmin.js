import { Router } from "express";
import { Afiliador, CambiarEstadosFam, GenCode, GetFamiliares, GetFamiliaresActivos, getGananciaTotalGeneral, GetPaginaHome, GetSubAdmin, GetSubAdministrador, Password } from "../controller/SubAdminController.js";
import { verificarToken } from "../controller/UserController.js";


const SubRoutes=Router();

SubRoutes.get('/GetSubAdmin/:id',verificarToken,GetSubAdmin);
SubRoutes.get('/GetSubAdministrador/:id',verificarToken,GetSubAdministrador);
SubRoutes.get('/GetPagHome',GetPaginaHome)
SubRoutes.put('/Afiliador/:id',verificarToken,Afiliador)
SubRoutes.put('/NewPasword/:id',verificarToken,Password)
SubRoutes.post('/CodeGenered/:id',GenCode)
SubRoutes.get('/GanaciaTotal',verificarToken,getGananciaTotalGeneral)
SubRoutes.get('/GetFamiliaresGeneral',verificarToken,GetFamiliares)
SubRoutes.put('/CambioEstadoFam/:id',verificarToken,CambiarEstadosFam)
SubRoutes.get('/FamiliaresActivos',verificarToken,GetFamiliaresActivos)

export default SubRoutes;
