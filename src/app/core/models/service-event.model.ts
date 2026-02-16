export interface ServiceEventRequestDto {
    serviceId: string;
    branchId: string;
    startDateTime: string; // ISO 8601 format
    endDateTime: string;   // ISO 8601 format
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

export type ServiceEvent = ServiceEventResponseDto;
