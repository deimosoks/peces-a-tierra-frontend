import { Routes } from '@angular/router';
import { Integrantes } from './features/integrantes/integrantes';
import { Asistencia } from './features/asistencia/asistencia';
import { Reportes } from './features/reportes/reportes';

import { Dashboard } from './features/dashboard/dashboard';
import { Roles } from './features/roles/roles';
import { Login } from './features/login/login';
import { Usuarios } from './features/usuarios/usuarios';

export const routes: Routes = [
    { path: '', redirectTo: 'login', pathMatch: 'full' },
    { path: 'login', component: Login },
    { path: 'dashboard', component: Dashboard },
    { path: 'integrantes', component: Integrantes },
    { path: 'asistencia', component: Asistencia },
    { path: 'reportes', component: Reportes },
    { path: 'roles', component: Roles },
    { path: 'usuarios', component: Usuarios },
];
