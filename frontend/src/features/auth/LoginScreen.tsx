import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ApiError, api } from '@/lib/api';
import { Btn } from '@/components/ui/Btn';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from './useAuth';

type LocationState = { from?: { pathname: string } } | null;

export function LoginScreen() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const fromPath = (location.state as LocationState)?.from?.pathname ?? '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Si el usuario ya está autenticado y entra a /login, redirigir.
  if (isAuthenticated) {
    return <Navigate to={fromPath} replace />;
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.auth.login(email.trim(), password);
      navigate(fromPath, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        // Mensaje genérico HU-01 borde — no revelamos si el email existe.
        setError(err.message);
      } else {
        setError('Error inesperado, intenta de nuevo');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: 'var(--bg)',
        padding: 24,
      }}
    >
      <article
        className="card"
        style={{
          width: '100%',
          maxWidth: 380,
          padding: 32,
          boxShadow: 'var(--shadow-3)',
          borderRadius: 'var(--r-lg)',
        }}
      >
        <header style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'linear-gradient(135deg, #1d1d1f 0%, #3a3a3c 100%)',
              display: 'grid',
              placeItems: 'center',
              color: 'white',
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            MJ
          </div>
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 18,
                fontWeight: 600,
                letterSpacing: '-0.02em',
              }}
            >
              Mini Jira
            </h1>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Inicia sesión para continuar</div>
          </div>
        </header>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              className="input"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="laura@empresa.com"
              disabled={submitting}
            />
          </div>

          <div className="field">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              className="input"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={submitting}
            />
          </div>

          {error && (
            <div
              role="alert"
              style={{
                fontSize: 12.5,
                color: 'var(--p-high)',
                background: 'var(--p-high-soft)',
                borderRadius: 'var(--r-sm)',
                padding: '8px 10px',
              }}
            >
              {error}
            </div>
          )}

          <Btn
            type="submit"
            variant="primary"
            disabled={submitting}
            leftIcon={
              submitting ? undefined : <Icon name="arrow-right" size={14} />
            }
            style={{ marginTop: 4, justifyContent: 'center' }}
          >
            {submitting ? 'Entrando…' : 'Entrar'}
          </Btn>
        </form>

        <footer
          style={{
            marginTop: 18,
            fontSize: 11.5,
            color: 'var(--subtle)',
            textAlign: 'center',
            lineHeight: 1.5,
          }}
        >
          Demo dev: <code className="kbd">laura@empresa.com</code> /{' '}
          <code className="kbd">demo123</code>
        </footer>
      </article>
    </div>
  );
}
