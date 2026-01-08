export interface User {
    id: string;
    memberId: string;
    memberName?: string; // For UI display
    username: string;
    password?: string; // Only for creation/update
    rolesId: string[];
    rolesNames?: string[]; // For UI display
    active: boolean;
    createdAt?: string;
    lastLogin?: string;
}

export interface UserPagesResponseDto {
    users: User[];
    pages: number;
    total: number;
}
