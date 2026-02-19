import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../config/api.config';
import { ServiceEventRequestDto, ServiceEventResponseDto, ServiceEventsFilterRequestDto, ServiceEventPagesResponseDto } from '../models/service-event.model';

@Injectable({
    providedIn: 'root'
})
export class ServiceEventService {
    private http = inject(HttpClient);
    private baseUrl = `${API_CONFIG.baseUrl}/services-events`;

    findAll(filter?: ServiceEventsFilterRequestDto): Observable<ServiceEventResponseDto[]> {
        return this.http.post<ServiceEventResponseDto[]>(`${this.baseUrl}/calendar`, filter);
    }

    getActiveEvent(): Observable<ServiceEventResponseDto[]> {
        return this.http.get<ServiceEventResponseDto[]>(`${this.baseUrl}/active`);
    }

    create(event: ServiceEventRequestDto): Observable<ServiceEventResponseDto> {
        return this.http.post<ServiceEventResponseDto>(this.baseUrl, event);
    }

    cancelEvent(id: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/${id}`);
    }
}
