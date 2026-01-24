export interface IglesiaService {
    id: string;
    name: string;
    active: boolean;
    createdAt?: string;
    description?: string;
}

export interface AttendanceCreateDto {
    serviceId: string;
    memberId: string;
    serviceDate: string; // LocalDateTime string format
    attendanceDate: string; // LocalDateTime string format
    note?: string;
}

export interface AttendanceIdResponseDto {
    serviceId: string;
    memberId: string;
    serviceDate: string;
}

export interface AttendanceResponseDto {
    id: AttendanceIdResponseDto;
    serviceName: string;
    memberCompleteName: string;
    memberCategory: string;
    memberType: string;
    attendanceDate: string;
    invalid: boolean;
    note: string;
    registeredBy: string;
    invalidReason?: string;
    invalidAt?: string;
    invalidatedBy?: string;
}

export interface AttendancePagesResponseDto {
    attendances: AttendanceResponseDto[];
    pages: number;
}

export interface AttendanceFiltersRequestDto {
    serviceId?: string;
    startDate?: string;
    endDate?: string;
    memberId?: string;
}

export interface AttendanceInvalidateDto {
    attendanceId: AttendanceIdResponseDto;
    invalidReason: string;
}

export interface Asistencia {
    id?: string;
    memberId: string;
    serviceId: string;
    attendanceDate: string;
    // UI helper
    presente: boolean;
}
