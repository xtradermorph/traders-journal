export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen">
      <div className="flex-1 flex flex-col">
      {children}
      </div>
    </div>
  );
}
