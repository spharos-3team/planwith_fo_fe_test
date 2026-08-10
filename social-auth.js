import { api, setAccessToken } from "./auth-api.js";
import { OAUTH } from "./oauth-config.js";

function clearStaleSessionBeforeOAuth() {
  // BE 재기동 후 남은 JWT가 Gateway에서 401을 유발하지 않도록 제거
  setAccessToken(null);
}

const PENDING_KEY = "planwith_social_pending";

function randomState() {
  return crypto.randomUUID().replace(/-/g, "");
}

export function saveSocialPending(payload) {
  sessionStorage.setItem(PENDING_KEY, JSON.stringify(payload));
}

export function loadSocialPending() {
  try {
    return JSON.parse(sessionStorage.getItem(PENDING_KEY) || "null");
  } catch {
    return null;
  }
}

export function clearSocialPending() {
  sessionStorage.removeItem(PENDING_KEY);
}

export async function completeSocialLogin(result, hooks = {}) {
  const { onNeedsSignup, onLoggedIn, onError } = hooks;
  try {
    if (result?.needsSignup) {
      // 인가코드는 1회용 → BE가 내려준 providerAccessToken(또는 클라 accessToken)으로 가입
      const providerToken =
        result.providerAccessToken || result.accessToken || null;
      saveSocialPending({
        provider: result.provider,
        accessToken: providerToken,
        authorizationCode: providerToken ? null : result.authorizationCode || null,
        redirectUri: providerToken ? null : result.redirectUri || null,
        state: providerToken ? null : result.state || null,
        email: result.email || "",
        suggestedNickname: result.suggestedNickname || "",
      });
      onNeedsSignup?.(result);
      return;
    }
    if (result?.tokens?.accessToken) {
      setAccessToken(result.tokens.accessToken);
      clearSocialPending();
      onLoggedIn?.(result);
      return;
    }
    throw new Error("소셜 로그인 응답이 올바르지 않습니다.");
  } catch (err) {
    onError?.(err);
    throw err;
  }
}

export async function socialLoginWithAccessToken(provider, accessToken, hooks) {
  const result = await api("/api/v1/auth/social-login", {
    method: "POST",
    body: JSON.stringify({ provider, accessToken }),
  });
  // keep token for signup if needed
  if (result?.needsSignup) {
    result.accessToken = accessToken;
  }
  return completeSocialLogin(result, hooks);
}

export async function socialLoginWithCode(provider, authorizationCode, redirectUri, state, hooks) {
  const result = await api("/api/v1/auth/social-login", {
    method: "POST",
    body: JSON.stringify({
      provider,
      authorizationCode,
      redirectUri,
      state,
    }),
  });
  // providerAccessToken은 BE가 needsSignup 응답에 포함. 코드는 재사용하지 않음.
  return completeSocialLogin(result, hooks);
}

export function startGoogleLogin() {
  clearStaleSessionBeforeOAuth();
  const state = randomState();
  sessionStorage.setItem("oauth_state", state);
  sessionStorage.setItem("oauth_provider", "GOOGLE");
  const params = new URLSearchParams({
    client_id: OAUTH.google.clientId,
    redirect_uri: OAUTH.redirectUri,
    response_type: "code",
    scope: OAUTH.google.scope,
    state,
    access_type: "online",
    prompt: "select_account",
  });
  window.location.href = `${OAUTH.google.authUrl}?${params}`;
}

export function startNaverLogin() {
  clearStaleSessionBeforeOAuth();
  const state = randomState();
  sessionStorage.setItem("oauth_state", state);
  sessionStorage.setItem("oauth_provider", "NAVER");
  const params = new URLSearchParams({
    client_id: OAUTH.naver.clientId,
    redirect_uri: OAUTH.redirectUri,
    response_type: "code",
    state,
  });
  window.location.href = `${OAUTH.naver.authUrl}?${params}`;
}

/**
 * 카카오: JS SDK 대신 REST 인가 URL로 이동 (네이버/구글과 동일 패턴).
 * scope를 넣지 않음 — 콘솔에 켠 동의항목만 적용.
 */
export function startKakaoLogin() {
  clearStaleSessionBeforeOAuth();
  const state = randomState();
  sessionStorage.setItem("oauth_state", state);
  sessionStorage.setItem("oauth_provider", "KAKAO");
  const params = new URLSearchParams({
    client_id: OAUTH.kakao.restKey,
    redirect_uri: OAUTH.redirectUri,
    response_type: "code",
    state,
  });
  window.location.href = `${OAUTH.kakao.authUrl}?${params}`;
}

export async function finishSocialSignup({ nickname, agreedTermIds }) {
  const pending = loadSocialPending();
  if (!pending?.provider) {
    throw new Error("소셜 가입 정보가 없습니다. 간편 로그인을 다시 진행해 주세요.");
  }
  const body = {
    provider: pending.provider,
    nickname,
    agreedTermIds,
  };
  if (pending.accessToken) {
    body.accessToken = pending.accessToken;
  } else {
    body.authorizationCode = pending.authorizationCode;
    body.redirectUri = pending.redirectUri;
    body.state = pending.state;
  }
  const tokens = await api("/api/v1/auth/social-signup", {
    method: "POST",
    body: JSON.stringify(body),
  });
  setAccessToken(tokens.accessToken);
  clearSocialPending();
  return tokens;
}
