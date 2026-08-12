import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
  	extend: {
  		fontFamily: {
  			sans: ['Nunito', 'sans-serif'],
  		},
  		colors: {
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			},
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			/* ── Beam Brand Colors ─────────────────────────── */
  			// Pink (#FF2069) — Users
  			'beam-pink': {
  				50:  '#FFF0F4',
  				100: '#FFD6E2',
  				200: '#FFB3C8',
  				300: '#FF85A7',
  				400: '#FF4D82',
  				500: '#FF2069',
  				600: '#E6105A',
  				700: '#BF0D4B',
  				800: '#990A3C',
  				900: '#730831',
  				DEFAULT: '#FF2069',
  			},
  			// Charcoal (#06303A) — Dark base
  			'beam-charcoal': {
  				50:  '#E8F0F2',
  				100: '#C5D9DE',
  				200: '#9EBCC4',
  				300: '#739FA9',
  				400: '#4D8290',
  				500: '#2A6576',
  				600: '#184E5E',
  				700: '#0F3E4C',
  				800: '#06303A',
  				900: '#031D24',
  				DEFAULT: '#06303A',
  			},
  			// Teal (#54D9C9) — Partners
  			'beam-teal': {
  				50:  '#EDFCF9',
  				100: '#C8F6ED',
  				200: '#9DEEDE',
  				300: '#72E6CF',
  				400: '#54D9C9',
  				500: '#3CC5B5',
  				600: '#2DA99B',
  				700: '#228A7F',
  				800: '#186B63',
  				900: '#0F4D48',
  				DEFAULT: '#54D9C9',
  			},
  			// Purple (#5030E2) — Merchants / Businesses
  			'beam-purple': {
  				50:  '#F0EDFB',
  				100: '#D5CEF5',
  				200: '#B5A9EE',
  				300: '#9380E8',
  				400: '#7158E5',
  				500: '#5030E2',
  				600: '#4227C5',
  				700: '#351FA3',
  				800: '#281880',
  				900: '#1C105E',
  				DEFAULT: '#5030E2',
  			},
  			// Yellow (#F6C838) — Accents / Highlights
  			'beam-yellow': {
  				50:  '#FFFBEB',
  				100: '#FEF3C7',
  				200: '#FDE68A',
  				300: '#FBD85B',
  				400: '#F6C838',
  				500: '#EAB308',
  				600: '#CA9A06',
  				700: '#A37E05',
  				800: '#7C6104',
  				900: '#5C4803',
  				DEFAULT: '#F6C838',
  			},
  		},
  		letterSpacing: {
  			'beam': '-0.02em',
  			'beam-tight': '-0.03em',
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			},
  			'beam-pulse': {
  				'0%, 100%': { opacity: '1' },
  				'50%': { opacity: '0.7' },
  			},
  			'beam-glow': {
  				'0%, 100%': { boxShadow: '0 0 12px rgba(255, 32, 105, 0.3)' },
  				'50%': { boxShadow: '0 0 24px rgba(255, 32, 105, 0.6)' },
  			},
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
  			'beam-pulse': 'beam-pulse 2s ease-in-out infinite',
  			'beam-glow': 'beam-glow 2s ease-in-out infinite',
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;