import { render, screen, fireEvent } from '@testing-library/react';
import { DateRangeFilter } from '../DateRangeFilter';

describe('DateRangeFilter', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('renders with "Any" as default option', () => {
    render(<DateRangeFilter onChange={mockOnChange} />);
    const select = screen.getByRole('combobox');
    expect(select).toHaveValue('');
  });

  it('calls onChange with Today preset', () => {
    render(<DateRangeFilter onChange={mockOnChange} />);
    const select = screen.getByRole('combobox');
    
    fireEvent.change(select, { target: { value: 'Today' } });
    
    expect(mockOnChange).toHaveBeenCalledTimes(1);
    const arg = mockOnChange.mock.calls[0][0];
    expect(arg).toHaveProperty('start');
    expect(arg).toHaveProperty('end');
    expect(arg.start).toBeInstanceOf(Date);
    expect(arg.end).toBeInstanceOf(Date);
  });

  it('calls onChange with This Week preset', () => {
    render(<DateRangeFilter onChange={mockOnChange} />);
    const select = screen.getByRole('combobox');
    
    fireEvent.change(select, { target: { value: 'This Week' } });
    
    expect(mockOnChange).toHaveBeenCalledTimes(1);
    const arg = mockOnChange.mock.calls[0][0];
    expect(arg?.start).toBeInstanceOf(Date);
    expect(arg?.end).toBeInstanceOf(Date);
  });

  it('calls onChange with This Month preset', () => {
    render(<DateRangeFilter onChange={mockOnChange} />);
    const select = screen.getByRole('combobox');
    
    fireEvent.change(select, { target: { value: 'This Month' } });
    
    expect(mockOnChange).toHaveBeenCalledTimes(1);
    const arg = mockOnChange.mock.calls[0][0];
    expect(arg?.start).toBeInstanceOf(Date);
    expect(arg?.end).toBeInstanceOf(Date);
  });

  it('shows custom date inputs when Custom is selected', () => {
    render(<DateRangeFilter onChange={mockOnChange} />);
    const select = screen.getByRole('combobox');
    
    fireEvent.change(select, { target: { value: 'custom' } });
    
    const dateInputs = screen.getAllByDisplayValue('');
    expect(dateInputs.length).toBeGreaterThanOrEqual(2);
  });

  it('displays current value range when provided', () => {
    const value = {
      start: new Date('2024-01-01'),
      end: new Date('2024-12-31')
    };
    
    render(<DateRangeFilter value={value} onChange={mockOnChange} />);
    
    // Date format varies by locale, just check both dates are present
    expect(screen.getByText(/2024/)).toBeInTheDocument();
    const dateDisplay = screen.getByText(/–/);
    expect(dateDisplay).toBeInTheDocument();
  });

  it('calls onChange with undefined when cleared', () => {
    const value = {
      start: new Date('2024-01-01'),
      end: new Date('2024-12-31')
    };
    
    render(<DateRangeFilter value={value} onChange={mockOnChange} />);
    const select = screen.getByRole('combobox');
    
    fireEvent.change(select, { target: { value: '' } });
    
    expect(mockOnChange).toHaveBeenCalledWith(undefined);
  });

  it('handles custom date input changes', () => {
    render(<DateRangeFilter onChange={mockOnChange} />);
    const select = screen.getByRole('combobox');
    
    // Enable custom mode
    fireEvent.change(select, { target: { value: 'custom' } });
    
    const dateInputs = screen.getAllByDisplayValue('');
    const startInput = dateInputs[0];
    
    fireEvent.change(startInput, { target: { value: '2024-01-15' } });
    
    expect(mockOnChange).toHaveBeenCalled();
    const arg = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0];
    expect(arg?.start).toBeInstanceOf(Date);
  });
});
