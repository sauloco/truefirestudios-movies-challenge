import { defineVuetifyConfiguration } from 'vuetify-nuxt-module/custom-configuration'

// rusticit.com palette: charcoal #0e152e, purple #4a4ac0 / #6f6fbe, cyan #07c6ff as a sparing accent
export default defineVuetifyConfiguration({
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        dark: false,
        colors: {
          background: '#f7f7fb',
          surface: '#ffffff',
          'surface-variant': '#eeeef6',
          'on-surface-variant': '#59607a',
          primary: '#4a4ac0',
          secondary: '#6f6fbe',
          accent: '#07c6ff',
          info: '#0b6a8f',
          error: '#a8261f',
          warning: '#9a5b00',
          success: '#1b7a43'
        },
        variables: {
          'border-color': '#0e152e',
          'border-opacity': 0.12,
          'medium-emphasis-opacity': 0.75
        }
      },
      dark: {
        dark: true,
        colors: {
          background: '#0e152e',
          surface: '#151d3b',
          'surface-variant': '#1d2647',
          'on-surface-variant': '#a3a9c4',
          primary: '#8f8fe6',
          'on-primary': '#0e152e',
          secondary: '#6f6fbe',
          accent: '#07c6ff',
          info: '#07c6ff',
          error: '#ff9a92',
          warning: '#f1b95a',
          success: '#6fd69a'
        },
        variables: {
          'border-color': '#f3f4fa',
          'border-opacity': 0.14
        }
      }
    }
  },
  defaults: {
    global: { rounded: 'lg' },
    VCard: { rounded: 'xl', border: true, elevation: 0 },
    VChip: { rounded: 'pill' },
    VBtn: { rounded: 'pill' },
    VAlert: { rounded: 'lg' },
    VAutocomplete: { rounded: 'lg' },
    VAppBar: { rounded: 'pill', border: true, elevation: 0 },
    VFooter: { border: 't' }
  }
})
