import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Select } from './Select';

describe('Select', () => {
  const defaultOptions = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3' },
  ];

  it('renders with label', () => {
    render(<Select label="Test Select" name="test-select" options={defaultOptions} />);
    expect(screen.getByLabelText('Test Select')).toBeInTheDocument();
  });

  it('renders all options', () => {
    render(<Select options={defaultOptions} />);
    const select = screen.getByRole('combobox');

    defaultOptions.forEach((option) => {
      expect(select).toContainHTML(option.label);
    });
  });

  it('renders with placeholder', () => {
    render(
      <Select
        options={defaultOptions}
        placeholder="Select an option"
      />
    );

    expect(screen.getByText('Select an option')).toBeInTheDocument();
  });

  it('shows error message', () => {
    render(
      <Select
        label="Test Select"
        options={defaultOptions}
        error="This field is required"
      />
    );

    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  it('shows hint when no error', () => {
    render(
      <Select
        label="Test Select"
        options={defaultOptions}
        hint="Select your preferred option"
      />
    );

    expect(screen.getByText('Select your preferred option')).toBeInTheDocument();
  });

  it('hides hint when error is present', () => {
    render(
      <Select
        label="Test Select"
        options={defaultOptions}
        hint="Select your preferred option"
        error="This field is required"
      />
    );

    expect(screen.queryByText('Select your preferred option')).not.toBeInTheDocument();
    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  it('shows required indicator', () => {
    render(
      <Select
        label="Test Select"
        options={defaultOptions}
        required
      />
    );

    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('can be disabled', () => {
    render(
      <Select
        label="Test Select"
        options={defaultOptions}
        disabled
      />
    );

    expect(screen.getByRole('combobox')).toBeDisabled();
  });

  it('calls onChange when selection changes', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();

    render(
      <Select
        label="Test Select"
        options={defaultOptions}
        onChange={handleChange}
      />
    );

    await user.selectOptions(screen.getByRole('combobox'), 'option2');

    expect(handleChange).toHaveBeenCalled();
  });
});
