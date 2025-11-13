const API_CONFIG = {
  development: 'http://localhost:3000/api',
  production: 'https://dairysense.com.br/api'
};

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// debug (remover em produção)
//console.log('Environment:', import.meta.env.MODE);
//console.log('API URL:', API_BASE_URL);