export default function ComingSoon({ title = 'Coming Soon', subtitle = 'This game is under development.' }) {
  return (
    <div className="max-w-lg mx-auto px-4 py-24 text-center">
      <div className="glass-card p-10">
        <div className="text-5xl mb-4">🚧</div>
        <h2 className="text-2xl font-bold mb-2">{title}</h2>
        <p className="text-hub-muted">{subtitle}</p>
      </div>
    </div>
  );
}
