// Baptism Request DTO
export interface BaptismRequestDto {
  memberId: string;
  imageUrl?: File;
  date: Date;
  note?: string;
  address?: string;  // Full formatted address
  neighborhood?: string;
  city?: string;
  municipality?: string;
  district?: string;
  postalCode?: string;
  latitude?: string;
  longitude?: string;
}

// Baptism Response DTO
export interface BaptismResponseDto {
  id: string;
  memberName: string;
  date: Date;
  note?: string;
  createdAt: Date;
  registeredBy: string;
  pictureUrl?: string;
  address?: string;  // Full formatted address
  neighborhood?: string;
  city?: string;
  municipality?: string;
  district?: string;
  postalCode?: string;
  latitude?: string;
  longitude?: string;
  invalidReason?: string;
  invalidAt?: Date;
  invalidatedBy?: string;
  invalid: boolean;
  branchName?: string;
}

// Baptism Filter Request DTO
export interface BaptismFilterRequestDto {
  memberId?: string;
  startDate?: Date;
  endDate?: Date;
  query?: string;
  active: boolean;
  branchId?: string;
}

// Baptism Pages Response DTO
export interface BaptismPagesResponseDto {
  baptisms: BaptismResponseDto[];
  pages: number;
}

// Baptism Invalid Request DTO
export interface BaptismInvalidRequestDto {
  baptismId: string;
  invalidReason: string;
}
