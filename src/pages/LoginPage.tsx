import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoginModal } from '@/components/auth/LoginModal';

/**
 * Dedicated /login route — opens the login modal automatically.
 * If user is already authenticated, redirects to home.
 */
export function LoginPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  return (
    <LoginModal
      open={!isAuthenticated}
      onClose={() => navigate('/', { replace: true })}
    />
  );
}
