import type { CapacitorConfig } from '@capacitor/cli'

// Phone apps wrap the same web build. The appId is permanent once published
// to the stores, so set the final one before the first store upload.
const config: CapacitorConfig = {
  appId: 'app.studyapp.mobile',
  appName: 'Studyapp',
  webDir: 'dist',
  backgroundColor: '#0b0f0e',
}

export default config
