import { Link } from 'react-router-dom';

export default function GameCard({ game, to, index = 0, badge, cta = 'Play Now' }) {
  return (
    <Link
      to={to}
      style={{ animationDelay: `${(index + 1) * 80}ms` }}
      className={`group animate-sketch-pop flex min-h-full flex-col bg-white border-[4px] border-black shadow-[8px_8px_0px_#000] transition-all duration-200 ${game.tilt} cursor-pointer hover:-translate-y-2 hover:rotate-0 hover:shadow-[12px_12px_0px_#000]`}
    >
      <div className={`${game.headerColor} border-b-[4px] border-black px-5 py-4 flex items-center justify-between gap-3`}>
        <h3 className="text-2xl lg:text-3xl font-black uppercase tracking-widest text-black leading-none">
          {game.title}
        </h3>
        {badge && (
          <span className="shrink-0 bg-white border-[2px] border-black px-2 py-0.5 text-[11px] font-black uppercase tracking-wider">
            {badge}
          </span>
        )}
      </div>

      <div className="m-5 mb-0 border-[3px] border-black bg-white shadow-[inset_2px_2px_0px_rgba(0,0,0,0.1)] overflow-hidden">
        <img
          src={game.image}
          alt={`${game.title} preview`}
          loading="lazy"
          width="640"
          height="360"
          className="aspect-video w-full object-contain bg-white p-2 transition-transform duration-300 group-hover:scale-[1.05]"
        />
      </div>

      <div className="p-5 flex flex-col flex-1">
        <p className="font-body text-base font-semibold text-gray-700 leading-relaxed flex-1">
          {game.description}
        </p>
        {game.players && (
          <p className="mt-2 text-xs font-black uppercase tracking-widest text-gray-500">{game.players}</p>
        )}
        <span
          className={`${game.buttonColor} text-black border-[3px] border-black shadow-[4px_4px_0px_#000] group-hover:translate-y-[2px] group-hover:translate-x-[2px] group-hover:shadow-[2px_2px_0px_#000] transition-all mt-5 inline-flex justify-center px-5 py-3 text-sm lg:text-base font-black uppercase tracking-widest rounded`}
        >
          {cta}
        </span>
      </div>
    </Link>
  );
}
