import { useCallback, useState } from "react";
import { MainApp } from "./MainApp";
import { LoginPage } from "./pages/LoginPage";

const SESSION_KEY = "aml_ai_system_demo_session";

export default function App() {
  const [loggedIn, setLoggedIn] = useState(() => sessionStorage.getItem(SESSION_KEY) === "1");

  const handleLogin = useCallback(() => {
    sessionStorage.setItem(SESSION_KEY, "1");
    setLoggedIn(true);
  }, []);

  const handleSignOut = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    setLoggedIn(false);
  }, []);

  if (!loggedIn) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return <MainApp onSignOut={handleSignOut} />;
}
