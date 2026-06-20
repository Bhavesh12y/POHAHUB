export default function ComingSoon({ title = 'Coming Soon', subtitle = 'This game is under development.' }) {
  return (
    <div className="max-w-lg mx-auto px-5 py-24 text-center">
      <div className="paper-panel bg-white p-10">
        <div className="sketch-border inline-block bg-pink-300 px-5 py-2 mb-5 -rotate-2">
          <span className="text-[clamp(0.9rem,2vw,1.25rem)] font-black uppercase">Under Construction</span>
        </div>
        <h2 className="text-[clamp(1.5rem,4vw,2.5rem)] font-black uppercase mb-3 text-ink">{title}</h2>
        <p className="text-[clamp(0.9rem,1.8vw,1.125rem)] font-bold text-gray-800">{subtitle}</p>
      </div>
    </div>
  );
}
