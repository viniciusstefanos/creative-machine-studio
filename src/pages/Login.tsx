import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { lovable } from "@/integrations/lovable";

const Login = () => {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && session) {
      navigate("/", { replace: true });
    }
  }, [session, loading, navigate]);

  const handleGoogleLogin = async () => {
    setIsSigningIn(true);
    setError(null);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        setError("Erro ao entrar com Google. Tente novamente.");
        setIsSigningIn(false);
      }
    } catch {
      setError("Erro ao entrar com Google. Tente novamente.");
      setIsSigningIn(false);
    }
  };

  if (loading) return null;

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "var(--bg-base)" }}
    >
      <div
        className="w-full max-w-[380px] p-8 rounded-lg"
        style={{
          background: "var(--bg-surface1)",
          border: "1px solid var(--border-default)",
        }}
      >
        {/* Logo */}
        <div className="text-center mb-10">
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ fontFamily: "'Syne', sans-serif", color: "var(--accent)" }}
          >
            Máquina Criativa
          </h1>
          <p
            className="mt-2 text-xs uppercase tracking-[4px]"
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              color: "var(--text-muted)",
            }}
          >
            Estúdio de produção
          </p>
        </div>

        {/* Error */}
        {error && (
          <div
            className="mb-4 p-3 rounded-md text-xs"
            style={{
              background: "var(--status-rejected)",
              color: "var(--text-primary)",
              fontFamily: "'DM Sans', sans-serif",
              opacity: 0.9,
            }}
          >
            {error}
          </div>
        )}

        {/* Google Button */}
        <button
          onClick={handleGoogleLogin}
          disabled={isSigningIn}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-md text-sm font-medium transition-all duration-150 disabled:opacity-50"
          style={{
            background: "var(--accent)",
            color: "var(--text-inverse)",
            fontFamily: "'DM Sans', sans-serif",
            borderRadius: "6px",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          {isSigningIn ? "Entrando..." : "Entrar com Google"}
        </button>

        {/* Footer */}
        <p
          className="mt-8 text-center text-[10px]"
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            color: "var(--text-muted)",
          }}
        >
          Acesso restrito à equipe interna
        </p>
      </div>
    </div>
  );
};

export default Login;
