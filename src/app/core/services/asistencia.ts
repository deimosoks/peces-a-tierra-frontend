import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { IglesiaService, AttendanceCreateDto, AttendanceResponseDto, AttendanceFiltersRequestDto, AttendanceInvalidateDto } from '../models/asistencia.model';
import { PagesResponseDto, ExportResponseDto } from '../models/pagination.model';
import { API_CONFIG } from '../config/api.config';

@Injectable({
  providedIn: 'root',
})
export class AsistenciaService {
  private http = inject(HttpClient);
  private baseUrl = API_CONFIG.baseUrl;

  getServices(onlyActive: boolean = false): Observable<IglesiaService[]> {
    const params = new HttpParams().set('onlyActive', onlyActive.toString());
    return this.http.get<IglesiaService[]>(`${this.baseUrl}/services`, { params });
  }

  addService(service: { name: string; description: string }): Observable<IglesiaService> {
    return this.http.post<IglesiaService>(`${this.baseUrl}/services`, service);
  }

  updateService(id: string, service: { name: string; description: string }): Observable<IglesiaService> {
    return this.http.put<IglesiaService>(`${this.baseUrl}/services/${id}`, service);
  }

  deleteService(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/services/${id}`);
  }

  toggleServiceStatus(id: string, active: boolean): Observable<boolean> {
    const params = new HttpParams().set('active', active.toString());
    return this.http.patch<boolean>(`${this.baseUrl}/services/${id}`, null, { params });
  }

  saveAttendances(attendances: AttendanceCreateDto[]): Observable<any> {
    return this.http.post(`${this.baseUrl}/attendances`, attendances);
  }

  getAttendances(filters: AttendanceFiltersRequestDto, page: number): Observable<PagesResponseDto<AttendanceResponseDto>> {
    const params = new HttpParams().set('page', page.toString());

    // Updated to POST /search to match backend change and support RequestBody
    return this.http.post<PagesResponseDto<AttendanceResponseDto>>(`${this.baseUrl}/attendances/search`, filters, { params });
  }

  invalidateAttendance(dto: AttendanceInvalidateDto): Observable<AttendanceResponseDto> {
    return this.http.patch<AttendanceResponseDto>(`${this.baseUrl}/attendances/invalidate`, dto);
  }

  exportAttendances(filters: AttendanceFiltersRequestDto): Observable<ExportResponseDto<AttendanceResponseDto>> {
    return this.http.post<ExportResponseDto<AttendanceResponseDto>>(`${this.baseUrl}/attendances/export`, filters);
  }
}
