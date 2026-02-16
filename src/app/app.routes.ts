import { Routes } from '@angular/router';
import { Integrantes } from './features/integrantes/integrantes';
import { Asistencia } from './features/asistencia/asistencia';
import { AdministrarAsistencias } from './features/asistencia/administrar-asistencias';
import { Reportes } from './features/reportes/reportes';
import { Bautismos } from './features/bautismos/bautismos';
import { Configuracion } from './features/configuracion/configuracion';

import { Dashboard } from './features/dashboard/dashboard';
import { Roles } from './features/roles/roles';
import { Login } from './features/login/login';
import { Usuarios } from './features/usuarios/usuarios';
import { Servicios } from './features/servicios/servicios';

import { authGuard } from './core/guards/auth.guard';
import { permissionRedirectGuard } from './core/guards/permission-redirect.guard';
import { permissionGuard } from './core/guards/permission.guard';
import { MainLayout } from './layout/main-layout/main-layout';

export const routes: Routes = [
    //TODO: cambiar logica de redireccionamiento de rutas vacias, cuando leas esto tenes que cambiar
    //TODO: la logica de redireccionamiento de rutas vacias 
    {path: '', redirectTo: 'dashboard', pathMatch: 'full'},
    { path: 'login', component: Login },
    {
        path: '',
        component: MainLayout,
        canActivate: [authGuard],
        children: [
            { path: 'dashboard', component: Dashboard, canActivate: [permissionGuard], data: { permission: 'MANAGE_DASHBOARD' } },
            { path: 'integrantes', component: Integrantes, canActivate: [permissionGuard], data: { permission: 'VIEW_MEMBER_PANEL' } },
            { path: 'bautismos', component: Bautismos, canActivate: [permissionGuard], data: { permission: 'VIEW_BAPTISM_PANEL' } },
            { path: 'asistencia', component: Asistencia, canActivate: [permissionGuard], data: { permission: 'REGISTER_ATTENDANCE' } },
            { path: 'asistencias/administrar', component: AdministrarAsistencias, canActivate: [permissionGuard], data: { permission: 'MANAGE_ATTENDANCE' } },
            { path: 'reportes', component: Reportes, canActivate: [permissionGuard], data: { permission: 'MANAGE_REPORT' } },
            { path: 'usuarios', component: Usuarios, canActivate: [permissionGuard], data: { permission: 'VIEW_USER_PANEL' } },
            { path: 'servicios', component: Servicios, canActivate: [permissionGuard], data: { permission: 'VIEW_SERVICE_PANEL' } },
            { path: 'sedes', loadComponent: () => import('./features/sedes/sedes').then(m => m.Sedes), canActivate: [permissionGuard], data: { permission: 'VIEW_BRANCH_PANEL' } },
            { path: 'eventos', loadComponent: () => import('./features/eventos/eventos').then(m => m.Eventos), canActivate: [permissionGuard], data: { permission: 'VIEW_EVENTS_PANEL' } },
            { path: 'roles', component: Roles, canActivate: [permissionGuard], data: { permission: 'VIEW_ROLE_PANEL' } },
            { path: 'configuracion', component: Configuracion, canActivate: [permissionGuard], data: { permission: 'ADMINISTRATOR' } },
        ]
    },
    { path: '**', canActivate: [permissionRedirectGuard], component: MainLayout } // Component doesn't matter, guard redirects
];
