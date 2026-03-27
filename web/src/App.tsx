import { useAuth } from './hooks/useAuth';

export const App = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return (
      <div>
        <h1>Sign In</h1>
        <p>Please sign in to manage your grocery staples.</p>
      </div>
    );
  }

  return (
    <div>
      <h1>Grocery Staple Manager</h1>
      <p>Welcome, {user.email}</p>
    </div>
  );
};
