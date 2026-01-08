export interface ReportFilters {
    typePeoples?: string[];
    categories?: string[];
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
    category: string;
    typePeople: string;
    total: number;
}
