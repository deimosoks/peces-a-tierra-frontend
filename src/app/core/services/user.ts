import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../config/api.config';
import { User, UserPagesResponseDto, UserRequestDto, UserStats } from '../models/user.model';

@Injectable({
    providedIn: 'root'
})
export class UserService {
    private http = inject(HttpClient);
    private baseUrl = `${API_CONFIG.baseUrl}/users`;

    getStats(): Observable<UserStats> {
        return this.http.post<UserStats>(`${this.baseUrl}/report`, {});
    }

    getUsers(page: number = 0): Observable<UserPagesResponseDto> {
        const params = new HttpParams().set('page', page.toString());
        return this.http.get<UserPagesResponseDto>(this.baseUrl, { params });
    }

    searchUsers(query: string, page: number = 0): Observable<UserPagesResponseDto> {
        const params = new HttpParams()
            .set('query', query)
            .set('page', page.toString());
        return this.http.get<UserPagesResponseDto>(`${this.baseUrl}`, { params });
    }

    createUser(user: UserRequestDto): Observable<User> {
        return this.http.post<User>(this.baseUrl, user);
    }

    updateUser(id: string, user: UserRequestDto): Observable<User> {
        return this.http.put<User>(`${this.baseUrl}/${id}`, user);
    }

    deleteUser(id: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/${id}`);
    }

    toggleActive(id: string, active: boolean): Observable<boolean> {
        return this.http.patch<boolean>(`${this.baseUrl}/${id}`, null, {
            params: { active: active.toString() }
        });
    }
}
