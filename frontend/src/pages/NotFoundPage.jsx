import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

export default function NotFoundPage() {
  return (
    <>
      <Helmet>
        <title>Page Not Found | Doozles</title>
        <meta name="robots" content="noindex, follow" />
      </Helmet>
      <section className="max-w-2xl mx-auto px-5 py-20 text-center">
        <div className="inline-block bg-[#fca5a5] border-[4px] border-black shadow-[6px_6px_0px_#000] px-6 py-3 -rotate-2 mb-8">
          <span className="text-5xl sm:text-6xl font-black">404</span>
        </div>
        <h1 className="text-[clamp(2rem,6vw,3.5rem)] font-black uppercase leading-none mb-5">
          This page went off the board
        </h1>
        <p className="font-body text-lg text-gray-700 mb-10">
          The link might be old, or the room may have closed. Pick a game from the hub to keep playing.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            to="/"
            className="bg-[#7dd3fc] border-[4px] border-black px-6 py-3 font-black uppercase tracking-widest shadow-[5px_5px_0px_#000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_#000] transition-all"
          >
            Back to Hub
          </Link>
          <Link
            to="/blog"
            className="bg-white border-[4px] border-black px-6 py-3 font-black uppercase tracking-widest shadow-[5px_5px_0px_#000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_#000] transition-all"
          >
            Read the Blog
          </Link>
        </div>
      </section>
    </>
  );
}
