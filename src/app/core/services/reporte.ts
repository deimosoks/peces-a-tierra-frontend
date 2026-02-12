import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ReportFilters, ReportData } from '../models/reporte.model';
import { API_CONFIG } from '../config/api.config';

@Injectable({
    providedIn: 'root'
})
export class ReporteService {
    private http = inject(HttpClient);
    private baseUrl = `${API_CONFIG.baseUrl}/reports`;
    
    // Cache for persistence
    lastReportData: ReportData[] | null = null;
    lastFilters: any | null = null;
    lastStats: any | null = null;
    lastMemberSelection: { id: string, name: string } | null = null;

    generateReport(filters: ReportFilters): Observable<ReportData[]> {
        return this.http.post<ReportData[]>(this.baseUrl, filters);
    }
}
