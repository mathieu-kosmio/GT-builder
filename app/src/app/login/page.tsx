export default function Login() {
  return (
    <main className="wrap">
      <div className="logo">
        GT<span>builder</span>
      </div>
      <h1>Connexion</h1>
      <p className="sub">
        Écran de connexion (stub). Le flux d&apos;authentification — résolution du tenant par
        sous-domaine, vérification du mot de passe (ou SSO Keycloak), émission du cookie de
        session JWT <code>gtb_session</code> — reste à brancher sur <code>user_account</code> /{" "}
        <code>membership</code>.
      </p>

      <div className="card">
        <label>Email</label>
        <input className="field" type="email" placeholder="vous@federation.fr" disabled />
        <label>Mot de passe</label>
        <input className="field" type="password" placeholder="••••••••" disabled />
        <button className="btn" disabled>
          Se connecter
        </button>
      </div>
    </main>
  );
}
