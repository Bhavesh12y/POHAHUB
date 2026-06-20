export default function ComingSoon({ title = 'Coming Soon', subtitle = 'This game is under development.' }) {
  return (
    <div className="max-w-lg mx-auto px-5 py-24 text-center">
      <div className="paper-panel bg-white p-10">
        <div className="sketch-border inline-block bg-pink-300 px-5 py-2 mb-5 -rotate-2">
          <span className="text-xl font-black uppercase">Under Construction</span>
        </div>
        <h2 className="text-4xl font-black uppercase mb-3 text-ink">{title}</h2>
        <p className="text-lg font-bold text-gray-800">{subtitle}</p>
      </div>
    </div>
  );
}
