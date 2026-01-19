import { useEffect } from 'react';

function App() {
  useEffect(() => {
    // FORCE REDIRECT to the actual Secure Admin App
    window.location.href = 'http://localhost:5173/hospital-all-in-one/';
  }, []);

  return (
    <div style={{ padding: 50, textAlign: 'center', background: '#0f172a', color: 'white', height: '100vh' }}>
      <h1>Redirecting to Secure System...</h1>
      <p>Please wait while we transfer you to the secure admin portal.</p>
      <a href="http://localhost:5173/hospital-all-in-one/" style={{ color: '#818cf8' }}>Click here if not redirected</a>
    </div>
  );
}

export default App;
