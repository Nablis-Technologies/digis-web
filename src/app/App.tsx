import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './components/ThemeContext';
import { AuthProvider } from '@/features/auth/context/AuthContext';
import { AppRouterProvider } from './router';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <AppRouterProvider />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
