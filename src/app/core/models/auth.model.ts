export interface LoginRequest {
    username: string;
    password: string;
}

export interface AccessTokenDto {
    token: string;
    expiredAt: string;
}

export interface RefreshTokenDto {
    token: string;
    expiresAt: string;
}

export interface LoginResponse {
    accessTokenDto: AccessTokenDto;
    refreshTokenDto: RefreshTokenDto;
}

export interface UserInfo {
    username: string;
    pictureProfileUrl: string;
    completeName: string;
    permissions: string[]; // Set<String> comes as array in JSON
}

export interface RefreshTokenRequest {
    refreshToken: string;
}
