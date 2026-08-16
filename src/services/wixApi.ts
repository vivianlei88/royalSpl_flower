const WORKER_URL = import.meta.env.VITE_CF_WORKER_URL || 'http://localhost:8787';

// Common fetcher for Wix API requests via Medo Backend (Cloudflare Worker)
const fetchWixData = async (module: string) => {
  try {
    const response = await fetch(`${WORKER_URL}/api/wix/${module}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      throw new Error(`Worker returned ${response.status}`);
    }
    
    const result = await response.json();
    if (result.success && result.data) {
      return result.data;
    }
    return result;
  } catch (error) {
    console.error(`Wix API Error via Worker (${module}):`, error);
    // Fallback mock data if worker is not yet fully configured with Wix credentials
    return getMockDataForModule(module);
  }
};

export const getWixSeoData = () => fetchWixData('seo');
export const getWixGoogleAdsData = () => fetchWixData('google-ads');
export const getWixSocialAdsData = () => fetchWixData('social-ads');
export const getWixEmailData = () => fetchWixData('email');
export const getWixSocialData = () => fetchWixData('social');
export const getWixReferralData = () => fetchWixData('referral');
export const getWixGoogleBusinessData = () => fetchWixData('google-business');

// Mock data generator for development/demonstration
function getMockDataForModule(module: string) {
  switch (module) {
    case 'seo':
      return {
        healthScore: 85,
        organicTraffic: 1245,
        topKeywords: ['花店', '求婚花束', '台北送花'],
        geoData: { '台北': 45, '新北': 30, '桃園': 15, '其他': 10 },
        recentIssues: [{ id: 1, type: 'missing_alt', count: 3 }]
      };
    case 'google-ads':
      return {
        impressions: 45200,
        clicks: 1240,
        spend: 3450.50,
        conversions: 85,
        ctr: 2.74,
        activeCampaigns: 2
      };
    case 'social-ads':
      return {
        platforms: ['Facebook', 'Instagram'],
        totalSpend: 2100,
        reach: 85000,
        engagement: 4500,
        roas: 2.4
      };
    case 'email':
      return {
        subscribers: 3420,
        recentCampaign: '春季花束優惠',
        openRate: 24.5,
        clickRate: 4.2,
        unsubscribes: 12
      };
    case 'social':
      return {
        recentPosts: 5,
        totalLikes: 840,
        totalComments: 56,
        totalShares: 24,
        topPost: '母親節花束預購開跑'
      };
    case 'referral':
      return {
        activeAffiliates: 45,
        totalReferrals: 128,
        pendingCommission: 4500,
        paidCommission: 12400
      };
    case 'google-business':
      return {
        profileViews: 3400,
        directionRequests: 450,
        websiteVisits: 890,
        averageRating: 4.8,
        totalReviews: 124
      };
    default:
      return {};
  }
}
