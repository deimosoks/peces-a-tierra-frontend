export interface MemberSubCategoryResponseDto {
  id: string;
  name: string;
  color: string;
}

export interface MemberSubCategoryRequestDto {
  name: string;
  color: string;
  categoryId: string;
}

export interface MemberCategoryResponseDto {
  id: string;
  name: string;
  color: string;
  subCategories: MemberSubCategoryResponseDto[];
}

export interface MemberCategoryRequestDto {
  name: string;
  color: string;
}

// Member Type DTOs
export interface MemberTypeResponseDto {
  id: string;
  name: string;
  color: string;
}

export interface MemberTypeRequestDto {
  name: string;
  color: string;
}
