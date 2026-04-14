import { createAuthService } from './auth/AuthService';
import { useAuthState } from './auth/useAuthState';
import { useStaples } from './hooks/useStaples';
import { StapleTable } from './components/StapleTable';
import { LoginScreen } from './components/LoginScreen';
import { getFirebaseDb } from './firebase-config';

const authService = createAuthService();

const AuthenticatedApp = ({ uid, email }: { uid: string; email: string | null }) => {
  const db = getFirebaseDb();
  const { staples, loading: staplesLoading } = useStaples(db, uid);

  return (
    <div>
      <h1>Grocery Staple Manager</h1>
      <p>Welcome, {email}</p>
      <button type="button" onClick={() => authService.signOut()}>
        Sign Out
      </button>
      {staplesLoading ? <p>Loading staples...</p> : <StapleTable staples={staples} />}
    </div>
  );
};

export const App = () => {
  const { user, loading } = useAuthState(authService);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <LoginScreen signIn={authService.signIn} signUp={authService.signUp} />;
  }

  return <AuthenticatedApp uid={user.uid} email={user.email} />;
};
