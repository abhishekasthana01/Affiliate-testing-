export function Loader({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="loader">
      <span className="spinner" style={{ borderColor: '#94a3b8', borderTopColor: 'transparent' }} />
      <span style={{ fontSize: 14 }}>{text}</span>
    </div>
  );
}

export default Loader;
