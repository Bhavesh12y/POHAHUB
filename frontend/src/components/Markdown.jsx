import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Link } from 'react-router-dom';

// Long-form text renderer for blog posts and game guides.
// Headings keep the sketch display font; body copy uses the readable prose font.
const components = {
  h1: ({ children }) => <h2 className="sketch-h2">{children}</h2>,
  h2: ({ children }) => <h2 className="sketch-h2">{children}</h2>,
  h3: ({ children }) => <h3 className="sketch-h3">{children}</h3>,
  h4: ({ children }) => <h4 className="sketch-h4">{children}</h4>,
  a: ({ href = '', children }) =>
    href.startsWith('/') ? (
      <Link to={href}>{children}</Link>
    ) : (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    ),
  table: ({ children }) => (
    <div className="sketch-table-wrap">
      <table>{children}</table>
    </div>
  ),
};

export default function Markdown({ children, className = '' }) {
  return (
    <div className={`sketch-prose ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
