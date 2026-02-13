import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../config/api.config';
import { 
  MemberCategoryResponseDto, 
  MemberCategoryRequestDto,
  MemberSubCategoryResponseDto,
  MemberSubCategoryRequestDto,
  MemberTypeResponseDto,
  MemberTypeRequestDto 
} from '../models/member-config.model';

@Injectable({
  providedIn: 'root'
})
export class MemberConfigService {
  private http = inject(HttpClient);
  private baseUrl = API_CONFIG.baseUrl;

  // Category methods
  getCategories(): Observable<MemberCategoryResponseDto[]> {
    return this.http.get<MemberCategoryResponseDto[]>(`${this.baseUrl}/member-category`);
  }

  createCategory(dto: MemberCategoryRequestDto): Observable<MemberCategoryResponseDto> {
    return this.http.post<MemberCategoryResponseDto>(`${this.baseUrl}/member-category`, dto);
  }

  updateCategory(id: string, dto: MemberCategoryRequestDto): Observable<MemberCategoryResponseDto> {
    return this.http.put<MemberCategoryResponseDto>(`${this.baseUrl}/member-category/${id}`, dto);
  }

  deleteCategory(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/member-category/${id}`);
  }

  // Sub-category methods
  createSubCategory(dto: MemberSubCategoryRequestDto): Observable<MemberSubCategoryResponseDto> {
    return this.http.post<MemberSubCategoryResponseDto>(`${this.baseUrl}/member-sub-category`, dto);
  }

  updateSubCategory(id: string, dto: MemberSubCategoryRequestDto): Observable<MemberSubCategoryResponseDto> {
    return this.http.put<MemberSubCategoryResponseDto>(`${this.baseUrl}/member-sub-category/${id}`, dto);
  }

  deleteSubCategory(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/member-sub-category/${id}`);
  }

  // Type methods
  getTypes(): Observable<MemberTypeResponseDto[]> {
    return this.http.get<MemberTypeResponseDto[]>(`${this.baseUrl}/member-type`);
  }

  createType(dto: MemberTypeRequestDto): Observable<MemberTypeResponseDto> {
    return this.http.post<MemberTypeResponseDto>(`${this.baseUrl}/member-type`, dto);
  }

  updateType(id: string, dto: MemberTypeRequestDto): Observable<MemberTypeResponseDto> {
    return this.http.put<MemberTypeResponseDto>(`${this.baseUrl}/member-type/${id}`, dto);
  }

  deleteType(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/member-type/${id}`);
  }
}
