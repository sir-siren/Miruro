import {
    createContext,
    useContext,
    useState,
    useEffect,
    ReactNode,
} from "react";
import {
    login as apiLogin,
    register as apiRegister,
    verifyToken,
} from "../hooks/useApi";

type KiroUser = {
    id: string;
    username: string;
    role: "user" | "admin";
};

type KiroAuthContextType = {
    isLoggedIn: boolean;
    user: KiroUser | null;
    token: string | null;
    login: (username: string, password: string) => Promise<void>;
    register: (
        username: string,
        password: string,
        gender?: string,
        country?: string,
    ) => Promise<void>;
    logout: () => void;
    isAdmin: boolean;
};

const KiroAuthContext = createContext<KiroAuthContextType | undefined>(
    undefined,
);

export const KiroAuthProvider = ({ children }: { children: ReactNode }) => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [user, setUser] = useState<KiroUser | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [authLoading, setAuthLoading] = useState(true);

    const isAdmin = user?.role === "admin";

    useEffect(() => {
        const storedToken = localStorage.getItem("kiroToken");
        if (storedToken) {
            verifyToken(storedToken)
                .then((response) => {
                    setUser({
                        id: response.user.id,
                        username: response.user.username,
                        role: response.user.role,
                    });
                    setToken(storedToken);
                    setIsLoggedIn(true);
                    setAuthLoading(false);
                })
                .catch((err) => {
                    console.error("Token verification failed:", err);
                    logout();
                    setAuthLoading(false);
                });
        } else {
            setAuthLoading(false);
        }
    }, []);

    const login = async (username: string, password: string) => {
        try {
            const response = await apiLogin(username, password);
            const newToken = response.token;

            localStorage.setItem("kiroToken", newToken);
            setToken(newToken);
            setUser({
                id: response.id || "",
                username: response.username,
                role: response.role,
            });
            setIsLoggedIn(true);
        } catch (error: any) {
            console.error("Login failed:", error);
            throw error;
        }
    };

    const register = async (
        username: string,
        password: string,
        gender?: string,
        country?: string,
    ) => {
        try {
            const response = await apiRegister(
                username,
                password,
                gender,
                country,
            );
            const newToken = response.token;

            localStorage.setItem("kiroToken", newToken);
            setToken(newToken);
            setUser({
                id: response.id || "",
                username: response.username,
                role: response.role,
            });
            setIsLoggedIn(true);
        } catch (error: any) {
            console.error("Registration failed:", error);
            throw error;
        }
    };

    const logout = () => {
        localStorage.removeItem("kiroToken");
        setIsLoggedIn(false);
        setUser(null);
        setToken(null);
    };

    if (authLoading) {
        return null;
    }

    return (
        <KiroAuthContext.Provider
            value={{
                isLoggedIn,
                user,
                token,
                login,
                register,
                logout,
                isAdmin,
            }}
        >
            {children}
        </KiroAuthContext.Provider>
    );
};

export const useKiroAuth = () => {
    const context = useContext(KiroAuthContext);
    if (context === undefined) {
        throw new Error("useKiroAuth must be used within a KiroAuthProvider");
    }
    return context;
};
