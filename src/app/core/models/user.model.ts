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
    branchName?: string;
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

import { OrderBy } from './pagination.model';

export interface UserFilterRequestDto {
    query?: string;
    branchId?: string;
    orderBy?: OrderBy;
}

