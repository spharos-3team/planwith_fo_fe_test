const ACCESS_KEY = "planwith_access_token";

export function getAccessToken() {
  return sessionStorage.getItem(ACCESS_KEY);
}

export function setAccessToken(token) {
  if (token) sessionStorage.setItem(ACCESS_KEY, token);
  else sessionStorage.removeItem(ACCESS_KEY);
}

/** 로그인 전 public API — 만료/재기동된 JWT를 붙이면 Gateway가 401을 낸다 */
const PUBLIC_AUTH_PATHS = [
  "/api/v1/auth/login",
  "/api/v1/auth/signup",
  "/api/v1/auth/refresh",
  "/api/v1/auth/logout",
  "/api/v1/auth/social-login",
  "/api/v1/auth/social-signup",
  "/api/v1/auth/email/",
  "/api/v1/auth/check-email",
  "/api/v1/auth/check-nickname",
  "/api/v1/auth/password/reset",
  "/api/v1/auth/profile-image",
  "/api/v1/terms",
];

function isPublicAuthPath(path) {
  const p = path.split("?")[0];
  return PUBLIC_AUTH_PATHS.some((prefix) => p === prefix || p.startsWith(prefix));
}

export async function api(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (!(options.body instanceof FormData) && !headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }
  const token = getAccessToken();
  if (token && !isPublicAuthPath(path) && options.auth !== false) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (options.auth === false) {
    /* explicit no bearer */
  }

  const res = await fetch(path, {
    ...options,
    headers,
    credentials: "include",
  });

  const json = await res.json().catch(() => null);
  if (!res.ok || (json && json.success === false)) {
    const err = new Error(json?.error?.message || `요청 실패 (${res.status})`);
    err.code = json?.error?.code;
    err.fieldErrors = json?.error?.fieldErrors;
    err.status = res.status;
    throw err;
  }
  return json?.data;
}
