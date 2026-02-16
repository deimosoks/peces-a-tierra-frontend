import { MemberCategoryResponseDto, MemberTypeResponseDto, MemberSubCategoryResponseDto } from './member-config.model';

export interface IglesiaService {
    id: string;
    name: string;
    active: boolean;
    createdAt?: string;
    description?: string;
}

export interface AttendanceCreateDto {
    serviceEventId: string;
    memberId: string;
    serviceDate: string; // LocalDateTime string format
    attendanceDate: string; // LocalDateTime string format
    note?: string;
}

export interface AttendanceResponseDto {
    id: string;
    serviceName: string;
    memberCompleteName: string;
    memberCategory: MemberCategoryResponseDto;
    memberType: MemberTypeResponseDto;
    attendanceDate: string;
    branchName: string;
    invalid: boolean;
    note: string;
    registeredBy: string;
    invalidReason?: string;
    invalidAt?: string;
    invalidatedBy?: string;
    subCategory?: MemberSubCategoryResponseDto;
}

export interface AttendancePagesResponseDto {
    attendances: AttendanceResponseDto[];
    pages: number;
}

export interface AttendanceFiltersRequestDto {
    serviceEventId?: string; // Updated from serviceId
    startDate?: string;
    endDate?: string;
    branchId?: string; // Added branchId
    memberId?: string;
}

export interface AttendanceInvalidateDto {
    attendanceId: string;
    invalidReason: string;
}

export interface Asistencia {
    id?: string;
    memberId: string;
    serviceEventId: string; // Updated
    attendanceDate: string;
    // UI helper
    presente: boolean;
}
