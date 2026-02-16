export interface Branch {
    id: string;
    name: string;
    address: string;
    city: string;
    cellphone: string;
    createdAt?: string;
}

export interface BranchRequestDto {
    name: string;
    address: string;
    city: string;
    cellphone: string;
}

export interface BranchResponseDto extends Branch {}
