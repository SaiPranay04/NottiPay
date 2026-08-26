import React, { useState, useEffect, useCallback } from 'react';
import './theme.css';
import './app.css';
import { StoreProvider } from './store';
import ThemeProvider from './ThemeProvider';
import TabBar, { Rail } from './components/TabBar';
import Toast from './components/Toast';

import Command from './pages/Command';
import Dashboard from './pages/Dashboard';
import Work from './pages/Work';
import Transactions from './pages/Transactions';
import Accounts from './pages/Accounts';
import Budgets from './pages/Budgets';
import Commitments from './pages/Commitments';
import Loans from './pages/Loans';
import Settings from './pages/Settings';
import More from './pages/More';
import Login from './pages/Login';

const PAGES = {
  '/': Command,
  '/dashboard': Dashboard,
  '/work': Work,
  '/transactions': Transactions,
  '/accounts': Accounts,
  '/budgets': Budgets,
  '/commitments': Commitments,
  '/loans': Loans,
  '/settings': Settings,
  '/more': More,
  '/login': Login,
};

function Shell() {
  const [route, setRoute] = useState('/dashboard');
  const [preview, setPreview] = useState(null);
  const [highlight, setHighlight] = useState(null);
  const [focusCommand, setFocusCommand] = useState(0);

  const navigate = useCallback((r) => {
    setRoute(r);
    window.scrollTo(0, 0);
  }, []);

  // "/" jumps to Command from anywhere, the way a till operator would expect.
  useEffect(() => {
    const onKey = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === '/') {
        e.preventDefault();
        setRoute('/');
        setFocusCommand((n) => n + 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const Page = PAGES[route] || Dashboard;
  const nav = { route, navigate, preview, setPreview, highlight, setHighlight, focusCommand };

  if (route === '/login') {
    return (
      <div className="app">
        <Login nav={nav} />
      </div>
    );
  }

  return (
    <div className="app">
      <div className="shell">
        <Rail route={route} navigate={navigate} />
        <Page key={route} nav={nav} />
      </div>
      <TabBar route={route} navigate={navigate} />
      <Toast />
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <ThemeProvider>
        <Shell />
      </ThemeProvider>
    </StoreProvider>
  );
}
