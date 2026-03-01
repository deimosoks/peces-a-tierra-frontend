import { MemberCategoryResponseDto, MemberTypeResponseDto, MemberSubCategoryResponseDto } from './member-config.model';
import { BranchResponseDto } from './branch.model';

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
  firstName?: string; // Optional as it might be derived or separate
  lastName?: string;  // Optional same reason
  email?: string;
  type: MemberTypeResponseDto;
  category: MemberCategoryResponseDto;
  subCategory?: MemberSubCategoryResponseDto;
  cellphone?: string;
  birthdate?: Date;
  cc?: string;
  createdAt: Date;
  updatedAt: Date;
  pictureProfileUrl?: string;
  age?: number;
  active: boolean;
  gender?: string;
  branchName?: string; // Added branchName to response
  branch?: BranchResponseDto;
  
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
  typeId: string;
  categoryId: string;
  subCategoryId?: string;
  cellphone?: string;
  address?: string;
  birthdate?: Date;
  cc?: string;
  pictureProfile?: File;
  gender?: string;
  branchId?: string;
  
  // Address fields
  neighborhood?: string;
  city?: string;
  municipality?: string;
  district?: string;
  postalCode?: string;
  latitude?: string;
  longitude?: string;
}


export interface MemberFilterRequestDto {
    memberType?: string[];
    memberCategory?: string[];
    subCategory?: string[];
    query?: string;
    onlyActive: boolean;
    hasCc?: boolean | null;
    hasCellphone?: boolean | null;
    hasAddress?: boolean | null;
    hasBirthdate?: boolean | null;
    ageFilterRange1?: number | null;
    ageFilterRange2?: number | null;
    location?: string;
    gender?: string;
    branchId?: string; // Added branchId to filter
}

export interface MemberExportDto {
    completeName: string;
    type: string;
    category: string;
    subCategory?: string;
    cellphone: string;
    address: string;
    birthdate: string;
    cc: string;
    age: number;
    gender?: string;
}

export interface ReportColumn {
    id: string;
    label: string;
    visible: boolean;
    order: number;
}
