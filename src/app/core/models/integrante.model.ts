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
    active: boolean;
}

export interface MemberPagesResponseDto {
    members: Integrante[];
    pages: number;
}
