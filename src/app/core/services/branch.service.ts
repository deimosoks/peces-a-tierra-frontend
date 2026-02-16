import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../config/api.config';
import { Branch, BranchRequestDto } from '../models/branch.model';

@Injectable({
    providedIn: 'root'
})
export class BranchService {
    private http = inject(HttpClient);
    private baseUrl = `${API_CONFIG.baseUrl}/branches`;

    findAll(): Observable<Branch[]> {
        return this.http.get<Branch[]>(this.baseUrl);
    }

    create(branch: BranchRequestDto): Observable<Branch> {
        return this.http.post<Branch>(this.baseUrl, branch);
    }

    update(id: string, branch: BranchRequestDto): Observable<Branch> {
        return this.http.put<Branch>(`${this.baseUrl}/${id}`, branch);
    }

    delete(id: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/${id}`);
    }
}
