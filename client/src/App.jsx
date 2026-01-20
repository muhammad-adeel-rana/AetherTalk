import { useState, useEffect } from 'react';
import AuthPage from './components/AuthPage';
import Dashboard from './components/Dashboard';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('chat_theme') || 'light';
  });

  useEffect(() => {
    // Check for existing session
    const savedUser = localStorage.getItem('chat_current_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('chat_current_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('chat_current_user');
  };

  const toggleTheme = () => {
    setTheme(prev => {
      const newTheme = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('chat_theme', newTheme);
      return newTheme;
    });
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading...</div>;
  }

  return (
    <>
      {!user ? (
        <AuthPage onLogin={handleLogin} />
      ) : (
        <Dashboard
          user={user}
          onLogout={handleLogout}
          theme={theme}
          toggleTheme={toggleTheme}
        />
      )}
    </>
  );
}

export default App;