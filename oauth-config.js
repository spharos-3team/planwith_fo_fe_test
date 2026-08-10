/** Public OAuth client IDs only (secrets stay on BE). */
export const OAUTH = {
  redirectUri: `${window.location.origin}/oauth/callback.html`,
  google: {
    clientId: "587214612146-e4asoh21ceol8gnsgd29j2gkmj452lbq.apps.googleusercontent.com",
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    scope: "openid email profile",
  },
  naver: {
    clientId: "Fl1kCI6avOGoZrOvtsf4",
    authUrl: "https://nid.naver.com/oauth2.0/authorize",
  },
  kakao: {
    // REST API 키 (인가코드 요청·토큰 교환용 — 공개 가능한 client_id)
    restKey: "ee3cf330bbfe0851650d17bd02765d28",
    authUrl: "https://kauth.kakao.com/oauth/authorize",
    // JS SDK용 (필요 시)
    jsKey: "6edf004a9d2612afe1b971c06da1bedb",
  },
};
