import { MemberCategoryResponseDto, MemberSubCategoryResponseDto } from './member-config.model';

export interface CategoryRulesResponseDto {
    id: string;
    minAge: number | null;
    maxAge: number | null;
    gender: 'HOMBRE' | 'MUJER' | null;
    priority: number;
    category: MemberCategoryResponseDto;
    subCategory?: MemberSubCategoryResponseDto;
    active: boolean;
}

export interface CategoryRulesRequestDto {
    minAge: number | null;
    maxAge: number | null;
    gender: 'HOMBRE' | 'MUJER' | null;
    priority: number;
    memberCategoryId: string;
    subCategoryId?: string;
}
