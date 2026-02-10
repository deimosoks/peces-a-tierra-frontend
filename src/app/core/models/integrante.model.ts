export interface MemberNoteResponseDto {
    id: string;
    note: string;
    createdBy: string;
    createdAt: string;
}

export interface MemberNoteRequestDto {
    note: string;
    memberId: string;
}

export interface Integrante {
    id: string;
    completeName: string;
    type: string;
    category: string;
    cellphone: string;
    address: string;
    birthdate: string;
    cc: string;
    createdAt?: string;
    updatedAt?: string;
    pictureProfileUrl?: string;
    age: number;
    active: boolean;
    notes: MemberNoteResponseDto[];
}

export interface MemberPagesResponseDto {
    members: Integrante[];
    pages: number;
}

export interface MemberFilterRequestDto {
    memberType?: string[];
    memberCategory?: string[];
    query?: string;
    onlyActive: boolean;
    hasCc?: boolean | null;
    hasCellphone?: boolean | null;
    hasAddress?: boolean | null;
    hasBirthdate?: boolean | null;
    ageFilterRange1?: number | null;
    ageFilterRange2?: number | null;
    location?: string;
}

export interface MemberExportDto {
    completeName: string;
    type: string;
    category: string;
    cellphone: string;
    address: string;
    birthdate: string;
    cc: string;
    age: number;
}
