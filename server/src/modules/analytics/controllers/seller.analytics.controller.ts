import type { Request, Response, NextFunction } from "express";
import PDFDocument from "pdfkit";

import { requireUserAuth } from "../../auth/middleware/auth.middleware";
import { requireRoles } from "../../../middleware/role.middleware";
import sellerAnalyticsService from "../services/seller.analytics.services";

// Middleware to allow only seller or agent roles
const requireSellerOrAgent = requireRoles(["seller", "agent"]);

export async function getSellerAnalytics(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId as string;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const analytics = await sellerAnalyticsService.getSellerAnalytics(userId);

    return res.status(200).json({
      success: true,
      data: analytics,
    });
  } catch (err) {
    return next(err);
  }
}

export const getSellerAnalyticsWithAuth = [
  requireUserAuth,
  requireSellerOrAgent,
  getSellerAnalytics,
];

// ✅ NEW PDF handler
export async function getSellerAnalyticsPdf(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId as string;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const analytics = await sellerAnalyticsService.getSellerAnalytics(userId);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="seller-analytics-report.pdf"');

    const doc = new PDFDocument({ size: "A4", margin: 50 });
    doc.pipe(res);

    // Title
    doc.fontSize(18).text("Property Sewa — Seller Analytics Report", { align: "left" });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor("#555").text(`Generated: ${new Date().toLocaleString()}`);
    doc.moveDown(1);

    // Summary
    doc.fillColor("#000").fontSize(13).text("Summary", { underline: true });
    doc.moveDown(0.5);

    const s = analytics.summary;
    doc.fontSize(11).text(`Total Views: ${s.totalViews}`);
    doc.text(`Total Leads: ${s.totalLeads}`);
    doc.text(`Total Visits: ${s.totalVisits}`);
    doc.text(`Conversion Rate: ${s.conversionRate.toFixed(2)}%`);
    doc.moveDown(0.5);
    doc.fillColor("#555").fontSize(10).text(`Last 7 days delta — Views: ${s.viewsDelta.toFixed(2)}%, Leads: ${s.leadsDelta.toFixed(2)}%, Visits: ${s.visitsDelta.toFixed(2)}%`);
    doc.moveDown(1);

    // Trends table
    doc.fillColor("#000").fontSize(13).text("Performance Trend (Last 7 Days)", { underline: true });
    doc.moveDown(0.5);

    const startX = 50;
    let y = doc.y;

    doc.fontSize(10).fillColor("#000");
    doc.text("Date", startX, y);
    doc.text("Views", startX + 150, y);
    doc.text("Leads", startX + 230, y);
    doc.text("Visits", startX + 310, y);

    y += 16;
    doc.moveTo(startX, y).lineTo(545, y).strokeColor("#ddd").stroke();

    y += 10;
    doc.strokeColor("#000");

    for (const row of analytics.trends) {
      doc.fillColor("#000").text(row.date, startX, y);
      doc.text(String(row.views), startX + 150, y);
      doc.text(String(row.leads), startX + 230, y);
      doc.text(String(row.visits), startX + 310, y);
      y += 16;

      if (y > 740) {
        doc.addPage();
        y = 60;
      }
    }

    doc.end();
  } catch (err) {
    return next(err);
  }
}

export const getSellerAnalyticsPdfWithAuth = [
  requireUserAuth,
  requireSellerOrAgent,
  getSellerAnalyticsPdf,
];
