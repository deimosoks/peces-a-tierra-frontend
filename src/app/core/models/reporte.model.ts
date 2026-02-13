import { MemberCategoryResponseDto, MemberTypeResponseDto } from './member-config.model';

export interface ReportFilters {
    typePeoples?: string[];
    categories?: string[];
    subCategories?: string[]; // Added subCategories
    serviceIds?: string[];
    startDate?: string; // LocalDateTime ISO
    endDate?: string;   // LocalDateTime ISO
    userId?: string;
    onlyActive?: boolean;
}

export interface ReportData {
    date: string;
    serviceTime: string;
    serviceName: string;
    category: MemberCategoryResponseDto;
    typePeople: MemberTypeResponseDto;
    subCategory?: string;
    total: number;
}
