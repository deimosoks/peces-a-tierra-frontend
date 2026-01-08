export interface Permission {
    id: string;
    name: string;
    description: string;
    category: string;
}

export interface Role {
    id: string;
    name: string;
    description: string;
    permissions: string[]; // List of permission IDs or keys
    memberCount?: number;
    color?: string; // For UI aesthetic
}
