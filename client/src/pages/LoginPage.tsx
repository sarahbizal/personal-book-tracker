import { useState } from "react";
import { Link, Navigate } from "react-router";
import { useAuth } from "../components/auth/AuthContext";

function LoginPage() {
  const { isAdmin, login } = useAuth();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  //Wait for the login check so an admin doesn't see the form flash before the redirect
  if (isAdmin === null) {
    return null;
  }

  //Also how a successful login leaves the page: login() sets isAdmin
  if (isAdmin) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await login(password);
    } catch (err) {
      setError((err as Error).message);
      setIsSubmitting(false);
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
  };

  return (
    <main>
      <h1>Log in</h1>
      <form onSubmit={handleSubmit}>
        {/* The server ignores it. Password managers need a username to save and fill the password */}
        <input
          type="text"
          name="username"
          autoComplete="username"
          value="admin"
          readOnly
          hidden
        />
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={handlePasswordChange}
        />
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Logging in..." : "Log in"}
        </button>
      </form>
      {error && <p role="alert">{error}</p>}
      <Link to="/">Back to books</Link>
    </main>
  );
}

export default LoginPage;
