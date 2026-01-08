import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../config/api.config';
import { DashboardData } from '../models/dashboard.model';

@Injectable({
    providedIn: 'root'
})
export class DashboardService {
    private http = inject(HttpClient);
    private baseUrl = `${API_CONFIG.baseUrl}/dashboards`;

    getDashboardData(): Observable<DashboardData> {
        return this.http.post<DashboardData>(this.baseUrl, {});
    }
}
