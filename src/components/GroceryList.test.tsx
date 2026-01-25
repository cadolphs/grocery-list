import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { GroceryList } from './GroceryList';
import { createNullCheckedItemsStorage } from '../storage/CheckedItemsStorage';

describe('GroceryList', () => {
  test('renders without crashing', () => {
    render(<GroceryList />);
  });

  test('displays a list of grocery items', () => {
    const { getByText } = render(<GroceryList />);
    expect(getByText('Milk')).toBeTruthy();
    expect(getByText('Eggs')).toBeTruthy();
    expect(getByText('Bread')).toBeTruthy();
  });

  test('checked item has strikethrough style', () => {
    const { getByText } = render(<GroceryList />);
    const milkItem = getByText('Milk');

    fireEvent.press(milkItem);

    expect(milkItem).toHaveStyle({ textDecorationLine: 'line-through' });
  });

  test('checked item has grey color', () => {
    const { getByText } = render(<GroceryList />);
    const milkItem = getByText('Milk');

    fireEvent.press(milkItem);

    expect(milkItem).toHaveStyle({ color: '#888' });
  });

  test('can tap a checked item to uncheck it', () => {
    const { getByText } = render(<GroceryList />);
    const milkItem = getByText('Milk');

    // Check the item
    fireEvent.press(milkItem);
    expect(milkItem).toHaveStyle({ textDecorationLine: 'line-through' });

    // Uncheck the item
    fireEvent.press(milkItem);
    expect(milkItem).not.toHaveStyle({ textDecorationLine: 'line-through' });
  });

  test('can check multiple items independently', () => {
    const { getByText } = render(<GroceryList />);

    fireEvent.press(getByText('Milk'));
    fireEvent.press(getByText('Bread'));

    expect(getByText('Milk')).toHaveStyle({ textDecorationLine: 'line-through' });
    expect(getByText('Eggs')).not.toHaveStyle({ textDecorationLine: 'line-through' });
    expect(getByText('Bread')).toHaveStyle({ textDecorationLine: 'line-through' });
  });

  test('saves checked state to storage', async () => {
    const storage = createNullCheckedItemsStorage();
    const { getByText } = render(<GroceryList storage={storage} />);

    // Wait for initial load
    await waitFor(() => {
      expect(getByText('Milk')).toBeTruthy();
    });

    fireEvent.press(getByText('Milk'));

    await waitFor(async () => {
      const saved = await storage.load();
      expect(saved).toContain('Milk');
    });
  });

  test('loads checked state from storage on mount', async () => {
    const storage = createNullCheckedItemsStorage(['Eggs', 'Bread']);

    const { getByText } = render(<GroceryList storage={storage} />);

    await waitFor(() => {
      expect(getByText('Eggs')).toHaveStyle({ textDecorationLine: 'line-through' });
      expect(getByText('Bread')).toHaveStyle({ textDecorationLine: 'line-through' });
    });
    expect(getByText('Milk')).not.toHaveStyle({ textDecorationLine: 'line-through' });
  });

  test('shows empty checkbox for unchecked items', () => {
    const { getAllByText } = render(<GroceryList />);
    const emptyCheckboxes = getAllByText('☐');
    expect(emptyCheckboxes.length).toBe(3);
  });

  test('shows checked checkbox for checked items', () => {
    const { getByText, getAllByText } = render(<GroceryList />);

    fireEvent.press(getByText('Milk'));

    expect(getAllByText('☑').length).toBe(1);
    expect(getAllByText('☐').length).toBe(2);
  });
});
