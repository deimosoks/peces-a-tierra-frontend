export interface PermissionResponseDto {
    name: string;
}

export interface PermissionRequestDto {
    name: string;
}

// For internal UI use (mapped from static list)
export interface PermissionDefinition {
    id: string; // Internal ID (e.g. 'VIEW_ROLE_PANEL')
    name: string; // Human readable name
    description: string;
    category: string;
}

export interface Role {
    id: string;
    name: string;
    color: string;
    description: string;
    createdAt?: string;
    updatedAt?: string;
    givenById?: string;
    totalUsers: number;
    permissions: PermissionResponseDto[];
}

export interface RoleRequestDto {
    name: string;
    description: string;
    color: string;
    permissions: PermissionRequestDto[];
}
