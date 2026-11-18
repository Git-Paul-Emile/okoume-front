import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router';
import { cn } from '@/utils/text';
import { Spinner } from './Spinner';

type Variant = 'primary' | 'accent' | 'outline' | 'ghost' | 'light' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 rounded-md font-semibold whitespace-nowrap transition-[background-color,color,border-color,box-shadow,transform] duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 select-none';

const variants: Record<Variant, string> = {
  primary: 'bg-forest text-white hover:bg-forest-dark shadow-sm hover:shadow-md',
  accent: 'bg-mure text-white hover:bg-mure-dark shadow-sm hover:shadow-md',
  outline: 'border border-sage-dark bg-white text-ink hover:border-forest hover:text-forest',
  ghost: 'text-ink hover:bg-sage',
  light: 'bg-white text-forest hover:bg-ivory shadow-sm',
  danger: 'border border-danger/30 bg-white text-danger hover:bg-danger/5',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-sm',
  md: 'h-11 px-5 text-[15px]',
  lg: 'h-13 px-7 text-base',
};

function buttonClass({
  variant = 'primary',
  size = 'md',
  className,
}: {
  variant?: Variant;
  size?: Size;
  className?: string;
}) {
  return cn(base, variants[variant], sizes[size], className);
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  loadingText?: string;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, loading, loadingText, icon, className, children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonClass({ variant, size, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Spinner className="size-4" /> : icon}
      {loading && loadingText ? loadingText : children}
    </button>
  );
});

interface ButtonLinkProps extends LinkProps {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
}

export function ButtonLink({ variant, size, icon, className, children, ...rest }: ButtonLinkProps) {
  return (
    <Link
      className={buttonClass({ variant, size, className: typeof className === 'string' ? className : undefined })}
      {...rest}
    >
      {icon}
      {children}
    </Link>
  );
}
