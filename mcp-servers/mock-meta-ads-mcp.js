#!/usr/bin/env node
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

console.error("Mock Meta Ads MCP Server started.");

rl.on('line', (line) => {
  if (!line.trim()) return;
  try {
    const request = JSON.parse(line);
    const response = { jsonrpc: "2.0", id: request.id };

    if (request.method === 'initialize') {
      response.result = {
        protocolVersion: "2024-11-05",
        capabilities: {
          tools: {}
        },
        serverInfo: { name: "MockMetaAdsServer", version: "1.0.0" }
      };
    } else if (request.method === 'tools/list') {
      response.result = {
        tools: [
          {
            name: "get_campaign_performance",
            description: "Get Meta Ads campaign performance metrics",
            inputSchema: {
              type: "object",
              properties: {
                account_id: { type: "string" },
                time_range: { type: "object" }
              },
              required: ["account_id"]
            }
          },
          {
            name: "get_adset_performance",
            description: "Get Meta Ads adset performance metrics",
            inputSchema: {
              type: "object",
              properties: {
                account_id: { type: "string" },
                time_range: { type: "object" }
              },
              required: ["account_id"]
            }
          },
          {
            name: "get_ad_performance",
            description: "Get Meta Ads ad performance metrics",
            inputSchema: {
              type: "object",
              properties: {
                account_id: { type: "string" },
                time_range: { type: "object" }
              },
              required: ["account_id"]
            }
          }
        ]
      };
    } else if (request.method === 'tools/call') {
      const toolName = request.params.name;
      if (toolName === 'get_campaign_performance') {
        response.result = {
          content: [
            {
              type: "text",
              text: JSON.stringify([
                {
                  campaign_id: "100100",
                  campaign_name: "Lançamento Soja 2026",
                  spend: 1200.50,
                  impressions: 50000,
                  clicks: 1200,
                  reach: 40000,
                  conversas: 150,
                  leads: 45,
                  compras: 10
                }
              ])
            }
          ]
        };
      } else if (toolName === 'get_adset_performance') {
        response.result = {
          content: [
            {
              type: "text",
              text: JSON.stringify([
                {
                  adset_id: "10010001",
                  adset_name: "Interesses Produtores",
                  campaign_id: "100100",
                  campaign_name: "Lançamento Soja 2026",
                  spend: 400.16,
                  impressions: 16666,
                  clicks: 400,
                  reach: 13333,
                  conversas: 50,
                  leads: 15,
                  compras: 3
                }
              ])
            }
          ]
        };
      } else if (toolName === 'get_ad_performance') {
        response.result = {
          content: [
            {
              type: "text",
              text: JSON.stringify([
                {
                  ad_id: "1001000101",
                  ad_name: "Video_Depoimento_Produtor",
                  adset_id: "10010001",
                  adset_name: "Interesses Produtores",
                  campaign_id: "100100",
                  campaign_name: "Lançamento Soja 2026",
                  spend: 133.38,
                  impressions: 5555,
                  clicks: 133,
                  reach: 4444,
                  conversas: 16,
                  leads: 5,
                  compras: 1
                }
              ])
            }
          ]
        };
      } else {
        response.result = { content: [{ type: "text", text: "[]" }] };
      }
    } else {
      if (request.id !== undefined) {
        response.error = { code: -32601, message: "Method not found" };
      } else {
        return;
      }
    }

    process.stdout.write(JSON.stringify(response) + "\n");
  } catch (e) {
    console.error("Error in Mock MCP server:", e);
  }
});
