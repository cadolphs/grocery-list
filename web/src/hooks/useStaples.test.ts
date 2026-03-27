import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const mockOnSnapshot = vi.fn();

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => 'mock-doc-ref'),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
}));

import { useStaples } from './useStaples';

describe('useStaples', () => {
  const mockDb = {} as any;
  const mockUid = 'user-123';

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnSnapshot.mockImplementation(() => vi.fn()); // returns unsubscribe
  });

  it('starts in loading state with empty staples', () => {
    const { result } = renderHook(() => useStaples(mockDb, mockUid));

    expect(result.current.loading).toBe(true);
    expect(result.current.staples).toEqual([]);
  });

  it('returns staples from firestore document snapshot', async () => {
    const stapleItems = [
      { id: '1', name: 'Milk', houseArea: 'Kitchen', storeLocation: { section: 'Dairy', aisleNumber: 2 }, type: 'staple', createdAt: '2024-01-01' },
      { id: '2', name: 'Soap', houseArea: 'Bathroom', storeLocation: { section: 'Care', aisleNumber: 5 }, type: 'staple', createdAt: '2024-01-02' },
    ];

    mockOnSnapshot.mockImplementation((_docRef: unknown, callback: (snapshot: any) => void) => {
      callback({
        exists: () => true,
        data: () => ({ items: stapleItems }),
      });
      return vi.fn();
    });

    const { result } = renderHook(() => useStaples(mockDb, mockUid));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.staples).toEqual(stapleItems);
  });

  it('returns empty array when document does not exist', async () => {
    mockOnSnapshot.mockImplementation((_docRef: unknown, callback: (snapshot: any) => void) => {
      callback({
        exists: () => false,
        data: () => undefined,
      });
      return vi.fn();
    });

    const { result } = renderHook(() => useStaples(mockDb, mockUid));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.staples).toEqual([]);
  });

  it('cleans up subscription on unmount', () => {
    const unsubscribe = vi.fn();
    mockOnSnapshot.mockImplementation(() => unsubscribe);

    const { unmount } = renderHook(() => useStaples(mockDb, mockUid));
    unmount();

    expect(unsubscribe).toHaveBeenCalled();
  });
});
