'use client';
import { useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // Create member profile
        await setDoc(doc(db, 'members', userCredential.user.uid), {
          uid: userCredential.user.uid,
          name: email.split('@')[0],
          email: email,
          role: 'member',
          capital_share: 0,
          loan_balance: 0,
          created_at: new Date().toISOString()
        });
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 max-w-md w-full shadow-2xl">
        <h1 className="text-2xl font-bold text-white mb-6">{isLogin ? 'Login' : 'Register'}</h1>
        {error && <p className="text-rose-500 mb-4 text-sm">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white"
            required
          />
          <button
            type="submit"
            className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-3 rounded-xl transition-colors"
          >
            {isLogin ? 'Login' : 'Register'}
          </button>
        </form>
        <div className="mt-4">
          <button
            onClick={handleGoogleLogin}
            className="w-full bg-white text-black hover:bg-zinc-200 font-medium py-3 px-4 rounded-xl transition-colors"
          >
            Sign in with Google
          </button>
        </div>
        <button
          onClick={() => setIsLogin(!isLogin)}
          className="w-full text-zinc-400 text-sm mt-4 hover:text-white"
        >
          {isLogin ? 'Need an account? Register' : 'Already have an account? Login'}
        </button>

        <div className="mt-8 pt-6 border-t border-zinc-800">
          <p className="text-xs text-zinc-500 text-center mb-4 uppercase tracking-widest">System Setup</p>
          <button
            onClick={async () => {
              try {
                await createUserWithEmailAndPassword(auth, 'admin@gmail.com', 'admin');
                alert("Admin account created! You can now login with admin@gmail.com / admin");
              } catch (e: any) {
                if (e.code === 'auth/email-already-in-use') {
                  alert("Admin account already exists. Try logging in.");
                } else {
                  alert("Setup failed: " + e.message);
                }
              }
            }}
            className="w-full py-2 px-4 rounded-xl border border-indigo-500/30 text-indigo-400 text-xs font-bold hover:bg-indigo-500/10 transition-all"
          >
            Setup Admin Account (admin@gmail.com)
          </button>
        </div>
      </div>
    </div>
  );
}
