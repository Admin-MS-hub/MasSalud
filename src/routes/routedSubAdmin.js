import { Router } from "express";
import { Afiliador, CambiarEstadosFam, GetFamiliares, GetFamiliaresActivos, getGananciaTotalGeneral, GetPaginaHome, GetSubAdmin, GetSubAdministrador, Password, SolicitudPromotor, SolicitudUsuario } from "../controller/SubAdminController.js";
import { verificarToken } from "../controller/UserController.js";


const SubRoutes=Router();

SubRoutes.get('/GetSubAdmin/:id',verificarToken,GetSubAdmin);
SubRoutes.get('/GetSubAdministrador/:id',verificarToken,GetSubAdministrador);
SubRoutes.get('/GetPagHome',GetPaginaHome)
SubRoutes.put('/Afiliador/:id',verificarToken,Afiliador)
SubRoutes.put('/NewPasword/:id',verificarToken,Password)
SubRoutes.post('/SolicitudPromotor/:id',SolicitudUsuario)
SubRoutes.post('/SolicitudPromotor/:id',SolicitudPromotor)
SubRoutes.get('/GanaciaTotal',verificarToken,getGananciaTotalGeneral)
SubRoutes.get('/GetFamiliaresGeneral',verificarToken,GetFamiliares)
SubRoutes.put('/CambioEstadoFam/:id',verificarToken,CambiarEstadosFam)
SubRoutes.get('/FamiliaresActivos',verificarToken,GetFamiliaresActivos)

export default SubRoutes;
