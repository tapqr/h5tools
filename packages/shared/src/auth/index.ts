export interface LoginRequest {
  username: string;
  password: string;
}

export interface CurrentUser {
  id: string;
  username: string;
  displayName: string;
}
