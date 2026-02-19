export interface ServiceEventRequestDto {
    serviceId: string;
    branchId: string;
    startDateTime: string; // ISO 8601 format
    endDateTime: string;   // ISO 8601 format
}

export interface ServiceEventsFilterRequestDto {
    serviceId?: string;
    branchId?: string;
    startDate?: string; // LocalDateTime ISO
    endDate?: string;   // LocalDateTime ISO
}

export interface ServiceEventResponseDto {
    id: string;
    serviceName: string;
    branchName: string;
    createdBy: string;
    address: string;
    startDateTime: string;
    endDateTime: string;
}

export interface ServiceEventPagesResponseDto {
    events: ServiceEventResponseDto[];
    pages: number;
}

export type ServiceEvent = ServiceEventResponseDto;
