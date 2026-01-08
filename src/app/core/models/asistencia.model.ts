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
    attendanceDate: string; // LocalDateTime string format
}

export interface Asistencia {
    id?: string;
    memberId: string;
    serviceId: string;
    attendanceDate: string;
    // UI helper
    presente: boolean;
}
