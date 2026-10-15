import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { ThemeProvider, useTheme } from './components/ThemeContext';
import { AuthProvider } from '@/features/auth/context/AuthContext';
import { AppRouterProvider } from './router';
import { installCrossOriginEventGuard } from '@/lib/utils/crossOriginGuard';

installCrossOriginEventGuard();

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
});

function ToastHost() {
  const { isDark } = useTheme();
  return <Toaster theme={isDark ? 'dark' : 'light'} position="top-center" richColors closeButton />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <AppRouterProvider />
          <ToastHost />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
