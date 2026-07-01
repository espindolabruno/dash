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
  }
};
