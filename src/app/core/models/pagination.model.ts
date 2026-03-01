export interface ExportResponseDto<T> {
    data: T[];
    totalElements: number;
}

export interface PagesResponseDto<T> {
    data: T[];
    page: number;
    size: number;
    totalPages: number;
    totalElements: number;
}
