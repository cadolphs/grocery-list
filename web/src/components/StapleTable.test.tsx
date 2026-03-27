import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StapleTable } from './StapleTable';
import { StapleItem } from '../types/domain';

const makeStaple = (
  overrides: Partial<StapleItem> & Pick<StapleItem, 'id' | 'name' | 'houseArea'>
): StapleItem => ({
  type: 'staple',
  storeLocation: { section: '', aisleNumber: null },
  createdAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

describe('StapleTable', () => {
  it('renders staples grouped by area', () => {
    const staples: StapleItem[] = [
      makeStaple({ id: '1', name: 'Milk', houseArea: 'Kitchen', storeLocation: { section: 'Dairy', aisleNumber: 2 } }),
      makeStaple({ id: '2', name: 'Bread', houseArea: 'Kitchen', storeLocation: { section: 'Bakery', aisleNumber: 3 } }),
      makeStaple({ id: '3', name: 'Shampoo', houseArea: 'Bathroom', storeLocation: { section: 'Personal Care', aisleNumber: 7 } }),
    ];

    render(<StapleTable staples={staples} />);

    // Area headers are rendered
    expect(screen.getByText('Kitchen')).toBeInTheDocument();
    expect(screen.getByText('Bathroom')).toBeInTheDocument();

    // All staple names are rendered
    expect(screen.getByText('Milk')).toBeInTheDocument();
    expect(screen.getByText('Bread')).toBeInTheDocument();
    expect(screen.getByText('Shampoo')).toBeInTheDocument();

    // Store location details are rendered
    expect(screen.getByText('Dairy')).toBeInTheDocument();
    expect(screen.getByText('Bakery')).toBeInTheDocument();
    expect(screen.getByText('Personal Care')).toBeInTheDocument();
  });

  it('shows empty state when no staples', () => {
    render(<StapleTable staples={[]} />);

    expect(screen.getByText('No staples yet')).toBeInTheDocument();
  });

  it('displays aisle number when available', () => {
    const staples: StapleItem[] = [
      makeStaple({ id: '1', name: 'Milk', houseArea: 'Kitchen', storeLocation: { section: 'Dairy', aisleNumber: 2 } }),
      makeStaple({ id: '2', name: 'Salt', houseArea: 'Kitchen', storeLocation: { section: 'Spices', aisleNumber: null } }),
    ];

    render(<StapleTable staples={staples} />);

    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});
