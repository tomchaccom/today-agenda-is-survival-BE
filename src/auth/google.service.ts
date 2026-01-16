import axios from "axios";

/**
 * 우리 서비스에서 사용할 정규화된 Google 사용자 형태
 */
export type NormalizedGoogleUser = {
  provider: "google";
  providerId: string;
  email: string;
  name: string;
  avatarUrl?: string;
};

/**
 * Google OAuth Token 응답 타입
 */
type GoogleTokenResponse = {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  id_token?: string;
};

/**
 * Google UserInfo 응답 타입
 */
type GoogleUserInfoResponse = {
  sub: string;
  email: string;
  name: string;
  picture?: string;
};

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL =
  "https://openidconnect.googleapis.com/v1/userinfo";

/**
 * 필수 env 안전하게 가져오기
 */
const getEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
};

/**
 * Google Authorization Code를 우리 서비스 사용자 정보로 변환
 *
 * 책임:
 * - code -> access_token 교환
 * - access_token -> userinfo 조회
 * - 서비스 표준 사용자 객체로 정규화
 *
 * ❌ DB 접근 없음
 * ❌ JWT 발급 없음
 * ❌ HTTP / Express 의존 없음
 */
export const exchangeGoogleCode = async (
  code: string
): Promise<NormalizedGoogleUser> => {

  console.log("CLIENT_SECRET EXISTS:", !!process.env.GOOGLE_CLIENT_SECRET);
  if (!code) {
    throw new Error("Authorization code is required.");
  }

  /**
   * 1️⃣ Authorization Code → Access Token
   */
  let accessToken: string;

  try {
    const params = new URLSearchParams({
      code,
      client_id: getEnv("GOOGLE_CLIENT_ID"),
      client_secret: getEnv("GOOGLE_CLIENT_SECRET"),
      redirect_uri: getEnv("GOOGLE_REDIRECT_URI"),
      grant_type: "authorization_code",
    });

    const tokenResponse = await axios.post<GoogleTokenResponse>(
      GOOGLE_TOKEN_URL,
      params.toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    accessToken = tokenResponse.data.access_token;
  } catch (err: any) {
    throw new Error(
      `Google token exchange failed: ${
        err.response?.data?.error || err.message
      }`
    );
  }

  if (!accessToken) {
    throw new Error("Missing access token from Google.");
  }

  /**
   * 2️⃣ Access Token → UserInfo
   */
  let userInfo: GoogleUserInfoResponse;

  try {
    const userInfoResponse = await axios.get<GoogleUserInfoResponse>(
      GOOGLE_USERINFO_URL,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    userInfo = userInfoResponse.data;
  } catch (err: any) {
    throw new Error(
      `Failed to fetch Google user profile: ${
        err.response?.data?.error || err.message
      }`
    );
  }

  const { sub, email, name, picture } = userInfo;

  if (!sub || !email || !name) {
    throw new Error("Incomplete Google user profile.");
  }

  /**
   * 3️⃣ 우리 서비스 표준 사용자 형태로 정규화
   */
  return {
    provider: "google",
    providerId: sub,
    email,
    name,
    avatarUrl: picture,
  };
};

