import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function AdminTemplate({ children }: { children: React.ReactNode }) {
  return (
    <div className="animate-slide-fade-in">
      <ErrorBoundary>
        {children}
      </ErrorBoundary>
    </div>
  );
}
