
export function StopPropagation({ children }: { children: ReactNode; }) {
  return (
    <span
      style={{ display: 'contents' }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      {children}
    </span>
  );
}
