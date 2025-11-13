import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaEye, FaEyeSlash } from 'react-icons/fa'; 
import './Login.css';
import logo from '../assets/DairyLogo.png';
import { API_BASE_URL } from '../config/api'; 

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const API_BASE = API_BASE_URL; 

  const isEmailValid = email.includes('@') && email.includes('.');
  const isPasswordValid = password.length > 0;
  const isFormValid = isEmailValid && isPasswordValid;

  const handleSubmit = async (e) => {
    e.preventDefault();

    setEmailTouched(true);
    setPasswordTouched(true);

    if (!isFormValid) {
      setErrorMessage('Preencha todos os campos corretamente para acessar.');
      return;
    }

    setErrorMessage('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok && data.token) {
        localStorage.setItem('token', data.token);
        navigate('/dashboard');
      } else {
        setErrorMessage(data.error || 'Credenciais inválidas.');
      }
    } catch (error) {
      console.error('Erro ao se conectar:', error);
      setErrorMessage('Erro ao se conectar. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <img src={logo} alt="DairySense Logo" className="login-logo" />
        <h1>DairySense</h1>
        <p className="subtitle">Sistema de Monitoramento de Gado Leiteiro</p>

        <form onSubmit={handleSubmit}>
          {errorMessage && (
            <div className="form-error-message">{errorMessage}</div>
          )}

          <label htmlFor="email">E-mail</label>
          <input
            type="email"
            id="email"
            placeholder="exemplo@email.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setErrorMessage('');
            }}
            onBlur={() => setEmailTouched(true)}
            className={emailTouched && !isEmailValid ? 'input-error' : ''}
            required
          />
          {emailTouched && !isEmailValid && (
            <span className="error-message">E-mail inválido</span>
          )}

          <label htmlFor="password">Senha</label>
          <div className="password-wrapper">
            <input
              type={isPasswordVisible ? 'text' : 'password'}
              id="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setErrorMessage('');
              }}
              onBlur={() => setPasswordTouched(true)}
              className={passwordTouched && !isPasswordValid ? 'input-error' : ''}
              required
            />

            <button
              type="button"
              className="toggle-password"
              onClick={() => setIsPasswordVisible(!isPasswordVisible)}
              aria-label="Mostrar ou ocultar senha"
            >
              {isPasswordVisible ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>

          {passwordTouched && !isPasswordValid && (
            <span className="error-message">Senha é obrigatória</span>
          )}

          <button type="submit" disabled={!isFormValid || loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className="footer-text">
          © 2025 DairySense — Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}

export default Login;
