import { Integrante } from './integrante.model';
import { ReportData } from './reporte.model';

export interface DashboardData {
    totalMember: number;
    membersBirthdays: Integrante[];
    totalBaptisms: number;
    lastWeekReport: ReportData[];
}
