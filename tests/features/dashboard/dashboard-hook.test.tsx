import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react-native';

import { createTestQueryClient } from '@/tests/__mocks__/react-query';

jest.mock('@/features/plants/hooks/usePlants', () => ({
  usePlants: () => ({
    data: [
      {
        id: 'plant-1',
        nextWaterDueAt: new Date(Date.now() + 3600 * 1000).toISOString(),
      },
      {
        id: 'plant-2',
        nextWaterDueAt: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
      },
    ],
    isLoading: false,
  }),
}));

jest.mock('@/hooks/useNetworkState', () => ({
  useNetworkState: () => ({
    isOffline: false,
  }),
}));

describe('useDashboard', () => {
  it('should compute due today plants', () => {
    const queryClient = createTestQueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { useDashboard } = require('@/features/dashboard/hooks/useDashboard');
    const { result } = renderHook(() => useDashboard(), { wrapper });

    expect(result.current.plants.length).toBe(2);
    expect(result.current.dueToday.length).toBe(1);
  });
});