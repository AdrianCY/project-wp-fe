declare global {
  interface Window {
    fbAsyncInit: () => void
    FB: {
      init: (params: {
        appId: string
        autoLogAppEvents?: boolean
        xfbml?: boolean
        version: string
      }) => void
      login: (
        callback: (response: FacebookLoginResponse) => void,
        options?: FacebookLoginOptions
      ) => void
      getLoginStatus: (
        callback: (response: FacebookLoginResponse) => void
      ) => void
    }
  }
}

export interface FacebookLoginResponse {
  status: 'connected' | 'not_authorized' | 'unknown'
  authResponse?: {
    accessToken: string
    expiresIn: number
    signedRequest: string
    userID: string
    code?: string
  }
}

interface FacebookLoginOptions {
  config_id?: string
  response_type?: string
  override_default_response_type?: boolean
  scope?: string
  extras?: {
    setup?: Record<string, unknown>
    featureType?: string
    sessionInfoVersion?: string
  }
}

let sdkLoaded = false
let sdkLoading: Promise<void> | null = null

export function loadFacebookSDK(): Promise<void> {
  if (sdkLoaded) {
    return Promise.resolve()
  }

  if (sdkLoading) {
    return sdkLoading
  }

  sdkLoading = new Promise((resolve, reject) => {
    const appId = import.meta.env.VITE_FACEBOOK_APP_ID

    if (!appId) {
      reject(new Error('VITE_FACEBOOK_APP_ID is not configured'))
      return
    }

    window.fbAsyncInit = function () {
      window.FB.init({
        appId,
        autoLogAppEvents: true,
        xfbml: true,
        version: 'v21.0',
      })
      sdkLoaded = true
      resolve()
    }

    // Load the SDK asynchronously
    const script = document.createElement('script')
    script.id = 'facebook-jssdk'
    script.src = 'https://connect.facebook.net/en_US/sdk.js'
    script.async = true
    script.defer = true
    script.crossOrigin = 'anonymous'

    script.onerror = () => {
      reject(new Error('Failed to load Facebook SDK'))
    }

    // Check if script already exists
    if (!document.getElementById('facebook-jssdk')) {
      const firstScript = document.getElementsByTagName('script')[0]
      firstScript.parentNode?.insertBefore(script, firstScript)
    }
  })

  return sdkLoading
}

export interface WhatsAppSignupResult {
  code: string
  accessToken?: string
}

export interface WhatsAppSignupOptions {
  onSuccess: (result: WhatsAppSignupResult) => void
  onError: (error: Error) => void
  onCancel?: () => void
}

export async function launchWhatsAppSignup(
  options: WhatsAppSignupOptions
): Promise<void> {
  const { onSuccess, onError, onCancel } = options

  try {
    await loadFacebookSDK()
  } catch (err) {
    onError(err instanceof Error ? err : new Error('Failed to load Facebook SDK'))
    return
  }

  const configId = import.meta.env.VITE_FACEBOOK_CONFIG_ID

  if (!configId) {
    onError(new Error('VITE_FACEBOOK_CONFIG_ID is not configured'))
    return
  }

  window.FB.login(
    (response) => {
      // For embedded signup, we may get code even with 'unknown' status
      const { code, accessToken } = response.authResponse || {}
      
      if (code || accessToken) {
        onSuccess({ code: code || '', accessToken })
      } else if (response.status === 'not_authorized') {
        onCancel?.()
      } else {
        onCancel?.()
      }
    },
    {
      config_id: configId,
      response_type: 'code',
      override_default_response_type: true,
      extras: {
        setup: {},
        featureType: '',
        sessionInfoVersion: '3',
      },
    }
  )
}

