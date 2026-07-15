const { http, HttpResponse } = require('msw');

const metaHandler = [
  // Mock listing ad accounts
  http.get('https://graph.facebook.com/v25.0/me/adaccounts', () => {
    return HttpResponse.json({
      data: [
        { id: "act_1034348999771083", name: "VM Equipamentos", account_id: "1034348999771083" },
        { id: "act_1052303464636478", name: "Ceres Equipamentos Agrícolas", account_id: "1052303464636478" },
        { id: "act_966926099845282", name: "Grão Mestre Agronegócio LTDA", account_id: "966926099845282" }
      ]
    });
  }),

  // Mock fetching insights (campaigns, adsets, ads, platforms)
  // We use :accountId/insights or wildcard to capture any account insights query
  http.get('https://graph.facebook.com/v25.0/:accountId/insights', ({ request, params }) => {
    const url = new URL(request.url);
    const level = url.searchParams.get('level') || 'campaign';
    const breakdowns = url.searchParams.get('breakdowns');

    if (breakdowns === 'publisher_platform') {
      return HttpResponse.json({
        data: [
          { campaign_id: "100100", campaign_name: "Lançamento Soja 2026", publisher_platform: "instagram", spend: "800.50", clicks: "700", impressions: "35000", reach: "30000", actions: [{ action_type: "onsite_conversion.lead", value: "30" }] },
          { campaign_id: "100100", campaign_name: "Lançamento Soja 2026", publisher_platform: "facebook", spend: "400.00", clicks: "500", impressions: "15000", reach: "10000", actions: [{ action_type: "onsite_conversion.lead", value: "15" }] }
        ]
      });
    }

    if (level === 'campaign') {
      return HttpResponse.json({
        data: [
          { campaign_id: "100100", campaign_name: "Lançamento Soja 2026", spend: "1200.50", clicks: "1200", impressions: "50000", reach: "40000", actions: [{ action_type: "onsite_conversion.messaging_conversation_started_7d", value: "150" }, { action_type: "onsite_conversion.lead", value: "45" }, { action_type: "omni_purchase", value: "10" }] }
        ]
      });
    }

    if (level === 'adset') {
      return HttpResponse.json({
        data: [
          { adset_id: "10010001", adset_name: "Interesses Produtores (Lançamento Soja 2026)", campaign_id: "100100", campaign_name: "Lançamento Soja 2026", spend: "400.16", clicks: "400", impressions: "16666", reach: "13333", actions: [{ action_type: "onsite_conversion.messaging_conversation_started_7d", value: "50" }, { action_type: "onsite_conversion.lead", value: "15" }, { action_type: "omni_purchase", value: "3" }] }
        ]
      });
    }

    if (level === 'ad') {
      return HttpResponse.json({
        data: [
          { ad_id: "1001000101", ad_name: "Video_Depoimento_Produtor [V1]", adset_id: "10010001", adset_name: "Interesses Produtores", campaign_id: "100100", campaign_name: "Lançamento Soja 2026", spend: "133.38", clicks: "133", impressions: "5555", reach: "4444", actions: [{ action_type: "onsite_conversion.messaging_conversation_started_7d", value: "16" }, { action_type: "onsite_conversion.lead", value: "5" }, { action_type: "omni_purchase", value: "1" }] }
        ]
      });
    }

    // Default empty / low values for other levels
    return HttpResponse.json({ data: [] });
  }),

  // Mock fetching Pixel Event Stats (GET /v25.0/<pixel_id>/stats)
  http.get('https://graph.facebook.com/v25.0/:pixelId/stats', () => {
    return HttpResponse.json({
      data: [
        { event: "PageView", value: "1200" },
        { event: "Lead", value: "85" },
        { event: "Purchase", value: "15" }
      ]
    });
  }),

  // Mock OAuth token exchange
  http.get('https://graph.facebook.com/v25.0/oauth/access_token', () => {
    return HttpResponse.json({
      access_token: "mock_fb_access_token_777"
    });
  })
];

module.exports = { metaHandler };
