import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { API_CONFIG } from '../config/api.config';
import { User, UserPagesResponseDto } from '../models/user.model';

@Injectable({
    providedIn: 'root'
})
export class UserService {
    private http = inject(HttpClient);
    private baseUrl = `${API_CONFIG.baseUrl}/users`;

    getUsers(page: number = 0, size: number = 10, search: string = ''): Observable<UserPagesResponseDto> {
        let params = new HttpParams()
            .set('page', page.toString())
            .set('size', size.toString());

        if (search) {
            params = params.set('search', search);
        }

        return this.http.get<UserPagesResponseDto>(this.baseUrl, { params });
    }

    getUserById(id: string): Observable<User> {
        return this.http.get<User>(`${this.baseUrl}/${id}`);
    }

    createUser(user: Partial<User>): Observable<User> {
        return this.http.post<User>(this.baseUrl, user);
    }

    updateUser(id: string, user: Partial<User>): Observable<User> {
        return this.http.put<User>(`${this.baseUrl}/${id}`, user);
    }

    deleteUser(id: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/${id}`);
    }

    toggleUserStatus(id: string, active: boolean): Observable<User> {
        return this.http.patch<User>(`${this.baseUrl}/${id}/status`, { active });
    }
}
