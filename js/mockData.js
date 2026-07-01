// Dados de simulação realistas para o Dashboard de Leads
const MockData = {
  // Lista de clientes simulados
  clientes: ["AgroForte Sementes", "NutriCampo Fertilizantes", "Tratores Connect"],

  // Função para gerar leads fictícios baseados em data atual
  generateLeads: function(cliente, dias = 30) {
    const leads = [];
    const agora = new Date();
    
    // Configurações específicas por cliente para dar personalidade aos dados
    const config = {
      "AgroForte Sementes": {
        plataformas: ["Meta Ads", "Google Ads", "Instagram Organic"],
        dispositivos: ["Mobile", "Mobile", "Desktop"], // mais mobile
        campanhas: ["Lançamento Soja 2026", "Institucional AgroForte", "Oferta Sementes Milho"],
        conjuntos: ["Interesses Produtores", "Lookalike Clientes", "Palavras-Chave Soja"],
        criativos: ["Video_Depoimento_Produtor", "Banner_Saco_Semente", "Carrossel_Beneficios_Milho"],
        copies: ["Copy_Prova_Social", "Copy_Desconto_PreVenda", "Copy_Especificacoes_Tecnicas"],
        pesoPlataforma: [0.6, 0.3, 0.1]
      },
      "NutriCampo Fertilizantes": {
        plataformas: ["Google Ads", "Meta Ads", "LinkedIn Ads", "YouTube Ads"],
        dispositivos: ["Desktop", "Mobile", "Mobile"], // equilibrado
        campanhas: ["Nutrição de Solo Inverno", "Fertilizantes Foliares NPK", "Geração de Leads B2B"],
        conjuntos: ["Decisores Agro", "Palavras Fertilizantes NPK", "Público Engenheiros Agrônomos"],
        criativos: ["Infografico_Nutrientes_Solo", "Video_Resultados_Lavoura", "Banner_Frete_Gratis"],
        copies: ["Copy_Cientifica_Resultados", "Copy_Urgencia_Estoque", "Copy_Institucional_B2B"],
        pesoPlataforma: [0.5, 0.3, 0.15, 0.05]
      },
      "Tratores Connect": {
        plataformas: ["Meta Ads", "Google Ads", "WhatsApp Direct"],
        dispositivos: ["Mobile", "Mobile", "Mobile", "Desktop"], // muito mobile
        campanhas: ["Feirão Tratores Connect", "Consórcio Agrícola 2026", "Peças e Serviços"],
        conjuntos: ["Público Feiras Agrícolas", "Palavras Compra Trator", "Lista WhatsApp Importada"],
        criativos: ["Video_Demonstracao_Trator_XP", "Foto_Feirao_Descontos", "Carrossel_Modelos_Tratores"],
        copies: ["Copy_Parcelamento_Facilitado", "Copy_Entrega_Imediata", "Copy_Upgrade_Tecnologico"],
        pesoPlataforma: [0.45, 0.45, 0.1]
      }
    };

    const c = config[cliente] || config["AgroForte Sementes"];

    // Gerar um número aleatório de leads por dia nos últimos X dias
    for (let i = dias; i >= 0; i--) {
      const dataAlvo = new Date(agora);
      dataAlvo.setDate(agora.getDate() - i);
      
      // Quantidade de leads varia dependendo do dia (sábados e domingos tendem a ter menos)
      const diaSemana = dataAlvo.getDay();
      let baseLeads = Math.floor(Math.random() * 10) + 5; // 5 a 15 leads padrão
      if (diaSemana === 0 || diaSemana === 6) {
        baseLeads = Math.floor(Math.random() * 5) + 1; // 1 a 6 leads nos finais de semana
      }

      for (let j = 0; j < baseLeads; j++) {
        // Horário aleatório do lead
        const horaLead = new Date(dataAlvo);
        horaLead.setHours(
          Math.floor(Math.random() * 24),
          Math.floor(Math.random() * 60),
          Math.floor(Math.random() * 60)
        );

        // Selecionar plataforma baseado nos pesos simulados
        const platform = this.getRandomItemWithWeight(c.plataformas, c.pesoPlataforma);
        const device = c.dispositivos[Math.floor(Math.random() * c.dispositivos.length)];
        
        const campaign = c.campanhas[Math.floor(Math.random() * c.campanhas.length)];
        const adset = c.conjuntos[Math.floor(Math.random() * c.conjuntos.length)];
        const creative = c.criativos[Math.floor(Math.random() * c.criativos.length)];
        const copy = c.copies[Math.floor(Math.random() * c.copies.length)];

        const nome = this.getRandomName();
        const telefone = this.getRandomPhone();

        leads.push({
          date: horaLead.toISOString().replace('T', ' ').substring(0, 19),
          name: nome,
          phone: telefone,
          device: device,
          platform: platform,
          campaign: campaign,
          adset: adset,
          creative: creative,
          copy: copy
        });
      }
    }

    // Ordenar leads por data decrescente (mais recentes primeiro)
    return leads.sort((a, b) => new Date(b.date) - new Date(a.date));
  },

  // Selecionar item com peso
  getRandomItemWithWeight: function(items, weights) {
    const r = Math.random();
    let sum = 0;
    for (let i = 0; i < items.length; i++) {
      sum += weights[i] || 0;
      if (r <= sum) return items[i];
    }
    return items[items.length - 1];
  },

  // Nomes simulados em português
  getRandomName: function() {
    const nomes = ["José", "Maria", "João", "Ana", "Antônio", "Francisco", "Carlos", "Paulo", "Lucas", "Mateus", "Gabriel", "Luiz", "Marcos", "Rafael", "Pedro", "Juliana", "Aline", "Fernanda", "Patrícia", "Camila", "Letícia", "Bruno", "Eduardo", "Rodrigo", "Felipe", "Gustavo", "Daniel", "Thiago", "Ricardo", "André"];
    const sobrenomes = ["Silva", "Santos", "Oliveira", "Souza", "Rodrigues", "Ferreira", "Alves", "Pereira", "Lima", "Gomes", "Costa", "Ribeiro", "Martins", "Carvalho", "Teixeira", "Moreira", "Barbosa", "Pinto", "Cardoso", "Rocha"];
    
    return nomes[Math.floor(Math.random() * nomes.length)] + " " + sobrenomes[Math.floor(Math.random() * sobrenomes.length)];
  },

  // Telefones simulados padrão Brasil
  getRandomPhone: function() {
    const ddds = ["11", "19", "16", "21", "31", "41", "51", "61", "62", "65", "81", "85"];
    const ddd = ddds[Math.floor(Math.random() * ddds.length)];
    const num1 = Math.floor(Math.random() * 1000) + 9000; // 9xxx
    const num2 = Math.floor(Math.random() * 9000) + 1000; // xxxx
    return `(${ddd}) 9${num1}-${num2}`;
  }
};
