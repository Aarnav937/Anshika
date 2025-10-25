import { render, screen, fireEvent } from '@testing-library/react';
import { FileSizeFilter } from '../FileSizeFilter';

describe('FileSizeFilter', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('renders with "Any" as default option', () => {
    render(<FileSizeFilter onChange={mockOnChange} />);
    const select = screen.getByRole('combobox');
    expect(select).toHaveValue('');
  });

  it('calls onChange with Small preset (<100KB)', () => {
    render(<FileSizeFilter onChange={mockOnChange} />);
    const select = screen.getByRole('combobox');
    
    fireEvent.change(select, { target: { value: 'Small (<100KB)' } });
    
    expect(mockOnChange).toHaveBeenCalledTimes(1);
    const arg = mockOnChange.mock.calls[0][0];
    expect(arg).toEqual({ min: 0, max: 102400 });
  });

  it('calls onChange with Medium preset (100KB–1MB)', () => {
    render(<FileSizeFilter onChange={mockOnChange} />);
    const select = screen.getByRole('combobox');
    
    fireEvent.change(select, { target: { value: 'Medium (100KB–1MB)' } });
    
    expect(mockOnChange).toHaveBeenCalledTimes(1);
    const arg = mockOnChange.mock.calls[0][0];
    expect(arg).toEqual({ min: 102400, max: 1048576 });
  });

  it('calls onChange with Large preset (>1MB)', () => {
    render(<FileSizeFilter onChange={mockOnChange} />);
    const select = screen.getByRole('combobox');
    
    fireEvent.change(select, { target: { value: 'Large (>1MB)' } });
    
    expect(mockOnChange).toHaveBeenCalledTimes(1);
    const arg = mockOnChange.mock.calls[0][0];
    expect(arg).toEqual({ min: 1048576, max: 52428800 });
  });

  it('calls onChange with undefined when "Any" is selected', () => {
    const value = { min: 0, max: 102400 };
    render(<FileSizeFilter value={value} onChange={mockOnChange} />);
    const select = screen.getByRole('combobox');
    
    fireEvent.change(select, { target: { value: 'Any' } });
    
    expect(mockOnChange).toHaveBeenCalledWith(undefined);
  });

  it('displays current value range when provided', () => {
    const value = { min: 102400, max: 1048576 };
    
    render(<FileSizeFilter value={value} onChange={mockOnChange} />);
    
    expect(screen.getByText(/100KB – 1024KB/)).toBeInTheDocument();
  });

  it('shows correct preset when value matches preset range', () => {
    const value = { min: 0, max: 102400 };
    
    render(<FileSizeFilter value={value} onChange={mockOnChange} />);
    const select = screen.getByRole('combobox');
    
    expect(select).toHaveValue('Small (<100KB)');
  });

  it('does not show value display span when no value is set', () => {
    render(<FileSizeFilter onChange={mockOnChange} />);
    
    // Check there's no separate display span (options in select will have KB text)
    const spans = screen.queryAllByText(/\d+KB – \d+KB/);
    expect(spans.length).toBe(0);
  });
});
