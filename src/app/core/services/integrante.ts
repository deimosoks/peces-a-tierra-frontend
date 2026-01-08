import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Integrante, MemberPagesResponseDto } from '../models/integrante.model';
import { API_CONFIG } from '../config/api.config';

@Injectable({
  providedIn: 'root',
})
export class IntegranteService {
  private http = inject(HttpClient);
  private baseUrl = API_CONFIG.baseUrl;

  getMembers(page: number, onlyActive: boolean): Observable<MemberPagesResponseDto> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('onlyActive', onlyActive.toString());

    return this.http.get<MemberPagesResponseDto>(`${this.baseUrl}/members`, { params });
  }

  searchMembers(query: string, page: number, onlyActive: boolean): Observable<MemberPagesResponseDto> {
    const params = new HttpParams()
      .set('query', query)
      .set('page', page.toString())
      .set('onlyActive', onlyActive.toString());

    return this.http.get<MemberPagesResponseDto>(`${this.baseUrl}/members/query`, { params });
  }

  toggleStatus(id: string, active: boolean): Observable<boolean> {
    const params = new HttpParams().set('active', active.toString());
    return this.http.patch<boolean>(`${this.baseUrl}/members/${id}`, null, { params });
  }

  getMemberById(id: string): Observable<Integrante> {
    return this.http.get<Integrante>(`${this.baseUrl}/members/${id}`);
  }

  // CRUD with FormData for @ModelAttribute and MultipartFile
  addIntegrante(formData: FormData): Observable<Integrante> {
    return this.http.post<Integrante>(`${this.baseUrl}/members`, formData);
  }

  updateIntegrante(id: string, formData: FormData): Observable<Integrante> {
    return this.http.put<Integrante>(`${this.baseUrl}/members/${id}`, formData);
  }

  deleteIntegrante(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/members/${id}`);
  }
}
