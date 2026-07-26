import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const API_BASE_URL = 'http://localhost:8000/api';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('mediassist_token'));
  const [loading, setLoading] = useState(true);

  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common['Authorization'];
  }

  useEffect(() => {
    const fetchCurrentUser = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await axios.get(`${API_BASE_URL}/auth/me`);
        setUser(res.data);
      } catch (err) {
        console.error('Session expired or invalid:', err);
        logout();
      } finally {
        setLoading(false);
      }
    };
    fetchCurrentUser();
  }, [token]);

  const login = async (email, password) => {
    const res = await axios.post(`${API_BASE_URL}/auth/login`, { email, password });
    const newToken = res.data.access_token;
    localStorage.setItem('mediassist_token', newToken);
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    setToken(newToken);
    const userRes = await axios.get(`${API_BASE_URL}/auth/me`);
    setUser(userRes.data);
    return userRes.data;
  };

  const register = async (name, email, password) => {
    await axios.post(`${API_BASE_URL}/auth/register`, { name, email, password });
    return login(email, password);
  };

  const demoLogin = async () => {
    const res = await axios.post(`${API_BASE_URL}/auth/demo-login`);
    const newToken = res.data.access_token;
    localStorage.setItem('mediassist_token', newToken);
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    setToken(newToken);
    const userRes = await axios.get(`${API_BASE_URL}/auth/me`);
    setUser(userRes.data);
    return userRes.data;
  };

  const logout = () => {
    localStorage.removeItem('mediassist_token');
    delete axios.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, demoLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
