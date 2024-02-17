import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { call, AuthTokensResponse, exchangeCodeForAccessToken, exchangeNpssoForCode, exchangeRefreshTokenForAuthTokens, getBasicPresence, getProfileFromUserName, getRecentlyPlayedGames, getUserTitles, TrophyTitle } from 'psn-api';

type GetUserTrophySummaryForTitleResponse = {
  titles: {
    npTitleId: string;
    trophyTitles: TrophyTitle[];
  }[]
}

@Injectable()
export class PsnService {
  private npsso: string;
  private authorization: AuthTokensResponse;
  private settings: any;
  private channelId: string;
  private readonly logger = new Logger(PsnService.name);
  public authenticated = false;
  public expiresAt: Date;

  constructor(private configService: ConfigService) {
    this.npsso = this.configService.get<string>('PSN_NPSSO_TOKEN')
  }

  storeAuthorization(authorization: AuthTokensResponse) {
    if (!authorization) {
      return false
    }

    this.authorization = authorization;
    this.expiresAt = new Date(Date.now() + this.authorization.expiresIn * 1000);
    this.authenticated = true;
    return true
  }

  async init(refreshToken?: string) {
    if (refreshToken) {
      if (this.storeAuthorization(await exchangeRefreshTokenForAuthTokens(refreshToken))) {
        return
      }
    }
    const accessCode = await exchangeNpssoForCode(this.npsso);
    this.storeAuthorization(await exchangeCodeForAccessToken(accessCode));
  }

  async checkToken() {
    const isAccessTokenExpired = this.expiresAt.getTime() < Date.now();
    if (isAccessTokenExpired) {
      this.logger.log('Access token expired, refreshing...');
      this.storeAuthorization(await exchangeRefreshTokenForAuthTokens(
        this.authorization.refreshToken
      ));
    }
  }

  async getProfileFromUserName(username: string) {
    await this.checkToken();
    return getProfileFromUserName(this.authorization, username)
  }

  async getBasicPresence(accountId: string) {
    await this.checkToken();
    return getBasicPresence(this.authorization, accountId)
  }

  async getUserTitles(accountId: string) {
    await this.checkToken();
    return getUserTitles(this.authorization, accountId)
  }

  async getUserTrophySummaryForTitle(accountId: string, npTitleIds: string[]): Promise<GetUserTrophySummaryForTitleResponse> {
    return call(
      {url: 'https://m.np.playstation.com/api/trophy/v1/users/' + accountId + '/titles/trophyTitles?npTitleIds=' + npTitleIds.join(',')},
      this.authorization,
    );
  }
}