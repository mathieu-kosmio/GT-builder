export default function Home() {
  return (
    <main className="wrap">
      <div className="logo">
        GT<span>builder</span>
      </div>
      <h1>De la réunion au livrable publié</h1>
      <p className="sub">
        Plateforme souveraine de production collaborative de livrables pour les groupes de
        travail des fédérations, pôles de compétitivité et associations professionnelles.
      </p>

      <div className="card">
        <strong>Cycle</strong>
        <p className="sub" style={{ margin: "6px 0 0" }}>
          réunion → transcript → compte rendu validé → propositions traçées → livrable →
          publication. L&apos;assistant suggère, l&apos;humain valide.
        </p>
      </div>

      <div className="card">
        <strong>Squelette amorçable</strong>
        <p className="sub" style={{ margin: "6px 0 0" }}>
          Santé de la stack : <a href="/api/health">/api/health</a>. Le back-office (auth,
          GT, réunions, livrables) se construit au-dessus de ce socle.
        </p>
      </div>
    </main>
  );
}
