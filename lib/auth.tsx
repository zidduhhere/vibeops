"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useUser, Auth0Provider } from "@auth0/nextjs-auth0/client";

export interface AuthUser {
  email: string;
  name?: string;
  picture?: string;
  nickname?: string;
  sub?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  error: Error | null;
  login: (email?: string, isSignup?: boolean, connection?: string) => void;
  logout: () => void;
  isSandbox: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const isAuth0Enabled = process.env.NEXT_PUBLIC_AUTH0_ENABLED === "true";

function SandboxAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("vibeops_user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem("vibeops_user");
      }
    }
    setIsLoading(false);
  }, []);

  const login = (email?: string, isSignup?: boolean) => {
    const mockUser: AuthUser = {
      email: email || "sandbox@vibeops.dev",
      name: email ? email.split("@")[0] : "Sandbox User",
      picture: `https://avatar.vercel.sh/${email || "sandbox"}`,
      sub: "mock|12345",
    };
    localStorage.setItem("vibeops_user", JSON.stringify(mockUser));
    setUser(mockUser);

    // Redirect to dashboard or onboarding
    if (isSignup) {
      window.location.href = "/onboarding";
    } else {
      window.location.href = "/dashboard";
    }
  };

  const logout = () => {
    localStorage.removeItem("vibeops_user");
    setUser(null);
    window.location.href = "/";
  };

  return (
    <AuthContext.Provider
      value={{ user, isLoading, error: null, login, logout, isSandbox: true }}
    >
      {children}
    </AuthContext.Provider>
  );
}

function Auth0Wrapper({ children }: { children: ReactNode }) {
  const { user, error, isLoading } = useUser();

  const login = (email?: string, isSignup?: boolean, connection?: string) => {
    const params = new URLSearchParams();
    if (isSignup) {
      params.set("screen_hint", "signup");
      params.set("returnTo", "/onboarding");
    } else {
      params.set("returnTo", "/dashboard");
    }
    if (connection) {
      params.set("connection", connection);
    }
    if (email) {
      params.set("login_hint", email);
    }
    const queryString = params.toString();
    window.location.href = `/auth/login${queryString ? `?${queryString}` : ""}`;
  };

  const logout = () => {
    window.location.href = "/auth/logout";
  };

  const mappedUser = user
    ? {
        email: user.email || "",
        name: user.name || undefined,
        picture: user.picture || undefined,
        nickname: user.nickname || undefined,
        sub: user.sub || undefined,
      }
    : null;

  const authError = error ? new Error(error.message) : null;

  return (
    <AuthContext.Provider
      value={{
        user: mappedUser,
        isLoading,
        error: authError,
        login,
        logout,
        isSandbox: false,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  if (isAuth0Enabled) {
    return (
      <Auth0Provider>
        <Auth0Wrapper>{children}</Auth0Wrapper>
      </Auth0Provider>
    );
  }
  return <SandboxAuthProvider>{children}</SandboxAuthProvider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
