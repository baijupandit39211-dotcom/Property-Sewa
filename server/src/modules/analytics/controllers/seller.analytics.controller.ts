import type { NextFunction, Request, Response } from "express";
// @ts-ignore pdfkit does not ship types in this repository.
import PDFDocument from "pdfkit";

import { requireUserAuth } from "../../auth/middleware/auth.middleware";
import { requireRoles } from "../../../middleware/role.middleware";
import sellerAnalyticsService from "../services/seller.analytics.services";

const requireSellerOrAgent = requireRoles(["seller", "agent"]);

const REPORT = {
  margin: 36,
  colors: {
    brand: "#0F3B2D",
    brandSoft: "#165645",
    ink: "#0F172A",
    muted: "#64748B",
    line: "#E2E8F0",
    panel: "#F8FAFC",
    white: "#FFFFFF",
    teal: "#0F766E",
    blue: "#2563EB",
    amber: "#D97706",
    violet: "#7C3AED",
    rose: "#E11D48",
    emerald: "#16A34A",
    slate: "#CBD5E1",
  },
};

type AnalyticsPayload = Awaited<ReturnType<typeof sellerAnalyticsService.getSellerAnalytics>>;
type TrendPoint = AnalyticsPayload["trends"][number];
type PropertyRow = AnalyticsPayload["propertyPerformance"][number];
type ActivityRow = AnalyticsPayload["recentActivity"][number];
type BreakdownRow = AnalyticsPayload["breakdowns"]["listings"][number];

function getRangeFromRequest(req: Request) {
  return typeof req.query.range === "string" ? req.query.range : undefined;
}

function pageBox(doc: any) {
  const { width, height, margins } = doc.page;
  return {
    left: margins.left,
    right: width - margins.right,
    top: margins.top,
    bottom: height - margins.bottom,
    width: width - margins.left - margins.right,
    height: height - margins.top - margins.bottom,
  };
}

function formatNumber(value: number) {
  return new Intl.NumberFormat().format(Number(value || 0));
}

function formatCompact(value: number) {
  return new Intl.NumberFormat(undefined, {
    notation: "compact",
    maximumFractionDigits: value >= 1000 ? 1 : 0,
  }).format(Number(value || 0));
}

function formatPercent(value: number) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function formatSignedPercent(value: number) {
  const n = Number(value || 0);
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}

function formatSignedPoints(value: number) {
  const n = Number(value || 0);
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)} pts`;
}

function formatDate(value: string | Date) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Unknown"
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatShortDate(value: string | Date) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Unknown"
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatDateTime(value: string | Date) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Unknown"
    : date.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
}

function titleCase(value: string) {
  return String(value || "")
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function currencyLabel(property: PropertyRow) {
  return `${property.currency} ${formatNumber(property.price)}`;
}

function truncate(doc: any, text: string, maxWidth: number) {
  if (!text) return "";
  if (doc.widthOfString(text) <= maxWidth) return text;

  let output = text;
  while (output.length > 1 && doc.widthOfString(`${output}...`) > maxWidth) {
    output = output.slice(0, -1);
  }

  return `${output}...`;
}

function card(doc: any, x: number, y: number, width: number, height: number, fill = REPORT.colors.white) {
  doc
    .save()
    .lineWidth(1)
    .roundedRect(x, y, width, height, 18)
    .fillAndStroke(fill, REPORT.colors.line)
    .restore();
}

function pill(
  doc: any,
  x: number,
  y: number,
  text: string,
  fill: string,
  textColor: string,
  paddingX = 10
) {
  doc.font("Helvetica-Bold").fontSize(9);
  const width = doc.widthOfString(text) + paddingX * 2;
  doc
    .save()
    .roundedRect(x, y, width, 18, 9)
    .fill(fill)
    .restore();
  doc.fillColor(textColor).text(text, x + paddingX, y + 5, { lineBreak: false });
  return width;
}

function footer(doc: any, pageNumber: number) {
  const box = pageBox(doc);
  const y = doc.page.height - 18;
  doc
    .save()
    .moveTo(box.left, y - 8)
    .lineTo(box.right, y - 8)
    .strokeColor(REPORT.colors.line)
    .stroke()
    .restore();

  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor(REPORT.colors.muted)
    .text("Property Sewa | Seller Analytics", box.left, y, { width: box.width });
  doc.text(`Page ${pageNumber}`, box.left, y, {
    width: box.width,
    align: "right",
  });
}

function startPage(doc: any, pageNumber: number, sectionLabel: string) {
  if (pageNumber > 1) {
    doc.addPage({ size: "A4", layout: "landscape", margin: REPORT.margin });
  }

  const box = pageBox(doc);
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor(REPORT.colors.muted)
    .text("PROPERTY SEWA", box.left, 18, { lineBreak: false });
  doc.text(sectionLabel, box.left, 18, {
    width: box.width,
    align: "right",
    lineBreak: false,
  });
  footer(doc, pageNumber);
  return box;
}

function drawHero(doc: any, analytics: AnalyticsPayload, x: number, y: number, width: number, height: number) {
  doc
    .save()
    .roundedRect(x, y, width, height, 24)
    .fill(REPORT.colors.brand)
    .restore();

  doc
    .save()
    .fillOpacity(0.12)
    .circle(x + width - 80, y + 34, 42)
    .fill(REPORT.colors.white)
    .restore();
  doc
    .save()
    .fillOpacity(0.08)
    .circle(x + width - 34, y + height - 16, 60)
    .fill(REPORT.colors.white)
    .restore();

  const summary = analytics.summary;
  const rangeLabel = `${formatDate(analytics.filters.startDate)} - ${formatDate(analytics.filters.endDate)}`;
  const panelX = x + width - 230;
  const panelY = y + 22;

  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor("#B7E4D4")
    .text("SELLER PERFORMANCE REPORT", x + 24, y + 22, { lineBreak: false });
  doc
    .font("Helvetica-Bold")
    .fontSize(28)
    .fillColor(REPORT.colors.white)
    .text("Analytics Summary", x + 24, y + 42, { width: width - 290 });
  doc
    .font("Helvetica")
    .fontSize(11)
    .fillColor("#D8EEE5")
    .text(
      "A production export of listing traffic, lead flow, visit progression, and top-performing inventory.",
      x + 24,
      y + 82,
      { width: width - 300, lineGap: 2 }
    );

  doc
    .save()
    .roundedRect(panelX, panelY, 194, 92, 18)
    .fill(REPORT.colors.brandSoft)
    .restore();

  doc.font("Helvetica-Bold").fontSize(9).fillColor("#AFD9CB");
  doc.text("Window", panelX + 16, panelY + 14);
  doc.text("Listings tracked", panelX + 16, panelY + 41);
  doc.text("Generated", panelX + 16, panelY + 68);

  doc.font("Helvetica-Bold").fontSize(10).fillColor(REPORT.colors.white);
  doc.text(rangeLabel, panelX + 94, panelY + 14, { width: 84, align: "right" });
  doc.text(String(summary.totalListings), panelX + 94, panelY + 41, { width: 84, align: "right" });
  doc.text(formatDateTime(new Date()), panelX + 94, panelY + 68, { width: 84, align: "right" });
}

function drawMetricCards(doc: any, analytics: AnalyticsPayload, x: number, y: number, width: number) {
  const summary = analytics.summary;
  const gap = 12;
  const cardWidth = (width - gap * 3) / 4;
  const cardHeight = 96;

  const metrics = [
    {
      title: "Views",
      value: formatNumber(summary.views),
      delta: formatSignedPercent(summary.viewsDelta),
      detail: `${formatCompact(summary.lifetimeViews)} lifetime`,
      accent: REPORT.colors.teal,
    },
    {
      title: "Leads",
      value: formatNumber(summary.leads),
      delta: formatSignedPercent(summary.leadsDelta),
      detail: `${formatCompact(summary.lifetimeLeads)} lifetime`,
      accent: REPORT.colors.blue,
    },
    {
      title: "Visit requests",
      value: formatNumber(summary.visits),
      delta: formatSignedPercent(summary.visitsDelta),
      detail: `${summary.completedVisits} completed`,
      accent: REPORT.colors.violet,
    },
    {
      title: "Conversion rate",
      value: formatPercent(summary.conversionRate),
      delta: formatSignedPoints(summary.conversionDelta),
      detail: `${formatPercent(summary.lifetimeConversionRate)} lifetime`,
      accent: REPORT.colors.amber,
    },
  ];

  metrics.forEach((metric, index) => {
    const cardX = x + index * (cardWidth + gap);
    card(doc, cardX, y, cardWidth, cardHeight);

    doc
      .save()
      .roundedRect(cardX + 18, y + 14, 34, 6, 3)
      .fill(metric.accent)
      .restore();

    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor(REPORT.colors.muted)
      .text(metric.title.toUpperCase(), cardX + 18, y + 28);
    doc
      .font("Helvetica-Bold")
      .fontSize(24)
      .fillColor(REPORT.colors.ink)
      .text(metric.value, cardX + 18, y + 46, { lineBreak: false });

    pill(
      doc,
      cardX + cardWidth - 74,
      y + 18,
      metric.delta,
      "#F1F5F9",
      metric.delta.startsWith("-") ? REPORT.colors.rose : REPORT.colors.emerald,
      8
    );

    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(REPORT.colors.muted)
      .text(metric.detail, cardX + 18, y + 74);
  });
}

function drawLineSeries(
  doc: any,
  values: number[],
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
  maxValue: number
) {
  if (!values.length) return;

  const step = width / Math.max(values.length - 1, 1);
  doc.save().lineWidth(2).strokeColor(color);

  values.forEach((value, index) => {
    const px = x + step * index;
    const py = y + height - (Number(value || 0) / Math.max(maxValue, 1)) * height;

    if (index === 0) doc.moveTo(px, py);
    else doc.lineTo(px, py);
  });

  doc.stroke().restore();

  values.forEach((value, index) => {
    const px = x + step * index;
    const py = y + height - (Number(value || 0) / Math.max(maxValue, 1)) * height;
    doc.save().circle(px, py, 2.8).fill(color).restore();
  });
}

function drawTrendCard(doc: any, analytics: AnalyticsPayload, x: number, y: number, width: number, height: number) {
  card(doc, x, y, width, height);

  const trends = analytics.trends;
  const views = trends.map((row) => Number(row.views || 0));
  const leads = trends.map((row) => Number(row.leads || 0));
  const visits = trends.map((row) => Number(row.visits || 0));
  const maxViews = Math.max(...views, 1);
  const maxSecondary = Math.max(...leads, ...visits, 1);

  const chartX = x + 22;
  const chartY = y + 72;
  const chartWidth = width - 44;
  const chartHeight = height - 118;
  const step = chartWidth / Math.max(trends.length, 1);
  const bestDay = trends.reduce<TrendPoint | null>((best, row) => {
    if (!best) return row;
    return row.views > best.views ? row : best;
  }, null);

  doc
    .font("Helvetica-Bold")
    .fontSize(14)
    .fillColor(REPORT.colors.ink)
    .text("Traffic and inquiry trend", x + 22, y + 20);
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor(REPORT.colors.muted)
    .text("Bars show views. Lines show leads and visits across the selected window.", x + 22, y + 40);

  let legendX = x + width - 210;
  [
    { label: "Views", color: REPORT.colors.teal },
    { label: "Leads", color: REPORT.colors.blue },
    { label: "Visits", color: REPORT.colors.amber },
  ].forEach((item) => {
    doc.save().roundedRect(legendX, y + 24, 10, 10, 3).fill(item.color).restore();
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(REPORT.colors.muted)
      .text(item.label, legendX + 16, y + 24);
    legendX += 62;
  });

  [0, 0.25, 0.5, 0.75, 1].forEach((ratio) => {
    const lineY = chartY + chartHeight - chartHeight * ratio;
    doc
      .save()
      .strokeColor(REPORT.colors.line)
      .dash(3, { space: 4 })
      .moveTo(chartX, lineY)
      .lineTo(chartX + chartWidth, lineY)
      .stroke()
      .undash()
      .restore();
  });

  trends.forEach((row, index) => {
    const barWidth = Math.max(3, step * 0.56);
    const barX = chartX + index * step + (step - barWidth) / 2;
    const barHeight = (Number(row.views || 0) / maxViews) * chartHeight;

    doc
      .save()
      .roundedRect(barX, chartY + chartHeight - barHeight, barWidth, barHeight, 4)
      .fill("#B6E6D8")
      .restore();

    const labelStride = Math.max(1, Math.ceil(trends.length / 7));
    if (index % labelStride === 0 || index === trends.length - 1) {
      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor(REPORT.colors.muted)
        .text(row.label, chartX + index * step - 12, chartY + chartHeight + 8, {
          width: 44,
          align: "center",
        });
    }
  });

  drawLineSeries(doc, leads, chartX + step / 2, chartY, chartWidth - step, chartHeight, REPORT.colors.blue, maxSecondary);
  drawLineSeries(doc, visits, chartX + step / 2, chartY, chartWidth - step, chartHeight, REPORT.colors.amber, maxSecondary);

  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor(REPORT.colors.ink)
    .text(
      bestDay
        ? `Best day: ${bestDay.label} with ${formatNumber(bestDay.views)} views`
        : "Best day: Not enough data",
      x + 22,
      y + height - 28
    );
}

function drawFunnelCard(doc: any, analytics: AnalyticsPayload, x: number, y: number, width: number, height: number) {
  card(doc, x, y, width, height);

  doc
    .font("Helvetica-Bold")
    .fontSize(14)
    .fillColor(REPORT.colors.ink)
    .text("Funnel health", x + 18, y + 18);
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor(REPORT.colors.muted)
    .text("How traffic is moving through the seller workflow.", x + 18, y + 38);

  analytics.funnel.forEach((step, index) => {
    const rowY = y + 64 + index * 22;
    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor(REPORT.colors.muted)
      .text(step.label.toUpperCase(), x + 18, rowY);
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor(REPORT.colors.ink)
      .text(formatNumber(step.value), x + width - 52, rowY, { width: 34, align: "right" });

    doc
      .save()
      .roundedRect(x + 86, rowY + 2, width - 154, 8, 4)
      .fill("#E2E8F0")
      .restore();
    if (step.value > 0) {
      doc
        .save()
        .roundedRect(x + 86, rowY + 2, Math.max(8, ((width - 154) * step.ratio) / 100), 8, 4)
        .fill(REPORT.colors.teal)
        .restore();
    }
  });

  const summary = analytics.summary;
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor(REPORT.colors.ink)
    .text(`Visit completion rate: ${formatPercent(summary.visitCompletionRate)}`, x + 18, y + height - 28);
}

function reportRecommendations(analytics: AnalyticsPayload) {
  const summary = analytics.summary;
  const items: string[] = [];

  if (summary.pendingListings > 0) {
    items.push(
      `${summary.pendingListings} listing${summary.pendingListings === 1 ? " is" : "s are"} still pending approval.`
    );
  }

  if (summary.views > 0 && summary.conversionRate < 2.5) {
    items.push("Traffic is active but conversion is soft. Review listing photos, pricing, and title copy.");
  }

  if (summary.visits > summary.completedVisits) {
    items.push("Open visit requests remain in the pipeline. Follow up quickly to move them to completion.");
  }

  if (!items.length && summary.totalListings > 0) {
    items.push("Performance is healthy. Keep fast response times and refresh top listings regularly.");
  }

  if (!items.length) {
    items.push("Publish listings first to unlock performance reporting and inventory comparisons.");
  }

  return items.slice(0, 3);
}

function drawHighlightsCard(doc: any, analytics: AnalyticsPayload, x: number, y: number, width: number, height: number) {
  doc
    .save()
    .roundedRect(x, y, width, height, 18)
    .fill(REPORT.colors.ink)
    .restore();

  const topProperty =
    analytics.propertyPerformance.find(
      (property) => property.views > 0 || property.leads > 0 || property.visits > 0
    ) || analytics.propertyPerformance[0];

  doc
    .font("Helvetica-Bold")
    .fontSize(14)
    .fillColor(REPORT.colors.white)
    .text("Highlights and next actions", x + 18, y + 18);

  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor("#94A3B8")
    .text("TOP LISTING", x + 18, y + 46);
  doc
    .font("Helvetica-Bold")
    .fontSize(12)
    .fillColor(REPORT.colors.white)
    .text(topProperty ? truncate(doc, topProperty.title, width - 36) : "No active listing data", x + 18, y + 60);
  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor("#CBD5E1")
    .text(
      topProperty
        ? `${formatNumber(topProperty.views)} views | ${formatNumber(topProperty.leads)} leads | ${formatPercent(topProperty.conversionRate)} conversion`
        : "Performance details will appear once listing activity is recorded.",
      x + 18,
      y + 78,
      { width: width - 36, lineGap: 2 }
    );

  let noteY = y + 108;
  reportRecommendations(analytics).forEach((item, index) => {
    doc
      .save()
      .circle(x + 22, noteY + 7, 2.5)
      .fill("#34D399")
      .restore();
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#E2E8F0")
      .text(`${index + 1}. ${item}`, x + 30, noteY, {
        width: width - 44,
        lineGap: 1,
      });
    noteY += 28;
  });
}

function drawTableHeader(doc: any, labels: Array<{ label: string; width: number }>, x: number, y: number) {
  let cursor = x;
  doc.font("Helvetica-Bold").fontSize(9).fillColor(REPORT.colors.muted);
  labels.forEach((column) => {
    doc.text(column.label.toUpperCase(), cursor, y, { width: column.width - 8 });
    cursor += column.width;
  });
}

function statusBadge(doc: any, status: string, x: number, y: number) {
  const label = titleCase(status);
  let fill = "#F1F5F9";
  let text = REPORT.colors.muted;

  if (status === "active" || status === "completed" || status === "closed") {
    fill = "#DCFCE7";
    text = REPORT.colors.emerald;
  } else if (status === "pending" || status === "new" || status === "requested") {
    fill = "#FEF3C7";
    text = REPORT.colors.amber;
  } else if (status === "confirmed" || status === "contacted") {
    fill = "#DBEAFE";
    text = REPORT.colors.blue;
  } else if (status === "rejected") {
    fill = "#FFE4E6";
    text = REPORT.colors.rose;
  } else if (status === "rescheduled") {
    fill = "#EDE9FE";
    text = REPORT.colors.violet;
  }

  return pill(doc, x, y, label, fill, text, 8);
}

function drawPropertyTable(doc: any, properties: PropertyRow[], x: number, y: number, width: number, height: number) {
  card(doc, x, y, width, height);

  doc
    .font("Helvetica-Bold")
    .fontSize(14)
    .fillColor(REPORT.colors.ink)
    .text("Top performing listings", x + 18, y + 18);
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor(REPORT.colors.muted)
    .text("This PDF highlights the strongest inventory. Use CSV export in the app for the full dataset.", x + 18, y + 38, {
      width: width - 36,
    });

  const columns = [
    { label: "Listing", width: 206 },
    { label: "Status", width: 66 },
    { label: "Views", width: 52 },
    { label: "Leads", width: 52 },
    { label: "Visits", width: 52 },
    { label: "Conv.", width: 54 },
    { label: "Last lead", width: 66 },
  ];

  const headerY = y + 72;
  drawTableHeader(doc, columns, x + 18, headerY);

  doc
    .save()
    .moveTo(x + 18, headerY + 16)
    .lineTo(x + width - 18, headerY + 16)
    .strokeColor(REPORT.colors.line)
    .stroke()
    .restore();

  const visibleRows = properties.slice(0, 8);
  const rowHeight = 46;

  if (!visibleRows.length) {
    doc
      .font("Helvetica")
      .fontSize(11)
      .fillColor(REPORT.colors.muted)
      .text("No listing activity is available for the selected period.", x + 18, y + 118);
    return;
  }

  visibleRows.forEach((property, index) => {
    const rowY = headerY + 26 + index * rowHeight;

    if (index % 2 === 0) {
      doc
        .save()
        .roundedRect(x + 12, rowY - 8, width - 24, rowHeight - 4, 12)
        .fill(REPORT.colors.panel)
        .restore();
    }

    let cursor = x + 18;

    doc.font("Helvetica-Bold").fontSize(10).fillColor(REPORT.colors.ink);
    doc.text(truncate(doc, property.title, 186), cursor, rowY - 2, { width: 186 });
    doc.font("Helvetica").fontSize(8).fillColor(REPORT.colors.muted);
    doc.text(truncate(doc, `${property.location} | ${currencyLabel(property)}`, 186), cursor, rowY + 13, { width: 186 });
    cursor += columns[0].width;

    statusBadge(doc, property.status, cursor, rowY + 2);
    cursor += columns[1].width;

    [
      formatNumber(property.views),
      formatNumber(property.leads),
      formatNumber(property.visits),
      formatPercent(property.conversionRate),
      property.lastLeadAt ? formatShortDate(property.lastLeadAt) : "-",
    ].forEach((value, valueIndex) => {
      const columnWidth = columns[valueIndex + 2].width;
      doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .fillColor(REPORT.colors.ink)
        .text(value, cursor, rowY + 6, {
          width: columnWidth - 10,
          align: valueIndex < 3 ? "right" : "left",
        });
      cursor += columnWidth;
    });
  });
}

function drawBreakdownSection(
  doc: any,
  title: string,
  rows: BreakdownRow[],
  x: number,
  y: number,
  width: number,
  accent: string
) {
  const max = Math.max(1, ...rows.map((row) => row.count));

  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor(REPORT.colors.ink)
    .text(title, x, y);

  rows.slice(0, 4).forEach((row, index) => {
    const rowY = y + 18 + index * 18;
    doc.font("Helvetica").fontSize(8).fillColor(REPORT.colors.muted);
    doc.text(row.label, x, rowY, { width: 96 });
    doc
      .font("Helvetica-Bold")
      .fontSize(8)
      .fillColor(REPORT.colors.ink)
      .text(String(row.count), x + width - 26, rowY, { width: 18, align: "right" });

    doc
      .save()
      .roundedRect(x + 76, rowY + 2, width - 112, 6, 3)
      .fill("#E2E8F0")
      .restore();
    if (row.count > 0) {
      doc
        .save()
        .roundedRect(x + 76, rowY + 2, Math.max(8, ((width - 112) * row.count) / max), 6, 3)
        .fill(accent)
        .restore();
    }
  });
}

function drawInventoryCard(doc: any, analytics: AnalyticsPayload, x: number, y: number, width: number, height: number) {
  card(doc, x, y, width, height);

  doc
    .font("Helvetica-Bold")
    .fontSize(13)
    .fillColor(REPORT.colors.ink)
    .text("Inventory mix", x + 16, y + 16);
  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor(REPORT.colors.muted)
    .text(`${analytics.summary.activeListings} active of ${analytics.summary.totalListings} total listings`, x + 16, y + 34);

  drawBreakdownSection(
    doc,
    "Listing status",
    analytics.breakdowns.listings,
    x + 16,
    y + 54,
    width - 32,
    REPORT.colors.teal
  );
}

function drawPipelineCard(doc: any, analytics: AnalyticsPayload, x: number, y: number, width: number, height: number) {
  card(doc, x, y, width, height);

  doc
    .font("Helvetica-Bold")
    .fontSize(13)
    .fillColor(REPORT.colors.ink)
    .text("Pipeline status", x + 16, y + 16);

  drawBreakdownSection(
    doc,
    "Lead states",
    analytics.breakdowns.leads,
    x + 16,
    y + 40,
    width - 32,
    REPORT.colors.blue
  );
  drawBreakdownSection(
    doc,
    "Visit states",
    analytics.breakdowns.visits,
    x + 16,
    y + 112,
    width - 32,
    REPORT.colors.amber
  );
}

function drawActivityCard(doc: any, analytics: AnalyticsPayload, x: number, y: number, width: number, height: number) {
  card(doc, x, y, width, height);

  doc
    .font("Helvetica-Bold")
    .fontSize(13)
    .fillColor(REPORT.colors.ink)
    .text("Recent activity", x + 16, y + 16);
  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor(REPORT.colors.muted)
    .text("Most recent leads and visit updates captured in the workspace.", x + 16, y + 34, {
      width: width - 32,
    });

  const items = analytics.recentActivity.slice(0, 5);
  if (!items.length) {
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor(REPORT.colors.muted)
      .text("No recent lead or visit activity is available.", x + 16, y + 74);
    return;
  }

  items.forEach((item, index) => {
    const rowY = y + 68 + index * 28;
    doc
      .save()
      .circle(x + 20, rowY + 8, 4)
      .fill(item.type === "lead" ? REPORT.colors.blue : REPORT.colors.amber)
      .restore();

    doc.font("Helvetica-Bold").fontSize(9).fillColor(REPORT.colors.ink);
    doc.text(
      truncate(
        doc,
        item.type === "lead"
          ? `${item.actorName} sent a lead`
          : `${titleCase(item.status)} visit for ${item.actorName}`,
        width - 76
      ),
      x + 32,
      rowY,
      { width: width - 48 }
    );
    doc.font("Helvetica").fontSize(8).fillColor(REPORT.colors.muted);
    doc.text(
      truncate(doc, `${item.propertyTitle} | ${formatDateTime(item.occurredAt)}`, width - 48),
      x + 32,
      rowY + 12,
      { width: width - 48 }
    );
  });
}

function renderSellerAnalyticsReport(doc: any, analytics: AnalyticsPayload) {
  const page1 = startPage(doc, 1, "Overview");

  drawHero(doc, analytics, page1.left, page1.top, page1.width, 132);
  drawMetricCards(doc, analytics, page1.left, page1.top + 146, page1.width);
  drawTrendCard(doc, analytics, page1.left, page1.top + 256, 500, 248);
  drawFunnelCard(doc, analytics, page1.left + 514, page1.top + 256, 255, 118);
  drawHighlightsCard(doc, analytics, page1.left + 514, page1.top + 386, 255, 118);

  const page2 = startPage(doc, 2, "Operational Detail");
  drawPropertyTable(doc, analytics.propertyPerformance, page2.left, page2.top, 520, 500);
  drawInventoryCard(doc, analytics, page2.left + 534, page2.top, 235, 116);
  drawPipelineCard(doc, analytics, page2.left + 534, page2.top + 128, 235, 160);
  drawActivityCard(doc, analytics, page2.left + 534, page2.top + 300, 235, 200);
}

export async function getSellerAnalytics(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId as string;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const analytics = await sellerAnalyticsService.getSellerAnalytics(
      userId,
      getRangeFromRequest(req)
    );

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

export async function getSellerAnalyticsPdf(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId as string;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const analytics = await sellerAnalyticsService.getSellerAnalytics(
      userId,
      getRangeFromRequest(req)
    );

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="seller-analytics-${analytics.filters.range}.pdf"`
    );

    const doc = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margin: REPORT.margin,
      info: {
        Title: "Property Sewa Seller Analytics",
        Author: "Property Sewa",
        Subject: "Seller analytics export",
      },
    });

    doc.pipe(res);
    renderSellerAnalyticsReport(doc, analytics);
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
