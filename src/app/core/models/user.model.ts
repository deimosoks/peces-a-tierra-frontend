import { Integrante } from './integrante.model';
import { Role } from './role.model';

export interface User {
    id: string;
    username: string;
    active: boolean;
    createdAt: string;
    updateAt?: string;
    memberResponseDto: Integrante;
    roles: Role[];
}

export interface UserRequestDto {
    memberId: string;
    username: string;
    password?: string; // Optional for update if not changing
    rolesId: string[];
}

export interface UserStats {
    totalUsers: number;
    totalUsersActives: number;
}

export interface UserPagesResponseDto {
    users: User[];
    pages: number;
}
