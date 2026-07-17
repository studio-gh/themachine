export default function App() {
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#020617', color: '#f8fafc', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <section style={{ textAlign: 'center', padding: '2rem', borderRadius: '1rem', border: '1px solid #334155', maxWidth: '36rem' }}>
        <p style={{ textTransform: 'uppercase', letterSpacing: '0.3em', color: '#38bdf8', marginBottom: '0.75rem' }}>The Machine</p>
        <h1 style={{ fontSize: '2rem', margin: '0 0 0.75rem' }}>The app is running.</h1>
        <p style={{ margin: 0, lineHeight: 1.6, color: '#cbd5e1' }}>
          The blank page was caused by a missing app component import. This fallback view is now in place.
        </p>
      </section>
    </main>
  )
}
