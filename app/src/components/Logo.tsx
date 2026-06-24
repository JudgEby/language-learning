import { useId, type SVGProps } from 'react';

const LETTER_L = 'M6 4h16v4H14v34h26v10H6V4z';
const LETTER_L2 = 'M48 4h16v4H56v34h26v10H48V4z';

const GRADIENT_STOPS = [
  { offset: '0%', color: '#ff1493' },
  { offset: '35%', color: '#8338ec' },
  { offset: '65%', color: '#fb5607' },
  { offset: '100%', color: '#ffbe0b' },
] as const;

export interface LogoProps extends SVGProps<SVGSVGElement> {}

/** Languages Learning logo — two clean “L” letters with neon gradient. */
export function Logo({ className, ...props }: LogoProps) {
  const gradientId = `ll-gradient-${useId().replace(/:/g, '')}`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 88 56"
      fill="none"
      role="img"
      aria-label="Languages Learning"
      className={className}
      {...props}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="56" x2="88" y2="0" gradientUnits="userSpaceOnUse">
          {GRADIENT_STOPS.map(({ offset, color }) => (
            <stop key={offset} offset={offset} stopColor={color} />
          ))}
        </linearGradient>
      </defs>
      <path fill={`url(#${gradientId})`} d={LETTER_L} />
      <path fill={`url(#${gradientId})`} d={LETTER_L2} />
    </svg>
  );
}
