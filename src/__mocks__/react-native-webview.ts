import React from 'react'

export const mockInjectJavaScript = jest.fn()

const WebView = React.forwardRef((_props, ref) => {
  React.useImperativeHandle(ref, () => ({
    injectJavaScript: mockInjectJavaScript,
  }))
  return null
})
export default WebView
