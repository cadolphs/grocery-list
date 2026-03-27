import { useAuth } from './hooks/useAuth';
import { useStaples } from './hooks/useStaples';
import { StapleTable } from './components/StapleTable';
import { getFirebaseDb } from './firebase-config';

const AuthenticatedApp = ({ uid, email }: { uid: string; email: string | null }) => {
  const db = getFirebaseDb();
  const { staples, loading: staplesLoading } = useStaples(db, uid);

  return (
    <div>
      <h1>Grocery Staple Manager</h1>
      <p>Welcome, {email}</p>
      {staplesLoading ? <p>Loading staples...</p> : <StapleTable staples={staples} />}
    </div>
  );
};

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

  return <AuthenticatedApp uid={user.uid} email={user.email} />;
};
