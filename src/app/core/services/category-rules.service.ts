import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../config/api.config';
import { CategoryRulesRequestDto, CategoryRulesResponseDto } from '../models/category-rule.model';

@Injectable({
  providedIn: 'root'
})
export class CategoryRulesService {
  private http = inject(HttpClient);
  private baseUrl = `${API_CONFIG.baseUrl}/category-rules`;

  findAll(): Observable<CategoryRulesResponseDto[]> {
    return this.http.get<CategoryRulesResponseDto[]>(this.baseUrl);
  }

  create(dto: CategoryRulesRequestDto): Observable<CategoryRulesResponseDto> {
    return this.http.post<CategoryRulesResponseDto>(this.baseUrl, dto);
  }

  update(id: string, dto: CategoryRulesRequestDto): Observable<CategoryRulesResponseDto> {
    return this.http.put<CategoryRulesResponseDto>(`${this.baseUrl}/${id}`, dto);
  }

  updateActive(categoryRuleId: string, state: boolean): Observable<boolean> {
    return this.http.patch<boolean>(`${this.baseUrl}/${categoryRuleId}?state=${state}`, {});
  }

  delete(categoryRuleId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${categoryRuleId}`);
  }
}
