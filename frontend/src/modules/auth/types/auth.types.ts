import type { User } from "firebase/auth";

export interface AuthContextValue {
  user: User | null;
  loading: boolean;
  configurationError: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export interface AuthenticatedProfileResponse {
  success: true;
  data: {
    user: {
      uid: string;
      email?: string;
      name?: string;
    };
  };
}
