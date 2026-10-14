import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { SEO_CONFIG, absoluteUrl, defaultSeo, gamesSeo, normalizeGameId } from '../config/seo.js';
import { getGame } from '../data/games.js';
import { getPlayerName, setPlayerName } from '../lib/playerName.js';
import Markdown from '../components/Markdown.jsx';
import Modal, { NameModal } from '../components/Modal.jsx';
import { BotIcon, DeviceIcon, GlobeIcon, PlayIcon, TrophyIcon, ArrowLeftIcon } from '../components/Icons.jsx';
import NotFoundPage from './NotFoundPage.jsx';

function JsonLd({ data }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mr-2" aria-hidden="true">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

// Real top-3 from the leaderboard service. Renders nothing until scores exist.
function Leaderboard({ gameId }) {
  const [scores, setScores] = useState([]);

  useEffect(() => {
    let cancelled = false;
    import('../lib/socket.js').then(({ emitWithAck }) =>
      emitWithAck('leaderboard:get', gameId, 8000).then((res) => {
        if (!cancelled && res?.ok && Array.isArray(res.leaderboard)) setScores(res.leaderboard);
      }),
    );
    return () => {
      cancelled = true;
    };
  }, [gameId]);

  if (scores.length === 0) return null;

  return (
    <section className="mb-10 animate-sketch-pop">
      <div className="bg-[#bef264] border-[4px] border-black shadow-[8px_8px_0px_#000] p-6 -rotate-1 max-w-2xl mx-auto">
        <h2 className="text-xl font-black uppercase border-b-[3px] border-black pb-3 mb-4 flex items-center gap-2">
          <TrophyIcon className="w-5 h-5" /> Global Top Scores
        </h2>
        <ol className="space-y-3 font-bold">
          {scores.map((entry, idx) => (
            <li key={entry.id || idx} className="flex justify-between items-center bg-white border-[2px] border-black p-2">
              <span className="uppercase">
                {idx + 1}. {entry.name}
              </span>
              <span className="bg-[#facc15] px-2 border-l-[2px] border-black">{entry.score.toLocaleString()}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

const MODE_BUTTONS = {
  online: { label: 'Play Online', Icon: GlobeIcon, color: 'bg-[#7dd3fc]' },
  solo: { label: 'Play Now', Icon: PlayIcon, color: 'bg-[#7dd3fc]' },
  local: { label: 'Local (1 device)', Icon: DeviceIcon, color: 'bg-[#fde047]' },
  bot: { label: 'vs Bot', Icon: BotIcon, color: 'bg-[#86efac]' },
};

export default function GameSeoPage({ slug }) {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const rawGameId = slug || gameId || '';
  const normalizedGameId = normalizeGameId(rawGameId);
  const game = gamesSeo[normalizedGameId];
  const catalogEntry = game ? getGame(game.catalogId) : null;

  const [pendingPath, setPendingPath] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  useEffect(() => {
    setShareUrl(window.location.href);
  }, [rawGameId]);

  if (!game) return <NotFoundPage />;
  if (rawGameId !== game.path.slice(1)) return <Navigate to={game.path} replace />;

  const canonicalUrl = absoluteUrl(game.path);
  const gameImageUrl = catalogEntry?.image ? absoluteUrl(catalogEntry.image) : defaultSeo.image;
  const modes = catalogEntry?.modes ?? ['online'];
  const isSolo = modes.includes('solo');
  const relatedGames = (game.related || []).map((id) => gamesSeo[id]).filter(Boolean);

  const playTargets = modes.map((mode) => ({
    mode,
    path: mode === 'local' ? `${game.playPath}/local` : mode === 'bot' ? `${game.playPath}/bot` : game.playPath,
    ...MODE_BUTTONS[mode],
  }));

  const videoGameSchema = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: game.name,
    description: game.description,
    url: canonicalUrl,
    image: gameImageUrl,
    applicationCategory: 'Game',
    gamePlatform: 'Web browser',
    playMode: isSolo ? 'SinglePlayer' : 'MultiPlayer',
    publisher: { '@type': 'Organization', name: SEO_CONFIG.siteName, url: absoluteUrl('/') },
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: SEO_CONFIG.siteName, item: absoluteUrl('/') },
      { '@type': 'ListItem', position: 2, name: `${game.name} guide`, item: canonicalUrl },
    ],
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: game.faq.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };

  const goPlay = (path) => {
    if (getPlayerName()) navigate(path);
    else setPendingPath(path);
  };

  const shareText = `Play ${game.name} on Doozles! ${game.intro}`;
  const openWhatsApp = () =>
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`, '_blank');
  const openTwitter = () =>
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
      '_blank',
    );
  const copyToClipboard = () => {
    navigator.clipboard?.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <Helmet>
        <title>{game.title}</title>
        <meta name="description" content={game.description} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:type" content="article" />
        <meta property="og:site_name" content={SEO_CONFIG.siteName} />
        <meta property="og:title" content={game.title} />
        <meta property="og:description" content={game.description} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:image" content={gameImageUrl} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={game.title} />
        <meta name="twitter:description" content={game.description} />
        <meta name="twitter:image" content={gameImageUrl} />
      </Helmet>

      <JsonLd data={videoGameSchema} />
      <JsonLd data={breadcrumbSchema} />
      <JsonLd data={faqSchema} />

      <article className="max-w-4xl mx-auto px-5 py-12 sm:py-16">
        <header className="mb-12 flex flex-col items-center text-center animate-sketch-pop">
          <span className="inline-block bg-[#facc15] border-[3px] border-black shadow-[4px_4px_0px_#000] px-4 py-2 -rotate-1 text-sm font-black uppercase tracking-widest mb-5">
            Game guide
          </span>

          <h1 className="text-[clamp(3rem,8vw,5.5rem)] font-black uppercase leading-[0.9] tracking-normal text-black mb-6 w-full">
            {game.name}
          </h1>

          <p className="font-body text-lg sm:text-xl font-semibold text-gray-800 leading-relaxed mb-10 max-w-3xl">
            {game.intro}
          </p>

          <div className="w-full mb-10">
            <div className="bg-white border-[4px] border-black shadow-[8px_8px_0px_#000] overflow-hidden aspect-video flex items-center justify-center rotate-1 hover:rotate-0 transition-transform duration-300 p-2 sm:p-4">
              <img
                src={catalogEntry?.image || '/og-image.svg'}
                alt={`${game.name} on Doozles`}
                width="960"
                height="540"
                className="w-full h-full object-contain scale-[0.95]"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-4 w-full justify-center max-w-3xl mb-8">
            {playTargets.map(({ mode, path, label, Icon, color }, idx) => (
              <button
                key={mode}
                type="button"
                onClick={() => goPlay(path)}
                className={`${idx === 0 ? 'flex-[2] min-w-[220px] text-xl py-5' : 'flex-1 min-w-[170px] text-base py-4'} inline-flex items-center justify-center gap-2 ${color} text-black border-[4px] border-black px-6 font-black uppercase tracking-widest shadow-[6px_6px_0px_#000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_#000] transition-all ${idx % 2 ? '-rotate-1' : 'rotate-1'}`}
              >
                <Icon className="w-5 h-5" /> {label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setShowShareModal(true)}
              className="flex-1 min-w-[150px] inline-flex items-center justify-center bg-[#fca5a5] text-black border-[4px] border-black px-6 py-4 font-black uppercase tracking-widest text-base shadow-[6px_6px_0px_#000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_#000] transition-all -rotate-1"
            >
              <ShareIcon /> Share
            </button>
          </div>

          {game.facts && (
            <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-3xl mb-8">
              {game.facts.map(({ label, value }) => (
                <div key={label} className="bg-white border-[3px] border-black shadow-[4px_4px_0px_#000] px-4 py-3 text-left">
                  <dt className="text-xs font-black uppercase tracking-widest text-gray-500">{label}</dt>
                  <dd className="font-body font-extrabold text-base text-black mt-1">{value}</dd>
                </div>
              ))}
            </dl>
          )}

          <Link
            to={isSolo ? '/?mode=solo' : '/'}
            className="inline-flex items-center gap-2 bg-white text-black border-[3px] border-black px-6 py-3 font-black uppercase tracking-widest text-sm shadow-[4px_4px_0px_#000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_#000] transition-all"
          >
            <ArrowLeftIcon /> Back to {isSolo ? 'Single Player' : 'Hub'}
          </Link>
        </header>

        {isSolo && <Leaderboard gameId={game.catalogId} />}

        <section className="paper-panel bg-white p-6 sm:p-10">
          <Markdown>{game.body}</Markdown>
        </section>

        <section className="paper-panel bg-white p-6 sm:p-10 mt-8">
          <h2 className="text-3xl font-black uppercase mb-6">Frequently asked questions</h2>
          <div className="space-y-4">
            {game.faq.map((item) => (
              <details key={item.question} className="group border-[3px] border-black bg-white p-4 open:bg-[#fef9c3] open:shadow-[4px_4px_0px_#000] transition-all">
                <summary className="cursor-pointer font-body font-extrabold text-lg text-black list-none flex justify-between gap-4">
                  {item.question}
                  <span className="font-black text-xl leading-none group-open:rotate-45 transition-transform" aria-hidden="true">
                    +
                  </span>
                </summary>
                <p className="mt-3 font-body font-medium text-gray-800 leading-relaxed text-base">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        {relatedGames.length > 0 && (
          <section className="mt-12">
            <h2 className="text-3xl font-black uppercase mb-6 text-center">Related games</h2>
            <div className="grid gap-5 sm:grid-cols-3">
              {relatedGames.map((relatedGame) => (
                <Link
                  key={relatedGame.path}
                  to={relatedGame.path}
                  className="bg-white border-[4px] border-black shadow-[6px_6px_0px_#000] p-5 hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_#000] transition-all"
                >
                  <span className="block font-black uppercase text-xl mb-1">{relatedGame.name}</span>
                  <span className="block font-body text-sm font-semibold text-gray-700 leading-snug">{relatedGame.intro}</span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>

      <NameModal
        open={Boolean(pendingPath)}
        onClose={() => setPendingPath(null)}
        onSave={(name) => {
          setPlayerName(name);
          const target = pendingPath;
          setPendingPath(null);
          navigate(target);
        }}
      />

      <Modal open={showShareModal} onClose={() => setShowShareModal(false)} title="Share Game">
        <div className="flex flex-col gap-4">
          <button
            onClick={openWhatsApp}
            className="w-full bg-[#4ade80] text-black border-[3px] border-black p-4 text-lg font-black uppercase shadow-[4px_4px_0px_#000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_#000] transition-all text-left flex items-center"
          >
            <svg className="w-6 h-6 mr-3" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" /></svg>
            WhatsApp
          </button>
          <button
            onClick={openTwitter}
            className="w-full bg-[#38bdf8] text-black border-[3px] border-black p-4 text-lg font-black uppercase shadow-[4px_4px_0px_#000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_#000] transition-all text-left flex items-center"
          >
            <svg className="w-6 h-6 mr-3" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
            Twitter / X
          </button>
          <button
            onClick={copyToClipboard}
            className="w-full bg-[#fcd34d] text-black border-[3px] border-black p-4 text-lg font-black uppercase shadow-[4px_4px_0px_#000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_#000] transition-all text-left flex items-center justify-between"
          >
            <span>Copy Link</span>
            {copied && <span className="text-sm bg-black text-white px-2 py-1 rounded">Copied!</span>}
          </button>
        </div>
      </Modal>
    </>
  );
}
