import { Test } from '@nestjs/testing';
import { PsnService } from './psn.service';
import { ConfigModule } from "@nestjs/config";

// Setup dotenv
import * as dotenv from 'dotenv';
import { CustomLogger } from 'src/logger';
dotenv.config();

// const TEST_ACCOUNT_ID = '6572161800611517380';
// const TEST_USERNAME = 'm4v_3k';

const TEST_ACCOUNT_ID = '4293944030916464576';
const TEST_USERNAME = 'death_unites_us';

describe('PsnService', () => {
  let service: PsnService;

  beforeEach(async () => {
    const module = Test.createTestingModule({
      imports: [ConfigModule],
      providers: [PsnService],
    })
    module.setLogger(new CustomLogger());
    const compiled = await module.compile();
    service = compiled.get(PsnService);

    await service.init("78da16e5-4200-4aec-94e2-33b416d79632");
  });

  it('should authenticate with PSN', async () => {
    expect(service.authenticated).toBe(true);
  });

  it('should not fetch a new token immediately after initialization', async () => {
    const currentExpiry = service.expiresAt;
    await service.checkToken();
    const newExpiry = service.expiresAt;
    expect(newExpiry).toBe(currentExpiry);
  })

  it('should fetch a new token after the expiry date', async () => {
    const currentExpiry = service.expiresAt;

    // Mock Date.now() to be 1 second after the expiry date
    const oldDateNow = Date.now;
    const now = new Date(currentExpiry.getTime() + 1000);
    Date.now = jest.fn(() => now.getTime());
    await service.checkToken();
    Date.now = oldDateNow;
    const newExpiry = service.expiresAt;
    expect(newExpiry).not.toBe(currentExpiry);
  })

  it('should fetch profile data for a given username', async () => {
    const profile = await service.getProfileFromUserName(TEST_USERNAME)
    expect(profile.profile.accountId).toEqual(TEST_ACCOUNT_ID)
  })

  it('should fetch presence data for a given accountId', async () => {
    const presence = await service.getBasicPresence(TEST_ACCOUNT_ID)
    console.log({presence}, presence.basicPresence.gameTitleInfoList)
    expect(presence.basicPresence).toBeDefined()
  })

  it('should fetch game data for given accountId', async () => {
    const titles = await service.getUserTitles(TEST_ACCOUNT_ID)
    console.log(titles.trophyTitles.filter(t => t.trophyTitleName.toLowerCase().includes('theatrhythm')))
    expect(titles).toBeDefined()
  })

  it('should fetch trophy data for given accountId and npTitleIds', async () => {
    const npTitleIds = ['CUSA32852_00']
    const trophyData = await service.getUserTrophySummaryForTitle(TEST_ACCOUNT_ID, npTitleIds)
    expect(trophyData.titles[0].trophyTitles[0].npCommunicationId).toBe('NPWR28405_00')
  })
})