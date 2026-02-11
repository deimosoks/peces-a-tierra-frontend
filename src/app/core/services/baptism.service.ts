import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../config/api.config';
import {
  BaptismRequestDto,
  BaptismResponseDto,
  BaptismFilterRequestDto,
  BaptismPagesResponseDto,
  BaptismInvalidRequestDto
} from '../models/baptism.model';

@Injectable({
  providedIn: 'root'
})
export class BaptismService {
  private apiUrl = `${API_CONFIG.baseUrl}/baptisms`;

  constructor(private http: HttpClient) {}

  create(baptismData: BaptismRequestDto): Observable<BaptismResponseDto> {
    const formData = new FormData();
    formData.append('memberId', baptismData.memberId);
    formData.append('date', baptismData.date.toISOString().split('T')[0]);
    
    if (baptismData.imageUrl) {
      formData.append('imageUrl', baptismData.imageUrl);
    }
    
    if (baptismData.note) {
      formData.append('note', baptismData.note);
    }
    
    if (baptismData.address) formData.append('address', baptismData.address);
    if (baptismData.neighborhood) formData.append('neighborhood', baptismData.neighborhood);
    if (baptismData.city) formData.append('city', baptismData.city);
    if (baptismData.municipality) formData.append('municipality', baptismData.municipality);
    if (baptismData.district) formData.append('district', baptismData.district);
    if (baptismData.postalCode) formData.append('postalCode', baptismData.postalCode);
    if (baptismData.latitude) formData.append('latitude', baptismData.latitude);
    if (baptismData.longitude) formData.append('longitude', baptismData.longitude);

    return this.http.post<BaptismResponseDto>(this.apiUrl, formData);
  }

  search(filterRequest: BaptismFilterRequestDto, page: number): Observable<BaptismPagesResponseDto> {
    const params = new HttpParams().set('page', page.toString());
    return this.http.post<BaptismPagesResponseDto>(`${this.apiUrl}/search`, filterRequest, { params });
  }

  invalidate(invalidRequest: BaptismInvalidRequestDto): Observable<BaptismResponseDto> {
    return this.http.post<BaptismResponseDto>(`${this.apiUrl}/invalidate`, invalidRequest);
  }
}
