// Registro de nuevos clientes
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { REGLAS_PASSWORD, passwordCumple } from '../passwordRules.js';

export default function Register() {
  const { registro } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const desde = location.state?.desde;

  const [form, setForm] = useState({ nombre: '', email: '', password: '', confirmar: '' });
  const [verPassword, setVerPassword] = useState(false);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const cambiar = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const coinciden = form.confirmar.length > 0 && form.password === form.confirmar;

  const enviar = async (e) => {
    e.preventDefault();
    setError('');
    if (!passwordCumple(form.password)) return setError('La contraseña todavía no cumple todos los requisitos.');
    if (form.password !== form.confirmar) return setError('Las contraseñas no coinciden.');
    setEnviando(true);
    try {
      await registro(form.nombre, form.email, form.password);
      navigate(desde || '/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="auth">
      <form className="auth__card" onSubmit={enviar}>
        <h1>Crea tu cuenta</h1>
        <p className="muted">Es gratis y accedes al instante a los cursos gratuitos.</p>
        {error && <div className="alert alert--error">{error}</div>}

        <label className="field">
          <span>Nombre completo</span>
          <input name="nombre" value={form.nombre} onChange={cambiar} required maxLength={120} autoComplete="name" />
        </label>
        <label className="field">
          <span>Correo electrónico</span>
          <input name="email" type="email" value={form.email} onChange={cambiar} required maxLength={160} autoComplete="email" />
        </label>
        <label className="field">
          <span>Contraseña</span>
          <div className="password-wrap">
            <input name="password" type={verPassword ? 'text' : 'password'} minLength={10} maxLength={72}
              value={form.password} onChange={cambiar} required autoComplete="new-password" />
            <button type="button" className="password-toggle" onClick={() => setVerPassword((v) => !v)}>
              {verPassword ? 'Ocultar' : 'Ver'}
            </button>
          </div>
        </label>
        <ul className="pw-rules" aria-live="polite">
          {REGLAS_PASSWORD.map((r) => {
            const ok = r.ok(form.password);
            return (
              <li key={r.id} className={ok ? 'is-ok' : ''}>
                <span aria-hidden="true">{ok ? '✓' : '○'}</span> {r.texto}
              </li>
            );
          })}
        </ul>
        <label className="field">
          <span>Repite la contraseña</span>
          <input name="confirmar" type={verPassword ? 'text' : 'password'} value={form.confirmar} onChange={cambiar}
            required autoComplete="new-password" />
          {form.confirmar && !coinciden && <small className="field__hint field__hint--error">No coincide</small>}
        </label>

        <button className="btn btn--primary btn--block" disabled={enviando || !passwordCumple(form.password) || !coinciden}>
          {enviando ? 'Creando cuenta…' : 'Registrarme'}
        </button>
        <p className="auth__alt">
          ¿Ya tienes cuenta? <Link to="/entrar" state={{ desde }}>Entra aquí</Link>
        </p>
      </form>
    </div>
  );
}
