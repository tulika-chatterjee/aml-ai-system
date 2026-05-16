import { FormEvent, useState } from "react";

type Props = {
  onLogin: () => void;
};

export function LoginPage({ onLogin }: Props) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [shake, setShake] = useState(false);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!user.trim() || !pass.trim()) {
      setShake(true);
      window.setTimeout(() => setShake(false), 500);
      return;
    }
    onLogin();
  }

  return (
    <div className="login-root">
      <div className="login-bg" aria-hidden />
      <div className={`login-card${shake ? " login-card-shake" : ""}`}>
        <div className="login-brand-block">
          <p className="login-brand">TTT Finance AI</p>
          <h1 className="login-product">AML-AI-SYSTEM</h1>
          <p className="login-tagline">
            Remove slowness — <em>scale fast</em> and <strong>safe</strong> with your AML solution.
          </p>
        </div>

        <form className="login-form" onSubmit={submit} noValidate>
          <label className="login-field">
            <span>Username</span>
            <input
              autoComplete="username"
              placeholder="analyst.id"
              value={user}
              onChange={(e) => setUser(e.target.value)}
            />
          </label>
          <label className="login-field">
            <span>Password</span>
            <input
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
            />
          </label>
          <button type="submit" className="login-submit">
            Enter workspace
          </button>
          <p className="login-demo-hint muted">Demo: any non-empty username and password.</p>
        </form>
      </div>
      <p className="login-footer muted">Synthetic data · not production AML software</p>
    </div>
  );
}
