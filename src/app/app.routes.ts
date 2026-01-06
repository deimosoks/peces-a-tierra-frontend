import { Routes } from '@angular/router';
import { Integrantes } from './features/integrantes/integrantes';
import { Asistencia } from './features/asistencia/asistencia';
import { Reportes } from './features/reportes/reportes';

export const routes: Routes = [
    { path: '', redirectTo: 'integrantes', pathMatch: 'full' },
    { path: 'integrantes', component: Integrantes },
    { path: 'asistencia', component: Asistencia },
    { path: 'reportes', component: Reportes },
    { path: 'dashboard', redirectTo: 'integrantes' },
];
