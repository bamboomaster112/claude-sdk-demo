import { useNavigate } from 'react-router-dom';
import LoginForm from '../components/auth/LoginForm';

interface LoginPageProps {
  onLogin: (email: string, password: string) => Promise<any>;
  onSignup: (email: string, password: string, fullName?: string) => Promise<void>;
}

export default function LoginPage({ onLogin, onSignup }: LoginPageProps) {
  const navigate = useNavigate();

  const handleLogin = async (email: string, password: string) => {
    await onLogin(email, password);
    navigate('/dashboard');
  };

  return <LoginForm onLogin={handleLogin} onSignup={onSignup} />;
}
