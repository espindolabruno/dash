// Função global para converter strings de datas variadas de forma segura no frontend
window.parseDateSafe = function(dateStr) {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return dateStr;
  
  let dateObj = new Date(dateStr);
  if (!isNaN(dateObj.getTime())) return dateObj;
  
  // Tenta normalizar espaços por 'T' para ISO-8601
  let normalized = dateStr.toString().replace(' ', 'T');
  dateObj = new Date(normalized);
  if (!isNaN(dateObj.getTime())) return dateObj;
  
  // Trata o formato brasileiro comum: DD/MM/AAAA - HH:MM:SS ou DD/MM/AAAA HH:MM
  if (dateStr.includes('/')) {
    const cleanStr = dateStr.toString().replace(/\s*-\s*/g, ' ').trim();
    const parts = cleanStr.split(/\s+/);
    const dateParts = parts[0].split('/');
    if (dateParts.length === 3) {
      const day = parseInt(dateParts[0], 10);
      const month = parseInt(dateParts[1], 10) - 1; // 0-indexed no JS
      let year = parseInt(dateParts[2], 10);
      if (year < 100) year += 2000;
      
      let hours = 0, minutes = 0, seconds = 0;
      if (parts[1]) {
        const timeParts = parts[1].split(':');
        hours = parseInt(timeParts[0], 10) || 0;
        minutes = parseInt(timeParts[1], 10) || 0;
        seconds = parseInt(timeParts[2], 10) || 0;
      }
      
      dateObj = new Date(year, month, day, hours, minutes, seconds);
      if (!isNaN(dateObj.getTime())) return dateObj;
    }
  }
  
  return null;
};

// Gerenciador de Gráficos (utilizando ApexCharts)
const ChartsManager = {
  instances: {},

  // Inicializa todos os gráficos vazios na página
  init: function() {
    const defaultOptions = {
      chart: {
        background: 'transparent',
        foreColor: 'var(--text-secondary)',
        toolbar: { show: false },
        zoom: { enabled: false }
      },
      theme: { mode: 'dark' },
      grid: { borderColor: 'rgba(255, 255, 255, 0.05)' },
      noData: {
        text: 'Nenhum dado disponível',
        style: { color: 'var(--text-secondary)', fontSize: '14px' }
      }
    };

    // 1. Gráfico de Evolução Temporal (Área)
    this.instances.timeline = new ApexCharts(document.querySelector("#chart-timeline"), {
      ...defaultOptions,
      chart: {
        ...defaultOptions.chart,
        type: 'area',
        height: 300,
        animations: { enabled: true, easing: 'easeinout', speed: 800 }
      },
      colors: ['var(--primary)', 'var(--accent-1)', 'var(--accent-2)', 'var(--success)'],
      stroke: { curve: 'smooth', width: 3 },
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.45,
          opacityTo: 0.05,
          stops: [0, 95]
        }
      },
      dataLabels: { enabled: false },
      xaxis: { type: 'datetime' },
      tooltip: { theme: 'dark', x: { format: 'dd MMM yyyy' } },
      series: []
    });
    this.instances.timeline.render();

    // 2. Gráfico de Rosca (Plataformas)
    this.instances.platforms = new ApexCharts(document.querySelector("#chart-platforms"), {
      ...defaultOptions,
      chart: {
        ...defaultOptions.chart,
        type: 'donut',
        height: 240
      },
      colors: ['#1877F2', '#4285F4', '#00F2FE', '#34A853', '#EA4335', '#FEC601'],
      stroke: { width: 0 },
      plotOptions: {
        pie: {
          donut: {
            size: '70%',
            labels: {
              show: true,
              total: {
                show: true,
                label: 'Total Leads',
                color: 'var(--text-secondary)',
                formatter: function (w) {
                  return w.globals.seriesTotals.reduce((a, b) => a + b, 0);
                }
              }
            }
          }
        }
      },
      dataLabels: { enabled: false },
      legend: { position: 'bottom', horizontalAlign: 'center' },
      series: [],
      labels: []
    });
    this.instances.platforms.render();

    // 3. Gráfico de Rosca (Dispositivos)
    this.instances.devices = new ApexCharts(document.querySelector("#chart-devices"), {
      ...defaultOptions,
      chart: {
        ...defaultOptions.chart,
        type: 'donut',
        height: 240
      },
      colors: ['var(--primary)', 'var(--accent-2)', 'var(--accent-1)'],
      stroke: { width: 0 },
      plotOptions: {
        pie: {
          donut: {
            size: '70%',
            labels: {
              show: true,
              total: {
                show: true,
                label: 'Dispositivos',
                color: 'var(--text-secondary)',
                formatter: function (w) {
                  return w.globals.seriesTotals.reduce((a, b) => a + b, 0);
                }
              }
            }
          }
        }
      },
      dataLabels: { enabled: false },
      legend: { position: 'bottom', horizontalAlign: 'center' },
      series: [],
      labels: []
    });
    this.instances.devices.render();

    // 4. Gráfico de Barras (Top Campanhas)
    this.instances.campaigns = new ApexCharts(document.querySelector("#chart-campaigns"), {
      ...defaultOptions,
      chart: {
        ...defaultOptions.chart,
        type: 'bar',
        height: 250
      },
      colors: ['var(--primary)'],
      plotOptions: {
        bar: {
          borderRadius: 6,
          columnWidth: '50%',
          distributed: true
        }
      },
      dataLabels: { enabled: false },
      legend: { show: false },
      xaxis: { categories: [] },
      series: [{ name: 'Leads', data: [] }]
    });
    this.instances.campaigns.render();

    // 5. Mapa de Calor (Heatmap) - Leads por Dia da Semana e Faixa Horária
    this.instances.heatmap = new ApexCharts(document.querySelector("#chart-heatmap"), {
      ...defaultOptions,
      chart: {
        ...defaultOptions.chart,
        type: 'heatmap',
        height: 280
      },
      dataLabels: { 
        enabled: true,
        style: {
          fontSize: '10px',
          fontFamily: 'var(--font-main)',
          fontWeight: 'bold',
          colors: ['var(--text-primary)']
        }
      },
      colors: ['#00F2FE'], // Gradiente azul/ciano
      plotOptions: {
        heatmap: {
          shadeIntensity: 0.5,
          radius: 4,
          useFillColorAsStroke: false,
          colorScale: {
            ranges: [{
              from: 0,
              to: 0,
              name: 'Sem Leads',
              color: 'rgba(255, 255, 255, 0.03)'
            }, {
              from: 1,
              to: 5,
              name: 'Baixo',
              color: 'rgba(0, 242, 254, 0.35)'
            }, {
              from: 6,
              to: 15,
              name: 'Médio',
              color: 'rgba(0, 242, 254, 0.65)'
            }, {
              from: 16,
              to: 1000,
              name: 'Alto',
              color: 'rgba(0, 242, 254, 0.95)'
            }]
          }
        }
      },
      xaxis: {
        categories: ['00-04h', '04-08h', '08-12h', '12-16h', '16-20h', '20-24h']
      },
      series: []
    });
    this.instances.heatmap.render();

    // 6. Gráfico de Barras Horizontais (Ranking de UTMs)
    this.instances.utmRanking = new ApexCharts(document.querySelector("#chart-utm-ranking"), {
      ...defaultOptions,
      chart: {
        ...defaultOptions.chart,
        type: 'bar',
        height: 280
      },
      colors: ['var(--accent-2)'],
      plotOptions: {
        bar: {
          borderRadius: 4,
          horizontal: true,
          barHeight: '60%'
        }
      },
      dataLabels: {
        enabled: true,
        textAnchor: 'start',
        style: { colors: ['#fff'] },
        offsetX: 10
      },
      xaxis: { categories: [] },
      series: [{ name: 'Leads', data: [] }]
    });
    this.instances.utmRanking.render();

    // 7. Gráfico Comparativo Regional (Cliques vs. Conversas por Estado)
    this.instances.regionsComparison = new ApexCharts(document.querySelector("#chart-regions-comparison"), {
      ...defaultOptions,
      chart: {
        ...defaultOptions.chart,
        type: 'bar',
        height: 250,
        toolbar: { show: false }
      },
      colors: ['var(--accent-2)', 'var(--primary)'],
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: '55%',
          borderRadius: 4
        },
      },
      dataLabels: { enabled: false },
      stroke: { show: true, width: 2, colors: ['transparent'] },
      xaxis: { categories: [] },
      yaxis: [
        {
          title: { text: 'Cliques', style: { color: 'var(--accent-2)', fontFamily: 'var(--font-main)' } },
          labels: { style: { colors: 'var(--accent-2)' } }
        },
        {
          opposite: true,
          title: { text: 'Conversas', style: { color: 'var(--primary)', fontFamily: 'var(--font-main)' } },
          labels: { style: { colors: 'var(--primary)' } }
        }
      ],
      tooltip: { shared: true, intersect: false, theme: 'dark' },
      series: [
        { name: 'Cliques', data: [] },
        { name: 'Conversas', data: [] }
      ]
    });
    this.instances.regionsComparison.render();

    // 8. Gráfico de Rosca de Plataformas Meta
    this.instances.metaPlatforms = new ApexCharts(document.querySelector("#chart-meta-platforms"), {
      ...defaultOptions,
      chart: {
        ...defaultOptions.chart,
        type: 'donut',
        height: 230
      },
      colors: ['#E1306C', '#1877F2', '#0084FF', '#444'], // Instagram, Facebook, Messenger, Outros
      stroke: { width: 0 },
      plotOptions: {
        pie: {
          donut: {
            size: '70%',
            labels: {
              show: true,
              total: {
                show: true,
                label: 'Inv. Total',
                color: 'var(--text-secondary)',
                formatter: function (w) {
                  const val = w.globals.seriesTotals.reduce((a, b) => a + b, 0);
                  return 'R$ ' + val.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
                }
              }
            }
          }
        }
      },
      dataLabels: { enabled: false },
      legend: { position: 'bottom', horizontalAlign: 'center' },
      series: [],
      labels: []
    });
    this.instances.metaPlatforms.render();
  },

  // Processa e atualiza os gráficos com novos dados de leads
  updateCharts: function(leads) {
    if (!leads || leads.length === 0) {
      // Limpa dados se vazio
      Object.values(this.instances).forEach(chart => {
        chart.updateSeries([]);
      });
      return;
    }

    // 1. Processar Timeline (Leads agrupados por Dia e Plataforma)
    const timelineData = {};
    const platformsList = [...new Set(leads.map(l => l.platform))];
    
    // Agrupa por dia (AAAA-MM-DD)
    leads.forEach(l => {
      if (!l.date) return;
      const day = l.date.substring(0, 10);
      if (!timelineData[day]) {
        timelineData[day] = {};
        platformsList.forEach(p => timelineData[day][p] = 0);
      }
      timelineData[day][l.platform] = (timelineData[day][l.platform] || 0) + 1;
    });

    const sortedDays = Object.keys(timelineData).sort((a, b) => new Date(a) - new Date(b));
    const timelineSeries = platformsList.map(platform => {
      return {
        name: platform,
        data: sortedDays.map(day => {
          return {
            x: new Date(day).getTime(),
            y: timelineData[day][platform]
          };
        })
      };
    });

    this.instances.timeline.updateSeries(timelineSeries);

    // 2. Processar Plataformas (Pizza/Rosca)
    const platformCounts = {};
    leads.forEach(l => {
      platformCounts[l.platform] = (platformCounts[l.platform] || 0) + 1;
    });
    const platformLabels = Object.keys(platformCounts);
    const platformSeries = Object.values(platformCounts);

    this.instances.platforms.updateOptions({ labels: platformLabels });
    this.instances.platforms.updateSeries(platformSeries);

    // 3. Processar Dispositivos (Pizza/Rosca)
    const deviceCounts = {};
    leads.forEach(l => {
      const dev = l.device || 'Não Especificado';
      deviceCounts[dev] = (deviceCounts[dev] || 0) + 1;
    });
    const deviceLabels = Object.keys(deviceCounts);
    const deviceSeries = Object.values(deviceCounts);

    this.instances.devices.updateOptions({ labels: deviceLabels });
    this.instances.devices.updateSeries(deviceSeries);

    // 4. Processar Top Campanhas (Barras)
    const campaignCounts = {};
    leads.forEach(l => {
      const camp = l.campaign || 'Sem Campanha (Direto)';
      campaignCounts[camp] = (campaignCounts[camp] || 0) + 1;
    });
    const sortedCampaigns = Object.entries(campaignCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5); // Top 5
    
    this.instances.campaigns.updateOptions({
      xaxis: { categories: sortedCampaigns.map(c => c[0]) }
    });
    this.instances.campaigns.updateSeries([{
      name: 'Leads',
      data: sortedCampaigns.map(c => c[1])
    }]);

    // 5. Processar Heatmap (Dia da Semana x Faixa Horária)
    // Faixas: 0 (00-04), 1 (04-08), 2 (08-12), 3 (12-16), 4 (16-20), 5 (20-00)
    const heatmapData = {
      0: Array(6).fill(0), // Domingo
      1: Array(6).fill(0), // Segunda
      2: Array(6).fill(0), // Terça
      3: Array(6).fill(0), // Quarta
      4: Array(6).fill(0), // Quinta
      5: Array(6).fill(0), // Sexta
      6: Array(6).fill(0)  // Sábado
    };

    leads.forEach(l => {
      if (!l.date) return;
      const dateObj = window.parseDateSafe(l.date);
      if (!dateObj) return;
      
      const day = dateObj.getDay(); // 0 a 6
      const hour = dateObj.getHours(); // 0 a 23
      const hourBracket = Math.floor(hour / 4); // 0 a 5
      
      heatmapData[day][hourBracket]++;
    });

    const dayLabels = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    // Invertemos a ordem para que Segunda comece em cima e Domingo em baixo (padrão visual comum)
    const heatmapSeries = [1, 2, 3, 4, 5, 6, 0].map(dayIdx => {
      return {
        name: dayLabels[dayIdx],
        data: heatmapData[dayIdx].map((val, bracketIdx) => {
          return {
            x: ['00-04h', '04-08h', '08-12h', '12-16h', '16-20h', '20-24h'][bracketIdx],
            y: val
          };
        })
      };
    });

    this.instances.heatmap.updateSeries(heatmapSeries);

    // 6. Ranking de UTMs (Criativo / Copy / Conjunto) - Inicialmente "Criativo"
    this.updateUtmRanking(leads, 'creative');
  },

  // Permite mudar o filtro de UTM para o gráfico de barras horizontais
  updateUtmRanking: function(leads, type) {
    const counts = {};
    leads.forEach(l => {
      let val = l[type] || '';
      if (!val) {
        if (type === 'creative') val = 'Sem Criativo';
        else if (type === 'copy') val = 'Sem Copy';
        else val = 'Sem Conjunto';
      }
      counts[val] = (counts[val] || 0) + 1;
    });

    const sorted = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8); // Top 8

    this.instances.utmRanking.updateOptions({
      xaxis: { categories: sorted.map(item => item[0]) }
    });
    this.instances.utmRanking.updateSeries([{
      name: 'Leads',
      data: sorted.map(item => item[1])
    }]);
  },

  // Desenha dinamicamente o Funil em CSS/SVG personalizado
  renderFunnel: function(reach, clicks, conversas, leadsCrm, vendasCrm) {
    const container = document.getElementById('funnel-container');
    if (!container) return;

    const steps = [
      { name: 'Alcance (Meta)', val: reach, colorClass: 'step-1' },
      { name: 'Cliques (Meta)', val: clicks, colorClass: 'step-2' },
      { name: 'Conversas (Meta)', val: conversas, colorClass: 'step-3' },
      { name: 'Leads (CRM)', val: leadsCrm, colorClass: 'step-4' },
      { name: 'Vendas (CRM)', val: vendasCrm, colorClass: 'step-5' }
    ];

    let html = '';
    
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const formattedVal = step.val.toLocaleString('pt-BR');
      
      html += `
        <div class="funnel-step-wrapper">
          <div class="funnel-step ${step.colorClass}">
            <div class="funnel-step-label">
              <span class="funnel-step-name">${step.name}</span>
              <span class="funnel-step-val">${formattedVal}</span>
            </div>
          </div>
      `;
      
      if (i < steps.length - 1) {
        const nextStep = steps[i+1];
        let pct = 0;
        if (step.val > 0) {
          pct = (nextStep.val / step.val) * 100;
        }
        
        let label = 'Taxa de Conversão';
        let highlightClass = '';
        if (i === 0) { label = 'CTR (Cliques/Alcance)'; highlightClass = 'highlight'; }
        else if (i === 1) { label = 'Cliques em Conversa'; highlightClass = 'highlight'; }
        else if (i === 2) { label = 'Conversas em Leads'; highlightClass = 'highlight'; }
        else if (i === 3) { label = 'Vendas/Leads (CRM)'; highlightClass = 'highlight'; }
        
        html += `
          <div class="funnel-conversion-badge ${highlightClass}">
            <i class="fa-solid fa-arrow-down-long"></i>
            <span>${label}: <strong>${pct.toFixed(2)}%</strong></span>
          </div>
        `;
      }
      
      html += `</div>`;
    }
    
    container.innerHTML = html;
  },

  // Atualiza todo o painel de Auditoria e Raio-X Meta Ads
  updateMetaAudit: function(metaData, selectedCampaignId, selectedAdsetId, selectedAdId, localLeads) {
    if (!metaData) return;

    // 1. Filtrar dados do Meta Ads com base nas seleções ativas
    let campaigns = metaData.campaigns || [];
    let adsets = metaData.adsets || [];
    let creatives = metaData.creatives || [];
    let regions = metaData.regions || [];
    let platforms = metaData.platforms || [];

    // Encontrar os nomes correspondentes para filtrar as leads locais do CRM
    let activeCampaignName = null;
    let activeAdsetName = null;
    let activeAdName = null;

    if (selectedCampaignId) {
      const camp = campaigns.find(c => c.campaign_id === selectedCampaignId);
      if (camp) activeCampaignName = camp.campaign_name;
      
      adsets = adsets.filter(a => a.campaign_id === selectedCampaignId);
      creatives = creatives.filter(c => c.campaign_id === selectedCampaignId);
      regions = regions.filter(r => r.campaign_id === selectedCampaignId);
      platforms = platforms.filter(p => p.campaign_id === selectedCampaignId);
    }

    if (selectedAdsetId) {
      const adset = adsets.find(a => a.adset_id === selectedAdsetId);
      if (adset) activeAdsetName = adset.adset_name;
      
      creatives = creatives.filter(c => c.adset_id === selectedAdsetId);
      const adsetObj = adsets.find(a => a.adset_id === selectedAdsetId);
      if (adsetObj) {
        regions = regions.filter(r => r.campaign_id === adsetObj.campaign_id);
        platforms = platforms.filter(p => p.campaign_id === adsetObj.campaign_id);
      }
    }

    if (selectedAdId) {
      const ad = creatives.find(c => c.ad_id === selectedAdId);
      if (ad) activeAdName = ad.ad_name;
      
      const adObj = creatives.find(c => c.ad_id === selectedAdId);
      if (adObj) {
        regions = regions.filter(r => r.campaign_id === adObj.campaign_id);
        platforms = platforms.filter(p => p.campaign_id === adObj.campaign_id);
      }
    }

    // 2. Calcular KPIs de Meta
    let totalSpend = 0;
    let totalClicks = 0;
    let totalImpressions = 0;
    let totalReach = 0;
    let totalConversas = 0;
    let totalSeguidores = 0;

    if (selectedAdId) {
      const targetAd = creatives.find(c => c.ad_id === selectedAdId);
      if (targetAd) {
        totalSpend = targetAd.spend;
        totalClicks = targetAd.clicks;
        totalImpressions = targetAd.impressions;
        totalReach = targetAd.reach;
        totalConversas = targetAd.conversas;
        totalSeguidores = targetAd.seguidores;
      }
    } else if (selectedAdsetId) {
      const targetAdset = adsets.find(a => a.adset_id === selectedAdsetId);
      if (targetAdset) {
        totalSpend = targetAdset.spend;
        totalClicks = targetAdset.clicks;
        totalImpressions = targetAdset.impressions;
        totalReach = targetAdset.reach;
        totalConversas = targetAdset.conversas;
        totalSeguidores = targetAdset.seguidores;
      }
    } else if (selectedCampaignId) {
      const targetCamp = campaigns.find(c => c.campaign_id === selectedCampaignId);
      if (targetCamp) {
        totalSpend = targetCamp.spend;
        totalClicks = targetCamp.clicks;
        totalImpressions = targetCamp.impressions;
        totalReach = targetCamp.reach;
        totalConversas = targetCamp.conversas;
        totalSeguidores = targetCamp.seguidores;
      }
    } else {
      campaigns.forEach(c => {
        totalSpend += c.spend;
        totalClicks += c.clicks;
        totalImpressions += c.impressions;
        totalReach += c.reach;
        totalConversas += c.conversas;
        totalSeguidores += c.seguidores;
      });
    }

    const cpa = totalConversas > 0 ? (totalSpend / totalConversas) : 0;

    // Atualizar os KPIs na tela
    document.getElementById('meta-audit-spend').textContent = 'R$ ' + totalSpend.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    document.getElementById('meta-audit-conversations').textContent = totalConversas.toLocaleString('pt-BR');
    document.getElementById('meta-audit-cpa').textContent = 'R$ ' + cpa.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    document.getElementById('meta-audit-reach').textContent = totalReach.toLocaleString('pt-BR');
    document.getElementById('meta-audit-followers').textContent = totalSeguidores.toLocaleString('pt-BR');

    // 3. Filtrar as leads locais do CRM para conectar ao Funil
    let filteredCrmLeads = localLeads;
    if (activeCampaignName) {
      filteredCrmLeads = filteredCrmLeads.filter(l => l.campaign === activeCampaignName);
    }
    if (activeAdsetName) {
      filteredCrmLeads = filteredCrmLeads.filter(l => l.adset === activeAdsetName);
    }
    if (activeAdName) {
      const cleanAdName = activeAdName.replace(/\s*\[V\d+\]$/, '');
      filteredCrmLeads = filteredCrmLeads.filter(l => l.creative === cleanAdName || l.creative === activeAdName);
    }

    const totalLeadsCrm = filteredCrmLeads.length;
    const totalVendasCrm = filteredCrmLeads.filter(l => l.phase === 'Converteu').length;

    // 4. Desenhar o Funil (Alcance, Cliques, Conversas, Leads, Vendas)
    this.renderFunnel(totalReach, totalClicks, totalConversas, totalLeadsCrm, totalVendasCrm);

    // 5. Atualizar Gráfico de Plataformas Meta
    const platformSpendMap = {};
    platforms.forEach(p => {
      const platName = p.publisher_platform || 'Outro';
      const prettyPlatName = platName.charAt(0).toUpperCase() + platName.slice(1);
      platformSpendMap[prettyPlatName] = (platformSpendMap[prettyPlatName] || 0) + p.spend;
    });
    const platLabels = Object.keys(platformSpendMap);
    const platSeries = Object.values(platformSpendMap);
    this.instances.metaPlatforms.updateOptions({ labels: platLabels });
    this.instances.metaPlatforms.updateSeries(platSeries);

    // 6. Atualizar Gráfico e Tabela Geográfica (SP vs. PR)
    const regionMetrics = {};
    regions.forEach(r => {
      const regName = r.region || 'Não Especificada';
      if (!regionMetrics[regName]) {
        regionMetrics[regName] = { spend: 0, clicks: 0, conversas: 0, seguidores: 0, crmLeads: 0, crmConversas: 0 };
      }
      regionMetrics[regName].spend += parseFloat(r.spend || 0);
      regionMetrics[regName].clicks += parseInt(r.clicks || 0, 10);
      regionMetrics[regName].conversas += parseInt(r.conversas || 0, 10);
      regionMetrics[regName].seguidores += parseInt(r.seguidores || 0, 10);
    });

    const activePhases = ['Cliente em potencial', 'Proposta enviada', 'Converteu', 'Perdido'];
    filteredCrmLeads.forEach(l => {
      if (l.phone) {
        const match = l.phone.match(/\((\d{2})\)/);
        if (match) {
          const ddd = match[1];
          let est = 'Outros';
          if (['11', '12', '13', '14', '15', '16', '17', '18', '19'].includes(ddd)) est = 'São Paulo';
          else if (['41', '42', '43', '44', '45', '46'].includes(ddd)) est = 'Paraná';
          else if (['31', '32', '33', '34', '35', '37', '38'].includes(ddd)) est = 'Minas Gerais';
          else if (['21', '22', '24'].includes(ddd)) est = 'Rio de Janeiro';
          else if (['51', '53', '54', '55'].includes(ddd)) est = 'Rio Grande do Sul';
          else if (['47', '48', '49'].includes(ddd)) est = 'Santa Catarina';
          
          if (regionMetrics[est]) {
            regionMetrics[est].crmLeads++;
            if (activePhases.includes(l.phase)) {
              regionMetrics[est].crmConversas++;
            }
          }
        }
      }
    });

    const sortedRegions = Object.entries(regionMetrics)
      .sort((a, b) => b[1].clicks - a[1].clicks);

    const regLabels = sortedRegions.map(item => item[0]);
    const regClicks = sortedRegions.map(item => item[1].clicks);
    const regConversas = sortedRegions.map(item => item[1].conversas);

    this.instances.regionsComparison.updateOptions({
      xaxis: { categories: regLabels }
    });
    this.instances.regionsComparison.updateSeries([
      { name: 'Cliques', data: regClicks },
      { name: 'Conversas', data: regConversas }
    ]);

    const tableBody = document.getElementById('regions-table-body');
    if (tableBody) {
      let tbodyHtml = '';
      sortedRegions.forEach(([stateName, metrics]) => {
        const costPerConv = metrics.crmConversas > 0 ? (metrics.spend / metrics.crmConversas) : 0;
        const cps = metrics.seguidores > 0 ? (metrics.spend / metrics.seguidores) : 0;
        
        let rowStyle = '';
        if (stateName === 'São Paulo' && metrics.clicks > 100 && metrics.crmConversas < 5) {
          rowStyle = 'style="background: rgba(239, 68, 68, 0.08); border-left: 2px solid #ef4444;" title="Anomalia detectada: Cliques elevados com baixíssima conversão de chat!"';
        } else if (stateName === 'Paraná' && metrics.crmConversas > 10) {
          rowStyle = 'style="background: rgba(16, 185, 129, 0.08); border-left: 2px solid #10b981;" title="Excelente aproveitamento: Cliques altamente qualificados!"';
        }

        const formattedSpend = 'R$ ' + metrics.spend.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const formattedCpa = metrics.crmConversas > 0 
          ? 'R$ ' + costPerConv.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          : '-';
        const formattedCps = metrics.seguidores > 0 
          ? 'R$ ' + cps.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          : '-';

        tbodyHtml += `
          <tr ${rowStyle}>
            <td style="padding: 8px 10px; font-weight: 600;">${stateName}</td>
            <td style="padding: 8px 10px; text-align: right;">${formattedSpend}</td>
            <td style="padding: 8px 10px; text-align: right;">${metrics.clicks.toLocaleString('pt-BR')}</td>
            <td style="padding: 8px 10px; text-align: right;">${metrics.conversas.toLocaleString('pt-BR')}</td>
            <td style="padding: 8px 10px; text-align: right; font-weight: 600; color: var(--primary);">${metrics.crmConversas.toLocaleString('pt-BR')}</td>
            <td style="padding: 8px 10px; text-align: right; font-weight: 600; color: var(--success);">${metrics.crmLeads.toLocaleString('pt-BR')}</td>
            <td style="padding: 8px 10px; text-align: right;">${formattedCpa}</td>
            <td style="padding: 8px 10px; text-align: right; font-weight: 600; color: var(--success);">${metrics.seguidores.toLocaleString('pt-BR')}</td>
            <td style="padding: 8px 10px; text-align: right;">${formattedCps}</td>
          </tr>
        `;
      });
      tableBody.innerHTML = tbodyHtml;
    }
  }
};
