import { Types } from "mongoose";
import PropertyView from "../../../models/PropertyView.model";
import Lead from "../../../models/Lead.model";
import Visit from "../../../models/Visit.model";

interface AnalyticsSummary {
  totalViews: number;
  totalLeads: number;
  totalVisits: number;
  conversionRate: number;
  viewsDelta: number;
  leadsDelta: number;
  visitsDelta: number;
}

interface TrendData {
  date: string;
  views: number;
  leads: number;
  visits: number;
}

interface RecentActivity {
  leads: any[];
  visits: any[];
}

interface SellerAnalytics {
  summary: AnalyticsSummary;
  trends: TrendData[];
  recentActivity: RecentActivity;
}

class SellerAnalyticsService {
  async getSellerAnalytics(sellerId: string): Promise<SellerAnalytics> {
    const sellerObjectId = new Types.ObjectId(sellerId);
    const now = new Date();
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const previous7Days = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // Get totals
    const [totalViews, totalLeads, totalVisits] = await Promise.all([
      PropertyView.countDocuments({ sellerId: sellerObjectId }),
      Lead.countDocuments({ sellerId: sellerObjectId }),
      Visit.countDocuments({ sellerId: sellerObjectId }),
    ]);

    // Get last 7 days counts
    const [last7Views, last7Leads, last7Visits] = await Promise.all([
      PropertyView.countDocuments({
        sellerId: sellerObjectId,
        createdAt: { $gte: last7Days }
      }),
      Lead.countDocuments({
        sellerId: sellerObjectId,
        createdAt: { $gte: last7Days }
      }),
      Visit.countDocuments({
        sellerId: sellerObjectId,
        createdAt: { $gte: last7Days }
      }),
    ]);

    // Get previous 7 days counts for delta calculation
    const [prev7Views, prev7Leads, prev7Visits] = await Promise.all([
      PropertyView.countDocuments({
        sellerId: sellerObjectId,
        createdAt: { $gte: previous7Days, $lt: last7Days }
      }),
      Lead.countDocuments({
        sellerId: sellerObjectId,
        createdAt: { $gte: previous7Days, $lt: last7Days }
      }),
      Visit.countDocuments({
        sellerId: sellerObjectId,
        createdAt: { $gte: previous7Days, $lt: last7Days }
      }),
    ]);

    // Calculate deltas
    const viewsDelta = prev7Views > 0 ? ((last7Views - prev7Views) / prev7Views) * 100 : 0;
    const leadsDelta = prev7Leads > 0 ? ((last7Leads - prev7Leads) / prev7Leads) * 100 : 0;
    const visitsDelta = prev7Visits > 0 ? ((last7Visits - prev7Visits) / prev7Visits) * 100 : 0;

    // Calculate conversion rate (leads / views)
    const conversionRate = totalViews > 0 ? (totalLeads / totalViews) * 100 : 0;

    // Get trends for last 7 days
    const trends = await this.getTrends(sellerObjectId, last7Days);

    // Get recent activity
    const recentActivity = await this.getRecentActivity(sellerObjectId);

    return {
      summary: {
        totalViews,
        totalLeads,
        totalVisits,
        conversionRate: Math.round(conversionRate * 100) / 100,
        viewsDelta: Math.round(viewsDelta * 100) / 100,
        leadsDelta: Math.round(leadsDelta * 100) / 100,
        visitsDelta: Math.round(visitsDelta * 100) / 100,
      },
      trends,
      recentActivity,
    };
  }

  private async getTrends(sellerId: Types.ObjectId, startDate: Date): Promise<TrendData[]> {
    const trends: TrendData[] = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];

      const [views, leads, visits] = await Promise.all([
        PropertyView.countDocuments({
          sellerId,
          createdAt: { $gte: date, $lt: nextDate }
        }),
        Lead.countDocuments({
          sellerId,
          createdAt: { $gte: date, $lt: nextDate }
        }),
        Visit.countDocuments({
          sellerId,
          createdAt: { $gte: date, $lt: nextDate }
        }),
      ]);

      trends.push({
        date: dateStr,
        views,
        leads,
        visits,
      });
    }

    return trends;
  }

  private async getRecentActivity(sellerId: Types.ObjectId): Promise<RecentActivity> {
    const [recentLeads, recentVisits] = await Promise.all([
      Lead.find({ sellerId })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('propertyId', 'title')
        .lean(),
      
      Visit.find({ sellerId })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('propertyId', 'title')
        .populate('buyerId', 'name email')
        .lean(),
    ]);

    return {
      leads: recentLeads,
      visits: recentVisits,
    };
  }
}

export default new SellerAnalyticsService();
