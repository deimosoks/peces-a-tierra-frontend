import { Integrante } from './integrante.model';

export interface LoginRequest {
    username: string;
    password: string;
}

export interface AccessTokenDto {
    token: string;
    expiredAt: string;
}

export interface RefreshTokenDto {
    token: string;
    expiresAt: string;
}

export interface LoginResponse {
    accessTokenDto: AccessTokenDto;
    refreshTokenDto: RefreshTokenDto;
}

export interface UserInfo {
    username: string;
    pictureProfileUrl: string;
    completeName: string;
    permissions: string[]; // Set<String> comes as array in JSON
    branchId?: string; // Added branchId
    memberResponseDto?: Integrante; // Added memberResponseDto
}

export interface RefreshTokenRequest {
    refreshToken: string;
}

// Permission constants
export enum Permission {
    ADMINISTRATOR = 'ADMINISTRATOR',
    VIEW_MEMBERS_PANEL = 'VIEW_MEMBERS_PANEL',
    MEMBER_CREATE = 'MEMBER_CREATE',
    MEMBER_EDIT = 'MEMBER_EDIT',
    MEMBER_DELETE = 'MEMBER_DELETE',
    MEMBER_TOGGLE_STATUS = 'MEMBER_TOGGLE_STATUS',
    VIEW_USERS_PANEL = 'VIEW_USERS_PANEL',
    USER_CREATE = 'USER_CREATE',
    USER_EDIT = 'USER_EDIT',
    USER_DELETE = 'USER_DELETE',
    USER_TOGGLE_STATUS = 'USER_TOGGLE_STATUS',
    VIEW_BAPTISM_PANEL = 'VIEW_BAPTISM_PANEL',
    BAPTISM_CREATE = 'BAPTISM_CREATE',
    BAPTISM_INVALIDATE = 'BAPTISM_INVALIDATE'
}
export interface ChanggePasswordRequest {
    oldPassword: string;
    password: string;
    confirmPassword: string;
}
