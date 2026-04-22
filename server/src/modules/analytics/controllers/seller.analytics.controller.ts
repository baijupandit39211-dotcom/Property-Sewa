import type { NextFunction, Request, Response } from "express";
// @ts-ignore pdfkit does not ship types in this repository.
import PDFDocument from "pdfkit";

import { requireUserAuth } from "../../auth/middleware/auth.middleware";
import { requireRoles } from "../../../middleware/role.middleware";
import sellerAnalyticsService from "../services/seller.analytics.services";

const requireSellerOrAgent = requireRoles(["seller", "agent"]);

const REPORT = {
  margin: 28,
  colors: {
    brand: "#0F5B43",
    brandDark: "#0B3F31",
    brandSoft: "#E8F4EE",
    brandTint: "#F3FAF6",
    ink: "#0F172A",
    muted: "#667085",
    mutedSoft: "#98A2B3",
    line: "#DCE6E1",
    lineStrong: "#C8D5CF",
    panel: "#F8FAFC",
    panelSoft: "#FBFDFC",
    panelTint: "#F3F7F5",
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

function formatAxisLabel(value: number) {
  if (Number.isInteger(value)) return formatCompact(value);
  return value.toFixed(1).replace(/\.0$/, "");
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
  const y = box.bottom - 18;
  doc
    .save()
    .moveTo(box.left, y - 10)
    .lineTo(box.right, y - 10)
    .strokeColor(REPORT.colors.line)
    .stroke()
    .restore();

  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor(REPORT.colors.muted)
    .text("Property Sewa Seller Analytics Report", box.left, y, {
      width: 220,
      lineBreak: false,
    });
  doc
    .font("Helvetica")
    .text(`Page ${pageNumber}`, box.right - 60, y, {
      width: 60,
      align: "right",
      lineBreak: false,
    });
}

function startPage(doc: any, pageNumber: number, sectionLabel: string) {
  doc.addPage({ size: "A4", layout: "landscape", margin: REPORT.margin });

  const box = pageBox(doc);
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor(REPORT.colors.brand)
    .text("PROPERTY SEWA", box.left, 18, { lineBreak: false });
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor(REPORT.colors.muted)
    .text(sectionLabel, box.left, 18, {
    width: box.width,
    align: "right",
    lineBreak: false,
  });
  footer(doc, pageNumber);
  return box;
}

function drawHero(doc: any, analytics: AnalyticsPayload, x: number, y: number, width: number, height: number) {
  card(doc, x, y, width, height, REPORT.colors.white);

  doc
    .save()
    .roundedRect(x, y, width, 18, 18)
    .fill(REPORT.colors.brandDark)
    .restore();

  const summary = analytics.summary;
  const rangeLabel = `${formatDate(analytics.filters.startDate)} - ${formatDate(analytics.filters.endDate)}`;
  const panelX = x + width - 242;
  const panelY = y + 20;

  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor(REPORT.colors.brand)
    .text("SELLER ANALYTICS REPORT", x + 24, y + 30, { lineBreak: false });
  doc
    .font("Helvetica-Bold")
    .fontSize(30)
    .fillColor(REPORT.colors.ink)
    .text("Executive Performance Summary", x + 24, y + 48, { width: width - 300 });
  doc
    .font("Helvetica")
    .fontSize(11)
    .fillColor(REPORT.colors.muted)
    .text(
      "A premium Property Sewa export covering listing traffic, inquiry flow, visit progression, and operational highlights for the selected seller window.",
      x + 24,
      y + 86,
      { width: width - 300, lineGap: 2 }
    );
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor(REPORT.colors.mutedSoft)
    .text("Prepared for seller review, client updates, and internal reporting.", x + 24, y + 118, {
      width: width - 320,
    });

  doc
    .save()
    .roundedRect(panelX, panelY, 206, 96, 20)
    .fill(REPORT.colors.brandTint)
    .restore();
  doc
    .save()
    .roundedRect(panelX + 16, panelY + 16, 42, 42, 14)
    .fill(REPORT.colors.brand)
    .restore();
  doc
    .font("Helvetica-Bold")
    .fontSize(18)
    .fillColor(REPORT.colors.white)
    .text("PS", panelX + 27, panelY + 27);

  doc.font("Helvetica-Bold").fontSize(9).fillColor("#AFD9CB");
  doc.fillColor(REPORT.colors.muted).text("Reporting window", panelX + 72, panelY + 18);
  doc.text("Listings tracked", panelX + 72, panelY + 42);
  doc.text("Generated", panelX + 72, panelY + 66);

  doc.font("Helvetica-Bold").fontSize(10).fillColor(REPORT.colors.ink);
  doc.text(rangeLabel, panelX + 72, panelY + 29, { width: 118 });
  doc.text(String(summary.totalListings), panelX + 72, panelY + 53, { width: 118 });
  doc.text(formatDateTime(new Date()), panelX + 72, panelY + 77, { width: 118 });
}

function drawMetricCards(doc: any, analytics: AnalyticsPayload, x: number, y: number, width: number) {
  const summary = analytics.summary;
  const gap = 12;
  const cardWidth = (width - gap * 3) / 4;
  const cardHeight = 108;

  const metrics = [
    {
      title: "Total Views",
      value: formatNumber(summary.views),
      delta: formatSignedPercent(summary.viewsDelta),
      detail: `${formatCompact(summary.lifetimeViews)} lifetime`,
      accent: REPORT.colors.teal,
    },
    {
      title: "Total Inquiries",
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
    card(doc, cardX, y, cardWidth, cardHeight, REPORT.colors.panelSoft);

    doc
      .save()
      .roundedRect(cardX + 18, y + 18, 46, 7, 3)
      .fill(metric.accent)
      .restore();

    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor(REPORT.colors.muted)
      .text(metric.title.toUpperCase(), cardX + 18, y + 32);
    doc
      .font("Helvetica-Bold")
      .fontSize(28)
      .fillColor(REPORT.colors.ink)
      .text(metric.value, cardX + 18, y + 50, { lineBreak: false });

    pill(
      doc,
      cardX + cardWidth - 76,
      y + 18,
      metric.delta,
      "#F8FAFC",
      metric.delta.startsWith("-") ? REPORT.colors.rose : REPORT.colors.emerald,
      8
    );

    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(REPORT.colors.muted)
      .text(metric.detail, cardX + 18, y + 84);
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

function hasTrendData(trends: TrendPoint[]) {
  return trends.some(
    (row) => Number(row.views || 0) > 0 || Number(row.leads || 0) > 0 || Number(row.visits || 0) > 0
  );
}

function getChartAxisConfig(maxValue: number) {
  if (maxValue <= 1) {
    return { axisMax: 1, ticks: [0, 0.5, 1] };
  }

  if (maxValue <= 2) {
    return { axisMax: 2, ticks: [0, 1, 2] };
  }

  if (maxValue <= 5) {
    return { axisMax: 5, ticks: [0, 1, 2, 3, 4, 5] };
  }

  const roughStep = maxValue / 4;
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const normalized = roughStep / magnitude;
  const niceStep = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  const step = niceStep * magnitude;
  const axisMax = Math.ceil(maxValue / step) * step;

  return {
    axisMax,
    ticks: Array.from({ length: 5 }, (_, index) => (axisMax * index) / 4),
  };
}

function getChartXAxisLabels(trends: TrendPoint[], sparseData: boolean) {
  if (trends.length <= 7) {
    return trends.map((row) => row.label);
  }

  const targetCount = sparseData ? 6 : 7;
  const step = Math.max(1, Math.ceil((trends.length - 1) / Math.max(targetCount - 1, 1)));

  return trends.map((row, index) => {
    const shouldShow =
      index === 0 ||
      index === trends.length - 1 ||
      index % step === 0;

    if (!shouldShow) return "";
    return sparseData ? row.label : row.shortLabel || row.label;
  });
}

function linePoints(values: number[], x: number, y: number, width: number, height: number, maxValue: number) {
  const step = width / Math.max(values.length - 1, 1);
  return values.map((value, index) => ({
    x: x + step * index,
    y: y + height - (Number(value || 0) / Math.max(maxValue, 1)) * height,
    value: Number(value || 0),
  }));
}

function drawSmoothLine(
  doc: any,
  points: Array<{ x: number; y: number }>,
  color: string,
  lineWidth = 2
) {
  if (points.length <= 1) return;

  doc.save().lineWidth(lineWidth).strokeColor(color).lineJoin("round").lineCap("round");
  doc.moveTo(points[0].x, points[0].y);

  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    const controlX = (current.x + next.x) / 2;
    doc.bezierCurveTo(controlX, current.y, controlX, next.y, next.x, next.y);
  }

  doc.stroke().restore();
}

function drawAreaFill(
  doc: any,
  points: Array<{ x: number; y: number; value: number }>,
  baselineY: number,
  color: string
) {
  if (points.length <= 1) return;

  doc.save().fillColor(color).fillOpacity(0.12);
  doc.moveTo(points[0].x, baselineY);
  doc.lineTo(points[0].x, points[0].y);

  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    const controlX = (current.x + next.x) / 2;
    doc.bezierCurveTo(controlX, current.y, controlX, next.y, next.x, next.y);
  }

  doc.lineTo(points[points.length - 1].x, baselineY);
  doc.closePath().fill().restore();
}

function drawSparsePointGuide(
  doc: any,
  point: { x: number; y: number },
  baselineY: number,
  color: string
) {
  doc
    .save()
    .strokeColor(color)
    .lineWidth(1)
    .dash(3, { space: 4 })
    .moveTo(point.x, point.y)
    .lineTo(point.x, baselineY)
    .stroke()
    .undash()
    .restore();

  doc
    .save()
    .circle(point.x, point.y, 3.2)
    .fill(color)
    .restore();
}

function drawTrendCard(doc: any, analytics: AnalyticsPayload, x: number, y: number, width: number, height: number) {
  card(doc, x, y, width, height, REPORT.colors.panelSoft);

  const trends = analytics.trends;
  const views = trends.map((row) => Number(row.views || 0));
  const leads = trends.map((row) => Number(row.leads || 0));
  const visits = trends.map((row) => Number(row.visits || 0));
  const seriesMax = Math.max(...views, ...leads, ...visits, 0);
  const { axisMax, ticks } = getChartAxisConfig(seriesMax);
  const sparseData = seriesMax <= 2;
  const xLabels = getChartXAxisLabels(trends, sparseData);
  const anyTrendData = hasTrendData(trends);

  const chartX = x + 34;
  const chartY = y + 78;
  const chartWidth = width - 58;
  const chartHeight = height - 140;
  const plotLeft = chartX + 14;
  const plotWidth = chartWidth - 24;
  const baselineY = chartY + chartHeight;
  const viewsPoints = linePoints(views, plotLeft, chartY, plotWidth, chartHeight, axisMax);
  const leadsPoints = linePoints(leads, plotLeft, chartY, plotWidth, chartHeight, axisMax);
  const visitsPoints = linePoints(visits, plotLeft, chartY, plotWidth, chartHeight, axisMax);
  const bestDay = trends.reduce<TrendPoint | null>((best, row) => {
    if (!best) return row;
    return row.views > best.views ? row : best;
  }, null);

  doc
    .font("Helvetica-Bold")
    .fontSize(16)
    .fillColor(REPORT.colors.ink)
    .text("Performance overview", x + 22, y + 20);
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor(REPORT.colors.muted)
    .text("Daily views, inquiries, and visits across the selected reporting window.", x + 22, y + 40);

  let legendX = x + width - 210;
  [
    { label: "Views", color: REPORT.colors.teal },
    { label: "Inquiries", color: REPORT.colors.blue },
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

  doc
    .save()
    .roundedRect(plotLeft, chartY, plotWidth, chartHeight, 16)
    .fillAndStroke(REPORT.colors.white, REPORT.colors.line)
    .restore();

  if (!anyTrendData) {
    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .fillColor(REPORT.colors.ink)
      .text("No performance data yet", plotLeft, chartY + chartHeight / 2 - 12, {
        width: plotWidth,
        align: "center",
      });
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor(REPORT.colors.muted)
      .text("Change the date range or wait for listing activity to appear here.", plotLeft, chartY + chartHeight / 2 + 6, {
        width: plotWidth,
        align: "center",
      });
  } else {
    doc
      .save()
      .strokeColor("#D9E2DD")
      .lineWidth(1)
      .moveTo(plotLeft, baselineY)
      .lineTo(plotLeft + plotWidth, baselineY)
      .stroke()
      .restore();

    ticks.forEach((tick) => {
      const lineY = chartY + chartHeight - (tick / Math.max(axisMax, 1)) * chartHeight;
      doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .fillColor(REPORT.colors.muted)
        .text(formatAxisLabel(tick), chartX - 26, lineY - 4, {
          width: 22,
          align: "right",
        });
      doc
        .save()
        .strokeColor(REPORT.colors.line)
        .dash(3, { space: 5 })
        .moveTo(plotLeft, lineY)
        .lineTo(plotLeft + plotWidth, lineY)
        .stroke()
        .undash()
        .restore();
    });

    if (views.filter((value) => value > 0).length > 1) {
      drawAreaFill(doc, viewsPoints, baselineY, REPORT.colors.teal);
      drawSmoothLine(doc, viewsPoints, REPORT.colors.teal, 2.2);
    } else if (views.filter((value) => value > 0).length === 1) {
      drawSparsePointGuide(
        doc,
        viewsPoints.find((point) => point.value > 0)!,
        baselineY,
        REPORT.colors.teal
      );
    }
    if (leads.filter((value) => value > 0).length > 1) {
      drawSmoothLine(doc, leadsPoints, REPORT.colors.blue, 2);
    } else if (leads.filter((value) => value > 0).length === 1) {
      drawSparsePointGuide(
        doc,
        leadsPoints.find((point) => point.value > 0)!,
        baselineY,
        REPORT.colors.blue
      );
    }
    if (visits.filter((value) => value > 0).length > 1) {
      drawSmoothLine(doc, visitsPoints, REPORT.colors.amber, 2);
    } else if (visits.filter((value) => value > 0).length === 1) {
      drawSparsePointGuide(
        doc,
        visitsPoints.find((point) => point.value > 0)!,
        baselineY,
        REPORT.colors.amber
      );
    }

    [
      { points: viewsPoints, color: REPORT.colors.teal },
      { points: leadsPoints, color: REPORT.colors.blue },
      { points: visitsPoints, color: REPORT.colors.amber },
    ].forEach((series) => {
      const positivePoints = series.points.filter((point) => point.value > 0);
      if (positivePoints.length <= 1) return;

      positivePoints.forEach((point) => {
        doc
          .save()
          .circle(point.x, point.y, 2.8)
          .fill(series.color)
          .restore();
      });
    });

    xLabels.forEach((label, index) => {
      if (!label) return;
      doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .fillColor(REPORT.colors.muted)
        .text(label, viewsPoints[index]?.x - 18, baselineY + 10, {
          width: 36,
          align: "center",
        });
    });
  }

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
  card(doc, x, y, width, height, REPORT.colors.panelSoft);

  doc
    .font("Helvetica-Bold")
    .fontSize(16)
    .fillColor(REPORT.colors.ink)
    .text("Conversion funnel", x + 18, y + 18);
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor(REPORT.colors.muted)
    .text("How traffic is moving through the seller workflow.", x + 18, y + 38, {
      width: width - 36,
    });

  analytics.funnel.forEach((step, index) => {
    const rowY = y + 70 + index * 28;
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
      .roundedRect(x + 86, rowY + 4, width - 154, 10, 5)
      .fill("#E2E8F0")
      .restore();
    if (step.value > 0) {
      doc
        .save()
        .roundedRect(x + 86, rowY + 4, Math.max(10, ((width - 154) * step.ratio) / 100), 10, 5)
        .fill(index === 0 ? REPORT.colors.brand : index === 1 ? REPORT.colors.teal : index === 2 ? REPORT.colors.blue : REPORT.colors.amber)
        .restore();
    }
  });

  pill(doc, x + 18, y + height - 32, `Visit completion ${formatPercent(analytics.summary.visitCompletionRate)}`, REPORT.colors.brandTint, REPORT.colors.brand, 10);
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
  card(doc, x, y, width, height, REPORT.colors.brandDark);

  const topProperty =
    analytics.propertyPerformance.find(
      (property) => property.views > 0 || property.leads > 0 || property.visits > 0
    ) || analytics.propertyPerformance[0];

  doc
    .font("Helvetica-Bold")
    .fontSize(16)
    .fillColor(REPORT.colors.white)
    .text("Highlights and next actions", x + 18, y + 18);

  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor("#94A3B8")
    .text("TOP LISTING", x + 18, y + 46);
  doc
    .save()
    .roundedRect(x + 18, y + 58, width - 36, 42, 14)
    .fill("#114B39")
    .restore();
  doc
    .font("Helvetica-Bold")
    .fontSize(12)
    .fillColor(REPORT.colors.white)
    .text(topProperty ? truncate(doc, topProperty.title, width - 52) : "No active listing data", x + 26, y + 68);
  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor("#CBD5E1")
    .text(
      topProperty
        ? `${formatNumber(topProperty.views)} views | ${formatNumber(topProperty.leads)} leads | ${formatPercent(topProperty.conversionRate)} conversion`
        : "Performance details will appear once listing activity is recorded.",
      x + 18,
      y + 110,
      { width: width - 36, lineGap: 2 }
    );

  let noteY = y + 150;
  reportRecommendations(analytics).forEach((item, index) => {
    doc
      .save()
      .roundedRect(x + 18, noteY - 2, width - 36, 24, 10)
      .fill("#114B39")
      .restore();
    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor("#9AE6B4")
      .text(`${index + 1}`, x + 24, noteY + 5);
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#E2E8F0")
      .text(item, x + 40, noteY + 4, {
        width: width - 62,
        lineGap: 1,
      });
    noteY += 30;
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

  return pill(doc, x, y, label, fill, text, 9);
}

function drawPropertyTable(doc: any, properties: PropertyRow[], x: number, y: number, width: number, height: number) {
  card(doc, x, y, width, height, REPORT.colors.panelSoft);

  doc
    .font("Helvetica-Bold")
    .fontSize(16)
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

  const headerY = y + 78;
  doc
    .save()
    .roundedRect(x + 14, headerY - 10, width - 28, 26, 12)
    .fill(REPORT.colors.panelTint)
    .restore();
  drawTableHeader(doc, columns, x + 18, headerY);

  const visibleRows = properties.slice(0, 5);
  const rowHeight = 58;

  if (!visibleRows.length) {
    doc
      .font("Helvetica")
      .fontSize(11)
      .fillColor(REPORT.colors.muted)
      .text("No listing activity is available for the selected period.", x + 18, y + 118);
    return;
  }

  visibleRows.forEach((property, index) => {
    const rowY = headerY + 30 + index * rowHeight;

    doc
      .save()
      .roundedRect(x + 12, rowY - 10, width - 24, rowHeight - 8, 14)
      .fill(index % 2 === 0 ? REPORT.colors.white : REPORT.colors.panelTint)
      .stroke(REPORT.colors.line)
      .restore();

    let cursor = x + 18;

    doc.font("Helvetica-Bold").fontSize(10).fillColor(REPORT.colors.ink);
    doc.text(truncate(doc, property.title, 186), cursor, rowY - 2, { width: 186 });
    doc.font("Helvetica").fontSize(8).fillColor(REPORT.colors.muted);
    doc.text(truncate(doc, property.location, 186), cursor, rowY + 14, { width: 186 });
    doc.font("Helvetica-Bold").fontSize(8).fillColor(REPORT.colors.brand);
    doc.text(currencyLabel(property), cursor, rowY + 29, { width: 186 });
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
        .text(value, cursor, rowY + 10, {
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
    const rowY = y + 22 + index * 22;
    doc.font("Helvetica").fontSize(8).fillColor(REPORT.colors.muted);
    doc.text(row.label, x, rowY, { width: 96 });
    doc
      .font("Helvetica-Bold")
      .fontSize(8)
      .fillColor(REPORT.colors.ink)
      .text(String(row.count), x + width - 26, rowY, { width: 18, align: "right" });

    doc
      .save()
      .roundedRect(x + 76, rowY + 3, width - 112, 7, 3)
      .fill("#E2E8F0")
      .restore();
    if (row.count > 0) {
      doc
        .save()
        .roundedRect(x + 76, rowY + 3, Math.max(8, ((width - 112) * row.count) / max), 7, 3)
        .fill(accent)
        .restore();
    }
  });
}

function drawInventoryCard(doc: any, analytics: AnalyticsPayload, x: number, y: number, width: number, height: number) {
  card(doc, x, y, width, height, REPORT.colors.panelSoft);

  doc
    .font("Helvetica-Bold")
    .fontSize(15)
    .fillColor(REPORT.colors.ink)
    .text("Inventory summary", x + 16, y + 16);
  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor(REPORT.colors.muted)
    .text(`${analytics.summary.activeListings} active of ${analytics.summary.totalListings} total listings`, x + 16, y + 34, {
      width: width - 32,
    });

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
  card(doc, x, y, width, height, REPORT.colors.panelSoft);

  doc
    .font("Helvetica-Bold")
    .fontSize(15)
    .fillColor(REPORT.colors.ink)
    .text("Pipeline status", x + 16, y + 16);
  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor(REPORT.colors.muted)
    .text("Lead and visit statuses across the current reporting window.", x + 16, y + 34, {
      width: width - 32,
    });

  drawBreakdownSection(
    doc,
    "Lead states",
    analytics.breakdowns.leads,
    x + 16,
    y + 58,
    width - 32,
    REPORT.colors.blue
  );
  drawBreakdownSection(
    doc,
    "Visit states",
    analytics.breakdowns.visits,
    x + 16,
    y + 140,
    width - 32,
    REPORT.colors.amber
  );
}

function drawActivityCard(doc: any, analytics: AnalyticsPayload, x: number, y: number, width: number, height: number) {
  card(doc, x, y, width, height, REPORT.colors.panelSoft);

  doc
    .font("Helvetica-Bold")
    .fontSize(15)
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
    const rowY = y + 74 + index * 36;
    doc
      .save()
      .roundedRect(x + 14, rowY - 8, width - 28, 28, 10)
      .fill(index % 2 === 0 ? REPORT.colors.white : REPORT.colors.panelTint)
      .restore();
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
      rowY + 14,
      { width: width - 48 }
    );
  });
}

function renderSellerAnalyticsReport(doc: any, analytics: AnalyticsPayload) {
  const page1 = startPage(doc, 1, "Overview");

  drawHero(doc, analytics, page1.left, page1.top, page1.width, 150);
  drawMetricCards(doc, analytics, page1.left, page1.top + 164, page1.width);
  drawTrendCard(doc, analytics, page1.left, page1.top + 286, 540, 220);
  drawFunnelCard(doc, analytics, page1.left + 554, page1.top + 286, 210, 220);

  const page2 = startPage(doc, 2, "Operational Detail");
  drawPropertyTable(doc, analytics.propertyPerformance, page2.left, page2.top, 540, 440);
  drawInventoryCard(doc, analytics, page2.left + 554, page2.top, 210, 166);
  drawPipelineCard(doc, analytics, page2.left + 554, page2.top + 180, 210, 188);

  if (analytics.recentActivity.length > 0) {
    const page3 = startPage(doc, 3, "Activity & Insights");
    drawActivityCard(doc, analytics, page3.left, page3.top, 390, 250);
    drawHighlightsCard(doc, analytics, page3.left + 404, page3.top, 360, 250);
  }
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
      autoFirstPage: false,
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
