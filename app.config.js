// Dynamic Expo config — merges static app.json and runtime flags for web E2E (Playwright).
const appJson = require('./app.json')

module.exports = () => ({
  ...appJson.expo,
  extra: {
    ...appJson.expo.extra,
    skycastE2eWeb: process.env.EXPO_PUBLIC_SKYCAST_E2E_WEB === '1',
  },
})
