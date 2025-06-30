module.exports = {
    darkMode: ["class"],
    content: ["./pages/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
  	extend: {
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		transitionDuration: {
  			'8000': '8000ms',
  		},
  		spacing: {
  			'0.5': '0.125rem',
  			'1': '0.125rem',
  			'1.5': '0.1875rem',
  			'2': '0.25rem',
  			'2.5': '0.3125rem',
  			'3': '0.375rem',
  			'3.5': '0.4375rem',
  			'4': '0.5rem',
  			'5': '0.625rem',
  			'6': '0.75rem',
  			'7': '0.875rem',
  			'8': '1rem',
  			'9': '1.125rem',
  			'10': '1.25rem',
  			'11': '1.375rem',
  			'12': '1.5rem',
  			'14': '1.75rem',
  			'16': '2rem',
  			'20': '2.5rem',
  			'24': '3rem',
  			'28': '3.5rem',
  			'32': '4rem',
  			'36': '4.5rem',
  			'40': '5rem',
  			'44': '5.5rem',
  			'48': '6rem',
  			'52': '6.5rem',
  			'56': '7rem',
  			'60': '7.5rem',
  			'64': '8rem',
  			'72': '9rem',
  			'80': '10rem',
  			'96': '12rem',
  		},
  		fontSize: {
  			'xs': ['0.375rem', { lineHeight: '0.5rem' }],
  			'sm': ['0.5rem', { lineHeight: '0.75rem' }],
  			'base': ['0.625rem', { lineHeight: '0.875rem' }],
  			'lg': ['0.75rem', { lineHeight: '1rem' }],
  			'xl': ['0.875rem', { lineHeight: '1.125rem' }],
  			'2xl': ['1rem', { lineHeight: '1.25rem' }],
  			'3xl': ['1.125rem', { lineHeight: '1.375rem' }],
  			'4xl': ['1.25rem', { lineHeight: '1.5rem' }],
  			'5xl': ['1.5rem', { lineHeight: '1.75rem' }],
  			'6xl': ['1.875rem', { lineHeight: '2.25rem' }],
  		},
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
};
