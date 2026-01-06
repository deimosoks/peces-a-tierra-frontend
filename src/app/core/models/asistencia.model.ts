export interface Asistencia {
    id?: number;
    integranteId: number;
    fecha: string;
    presente: boolean;
    nota?: string;
}

export interface AttendanceRecord {
    integranteNombre: string;
    integranteId: number;
    presente: boolean;
    categoria: string;
}
