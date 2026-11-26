import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import api, { errorMessage } from '../api';
import { ROLE_HOME, canOpen, useAuth } from '../auth';
import { ROLES, SUB_COUNTIES } from '../data';
import { Alert, Button, Card, Field, Input, PasswordInput, Select, useTitle } from '../ui';

export function LoginPage() {
  useTitle('Log in');
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const requested = location.state?.from;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!loading && user) return <Navigate to={ROLE_HOME[user.role] || '/'} replace />;

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const signedIn = await login(email, password);
      const destination = requested && canOpen(signedIn.role, requested) ? requested : (ROLE_HOME[signedIn.role] || '/');
      navigate(destination, { replace: true });
    } catch (err) {
      setError(errorMessage(err, 'Could not sign in.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-green">Welcome back</p>
      <h1 className="mt-2 font-display text-5xl text-ink">Sign in to your dashboard</h1>
      <p className="mt-4 text-muted">Athletes, coaches, scouts, clubs, organizers, and administrators each land in their own workspace.</p>
      <form onSubmit={submit} className="mt-8 space-y-4">
        {requested ? <Alert tone="green">Sign in to open your dashboard.</Alert> : null}
        {error ? <Alert>{error}</Alert> : null}
        <Field label="Email"><Input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} /></Field>
        <Field label="Password"><PasswordInput autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></Field>
        <div className="flex items-center justify-between gap-3">
          <Button type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</Button>
          <Link to="/forgot-password" className="text-sm font-semibold text-green">Forgot password</Link>
        </div>
      </form>
      <p className="mt-6 text-sm">New here? <Link to="/register" className="font-semibold text-green">Create an account</Link></p>
    </div>
  );
}

export function RegisterPage() {
  useTitle('Register');
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'athlete', phone: '', subCounty: 'Garissa Township', dateOfBirth: '',
    guardianName: '', guardianPhone: '', guardianRelationship: 'Parent', guardianConsent: false,
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const age = ageFrom(form.dateOfBirth);
  const minor = form.role === 'athlete' && age !== null && age < 18;

  function set(key, value) { setForm((current) => ({ ...current, [key]: value })); }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const user = await register({
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
        phone: form.phone,
        subCounty: form.subCounty,
        county: 'Garissa',
        dateOfBirth: form.dateOfBirth || undefined,
        guardian: minor ? {
          name: form.guardianName,
          phone: form.guardianPhone,
          relationship: form.guardianRelationship,
          consent: form.guardianConsent,
        } : undefined,
      });
      navigate(ROLE_HOME[user.role] || '/');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-green">Create an account</p>
      <h1 className="mt-2 font-display text-5xl">Join Garissa SportsConnect</h1>
      <form onSubmit={submit} className="mt-8 space-y-6">
        {error ? <Alert>{error}</Alert> : null}
        <fieldset>
          <legend className="text-sm font-semibold">I am joining as</legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {ROLES.map((role) => (
              <label key={role.id} className={`cursor-pointer rounded-3xl border p-4 ${form.role === role.id ? 'border-green bg-green-soft' : 'border-line bg-paper'}`}>
                <input className="sr-only" type="radio" name="role" value={role.id} checked={form.role === role.id} onChange={() => set('role', role.id)} />
                <span className="block font-semibold">{role.title}</span>
                <span className="mt-1 block text-sm text-muted">{role.text}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name"><Input required value={form.name} onChange={(event) => set('name', event.target.value)} /></Field>
          <Field label="Email"><Input type="email" required value={form.email} onChange={(event) => set('email', event.target.value)} /></Field>
          <Field label="Password" hint="At least 8 characters."><PasswordInput minLength={8} autoComplete="new-password" required value={form.password} onChange={(event) => set('password', event.target.value)} /></Field>
          <Field label="Phone"><Input value={form.phone} onChange={(event) => set('phone', event.target.value)} /></Field>
          <Field label="Sub-county">
            <Select value={form.subCounty} onChange={(event) => set('subCounty', event.target.value)}>
              {SUB_COUNTIES.map((item) => <option key={item}>{item}</option>)}
            </Select>
          </Field>
          <Field label="Date of birth" hint={form.role === 'athlete' ? 'Required for athletes.' : 'Optional.'}>
            <Input type="date" required={form.role === 'athlete'} value={form.dateOfBirth} onChange={(event) => set('dateOfBirth', event.target.value)} />
          </Field>
        </div>
        {minor ? (
          <Card className="space-y-4 bg-gold-soft">
            <h2 className="font-display text-2xl">Guardian consent</h2>
            <p className="text-sm">Athletes under 18 need a guardian’s name, phone, and consent. The public directory will not show this profile.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Guardian name"><Input required value={form.guardianName} onChange={(event) => set('guardianName', event.target.value)} /></Field>
              <Field label="Guardian phone"><Input required value={form.guardianPhone} onChange={(event) => set('guardianPhone', event.target.value)} /></Field>
              <Field label="Relationship"><Input value={form.guardianRelationship} onChange={(event) => set('guardianRelationship', event.target.value)} /></Field>
            </div>
            <label className="flex items-start gap-2 text-sm font-semibold">
              <input type="checkbox" className="mt-1" checked={form.guardianConsent} onChange={(event) => set('guardianConsent', event.target.checked)} required />
              I confirm a parent or guardian agrees to this account and profile.
            </label>
          </Card>
        ) : null}
        <Button type="submit" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</Button>
      </form>
    </div>
  );
}

export function ForgotPage() {
  useTitle('Reset password');
  const [email, setEmail] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    setError('');
    try {
      const res = await api.post('/auth/forgot-password', { email });
      setResult(res.data.data);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <h1 className="font-display text-4xl">Reset your password</h1>
      <p className="mt-3 text-sm text-muted">In this demo, a matching account shows the reset link here. Production would email it instead.</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        {error ? <Alert>{error}</Alert> : null}
        <Field label="Email"><Input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></Field>
        <Button type="submit">Create reset link</Button>
      </form>
      {result?.resetUrl ? (
        <Card className="mt-6">
          <p className="text-sm">Reset link ready.</p>
          <Link className="mt-2 block font-semibold text-green break-all" to={`/reset-password/${result.resetToken}`}>Open reset page</Link>
        </Card>
      ) : result ? <p className="mt-4 text-sm">If that email is registered, the link has been issued.</p> : null}
    </div>
  );
}

export function ResetPage() {
  useTitle('Choose a new password');
  const { token } = useParams();
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    try {
      const res = await api.post(`/auth/reset-password/${token}`, { password });
      localStorage.setItem('gsc_token', res.data.data.token);
      setUser(res.data.data.user);
      navigate(ROLE_HOME[res.data.data.user.role] || '/');
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <h1 className="font-display text-4xl">Choose a new password</h1>
      <form onSubmit={submit} className="mt-6 space-y-4">
        {error ? <Alert>{error}</Alert> : null}
        <Field label="New password"><Input type="password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} /></Field>
        <Button type="submit">Update password</Button>
      </form>
    </div>
  );
}

export function ageFrom(value) {
  if (!value) return null;
  const born = new Date(value);
  if (Number.isNaN(born.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - born.getFullYear();
  const month = today.getMonth() - born.getMonth();
  if (month < 0 || (month === 0 && today.getDate() < born.getDate())) age -= 1;
  return age;
}
