const { http, HttpResponse } = require('msw');

const anthropicHandler = http.post('https://api.anthropic.com/v1/messages', async ({ request }) => {
  const body = await request.json();
  const messages = body.messages || [];

  // Determine if it is the first call (asking for tools) or the second call (providing tool results)
  const hasToolResult = messages.some(msg => 
    Array.isArray(msg.content) && msg.content.some(c => c.type === 'tool_result')
  );

  if (!hasToolResult) {
    // 1. Return a tool_use request to trigger backend tool execution
    return HttpResponse.json({
      id: "msg_mock_tool_use_123",
      type: "message",
      role: "assistant",
      content: [
        {
          type: "text",
          text: "Vou consultar o desempenho das campanhas de anúncios para analisar o CPL e o ROAS."
        },
        {
          type: "tool_use",
          id: "toolu_mock_campaign_performance",
          name: "get_campaign_performance",
          input: {
            account_id: "act_77728399102",
            time_range: { since: "2026-06-01", until: "2026-06-30" }
          }
        }
      ],
      stop_reason: "tool_use",
      model: "claude-3-5-sonnet-20241022",
      usage: { input_tokens: 1500, output_tokens: 120 }
    });
  } else {
    // 2. Return the final synthesized recommendation text dynamically
    let userText = "";
    messages.forEach(msg => {
      if (msg.role === 'user' && msg.content) {
        if (typeof msg.content === 'string') {
          userText += " " + msg.content;
        } else if (Array.isArray(msg.content)) {
          userText += " " + msg.content.map(c => c.type === 'text' ? c.text : '').join(" ");
        }
      }
    });

    let replyText = "### Relatório de Diagnóstico de IA (Mock)\n\n* **CPL Mismatch:** A campanha 'Lançamento Soja 2026' registrou CPL de R$ 42,50 no Meta, mas apenas 5 leads reais no CRM.\n* **Recomendação:** Pausar 'Lançamento Soja 2026' e focar em 'Oferta Sementes Milho'.";

    const normalizedText = userText.toLowerCase();
    if (normalizedText.includes("instagram")) {
      replyText = "### Relatório de Diagnóstico do Instagram (Mock)\n\n* **Instagram Ads:** Campanhas no Instagram apresentaram CPL estável.\n* **Recomendação:** Aumentar orçamento no Instagram Stories.";
    } else if (normalizedText.includes("budget_allocation") || normalizedText.includes("orçamento") || normalizedText.includes("realocação")) {
      replyText = "### Relatório de Orçamento e Realocação de IA (Mock)\n\n* **Orçamento Excedido:** Recomendamos a realocação de 20% do orçamento de campanhas com alto CPL.\n* **Realocação:** Transferir verba para 'Oferta Sementes Milho'.";
    } else if (normalizedText.includes("creatives") || normalizedText.includes("criativos") || normalizedText.includes("hook") || normalizedText.includes("melhorias")) {
      replyText = "### Relatório de Melhorias de Criativos de IA (Mock)\n\n* **Hook Ineficiente:** O criativo de vídeo está com alta perda nos primeiros 3 segundos.\n* **Melhorias:** Mudar o Hook nos criativos para prender atenção.";
    } else if (normalizedText.includes("pixel") || normalizedText.includes("leads") || normalizedText.includes("crm") || normalizedText.includes("duplicados")) {
      replyText = "### Relatório de Discrepância de Pixel e CRM (Mock)\n\n* **Leads Duplicados:** Há leads duplicados nas tabelas.\n* **Verificação:** Checar eventos do pixel e dados do CRM para conciliação.";
    }

    return HttpResponse.json({
      id: "msg_mock_final_analysis_456",
      type: "message",
      role: "assistant",
      content: [
        {
          type: "text",
          text: replyText
        }
      ],
      stop_reason: "end_turn",
      model: "claude-3-5-sonnet-20241022",
      usage: { input_tokens: 2200, output_tokens: 300 }
    });
  }
});

module.exports = { anthropicHandler };
