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
  cellphone?: string;
  birthdate?: Date;
  cc?: string;
  createdAt: Date;
  updatedAt: Date;
  pictureProfileUrl?: string;
  age?: number;
  active: boolean;
  notes?: MemberNoteResponseDto[];
  
  // Address fields
  address?: string;  // Full formatted address from Google Maps
  neighborhood?: string;
  city?: string;
  municipality?: string;
  district?: string;
  postalCode?: string;
  latitude?: string;
  longitude?: string;
}

export interface IntegranteRequestDto {
  completeName: string;
  type: string;
  category: string;
  cellphone?: string;
  address?: string;
  birthdate?: Date;
  cc?: string;
  pictureProfile?: File;
  
  // Address fields
  neighborhood?: string;
  city?: string;
  municipality?: string;
  district?: string;
  postalCode?: string;
  latitude?: string;
  longitude?: string;
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
