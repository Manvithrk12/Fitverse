export type Role = "USER" | "ADMIN";

export interface PublicUser {
  id: string;
  email: string;
  role: Role;
}

export interface AuthResponse {
  user: PublicUser;
  accessToken: string;
}
