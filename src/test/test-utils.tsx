import { render, RenderOptions } from '@testing-library/react';
import { ReactElement, ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';

interface WrapperProps {
  children: ReactNode;
}

function AllTheProviders({ children }: WrapperProps) {
  return <BrowserRouter>{children}</BrowserRouter>;
}

function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return {
    user: userEvent.setup(),
    ...render(ui, { wrapper: AllTheProviders, ...options }),
  };
}

export * from '@testing-library/react';
export { customRender as render, userEvent };
