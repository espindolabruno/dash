# Connect Agro - Lead Analytics Dashboard

Um dashboard moderno, de alta performance e visualmente rico, projetado para agências de tráfego pago consolidarem e analisarem leads armazenados em planilhas do Google Drive de múltiplos clientes.

## 🚀 Recursos
- **Login OAuth2 Integrado:** Autenticação direta com o Google que também concede acesso de leitura às planilhas.
- **Modo de Demonstração (Demo):** Permite visualizar o painel imediatamente com dados simulados realistas sem precisar de chaves de API.
- **Gráficos Avançados (ApexCharts):**
  - Evolução diária de leads filtrados por canal de anúncios.
  - Participação de canais de anúncios.
  - Segmentação por tipo de dispositivo de conversão (Mobile vs Desktop).
  - Top 5 campanhas mais eficientes.
  - Desempenho de criativos, copies e conjuntos de anúncios baseados em UTMs.
  - Heatmap (Mapa de calor) de conversões por dia da semana e faixa horária.
- **Tabela e Exportação:** Pesquise na base de leads e exporte relatórios filtrados em formato `.csv` compatível com Excel.
- **Responsividade e Estilo:** Interface em Dark Mode premium com efeitos Glassmorphism, animações sutis e layouts responsivos para celulares e tablets.

---

## 🛠️ Configuração para Produção (Modo Real)

Para conectar o Dashboard à sua conta do Google Drive real e usá-lo na VPS, siga os passos abaixo:

### Passo 1: Criar credenciais no Google Cloud Console

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/).
2. Crie um novo projeto (ex: `Connect Agro Dashboard`).
3. Vá em **APIs e Serviços** > **Biblioteca** e ative as seguintes APIs:
   - **Google Drive API**
   - **Google Sheets API**
4. Vá em **Tela de consentimento OAuth**:
   - Escolha o tipo de usuário (Externo ou Interno).
   - Preencha os dados do aplicativo (nome, e-mail de suporte).
   - Em **Escopos**, adicione os seguintes escopos de leitura:
     - `.../auth/drive.readonly`
     - `.../auth/spreadsheets.readonly`
     - `.../auth/userinfo.email`
     - `.../auth/userinfo.profile`
   - Em **Usuários de teste**, adicione o seu e-mail do Google que tem acesso à pasta de Clientes do Drive (caso o app esteja em modo "Em teste").
5. Vá em **Credenciais** > **Criar Credenciais** > **ID do cliente OAuth**:
   - Tipo de aplicativo: **Aplicativo da Web**.
   - Nome: `Connect Agro Dashboard`.
   - Em **Origens JavaScript autorizadas**, insira as URLs onde o dashboard será executado:
     - Localmente para desenvolvimento: `http://localhost:5500` ou `http://127.0.0.1:5500`.
     - Produção na sua VPS: `https://dash.connectagro.com.br`.
6. Clique em Criar e copie o **ID do cliente (Client ID)** gerado.

### Passo 2: Configurar o Código do Dashboard

Abra o arquivo [js/auth.js](file:///c:/Users/Bruno%20Esp%C3%ADndola/OneDrive/Documentos/Dash/js/auth.js) no seu editor de código:

1. Insira seu Client ID na linha 5:
   ```javascript
   CLIENT_ID: 'SEU_CLIENT_ID_AQUI.apps.googleusercontent.com',
   ```
2. Defina os e-mails autorizados a fazer login no painel na linha 8 para segurança de acesso (já que o site ficará exposto na VPS):
   ```javascript
   ALLOWED_EMAILS: ['seu-email@gmail.com', 'bruno@connectagro.com.br'],
   ```
   *(Se deixar o array vazio `[]`, qualquer conta Google que autenticar com sucesso e tiver permissão no seu Drive poderá ver os dados).*

---

## 📁 Estrutura de Pastas Esperada no Google Drive

Para que o dashboard encontre as planilhas automaticamente, os seus arquivos no Drive devem seguir esta estrutura organizacional exata:

```
Meu Drive/
└── Clientes/                      <-- Nome da pasta raiz configurada no modal
    ├── AgroForte Sementes/        <-- Pasta do Cliente (Nome exibido no painel)
    │   └── Tráfego Pago/          <-- Pasta interna obrigatória
    │       └── Leads 2026.xlsx    <-- Planilha (Google Sheets) com os dados
    └── Outro Cliente/
        └── Tráfego Pago/
            └── Planilha de Leads
```

### Cabeçalhos suportados na Planilha (Leitura Inteligente)
O dashboard lê as colunas da planilha e mapeia automaticamente os dados, suportando os seguintes nomes de cabeçalhos (sem diferenciar maiúsculas/minúsculas ou acentos):

- **Data/Hora:** `Data`, `Horário`, `Data e Horário`, `Timestamp`, `Date`, `Created At`
- **Nome:** `Nome`, `Nome Completo`, `Leads`, `Lead`, `Cliente`, `Name`, `Full Name`
- **Telefone:** `Telefone`, `Celular`, `Whatsapp`, `Whats`, `Fone`, `Phone`
- **Dispositivo:** `Dispositivo`, `Dispositivo de conversão`, `Device`, `Aparelho`
- **Plataforma:** `Plataforma`, `Canal`, `Rede`, `Origem`, `Mídia`, `Platform`
- **Campanha:** `Campanha`, `Campaign`, `utm_campaign`, `Nome da Campanha`
- **Conjunto:** `Conjunto`, `Conjunto de Anúncios`, `Adset`, `utm_medium`
- **Criativo:** `Criativo`, `Creative`, `utm_content`, `Anúncio`
- **Copy:** `Copy`, `Texto`, `utm_term`, `Redação`

---

## 🛜 Deploy na VPS (Nginx)

Como o dashboard é 100% estático (HTML/CSS/JS) e a autenticação ocorre diretamente entre o navegador do usuário e as APIs do Google, você só precisa de um servidor web simples como o Nginx para servi-lo na sua VPS:

1. Transfira os arquivos do projeto para o diretório `/var/www/dash-connectagro/` na sua VPS.
2. Crie um arquivo de configuração no Nginx (ex: `/etc/nginx/sites-available/dash.connectagro.com.br`):

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name dash.connectagro.com.br;
    
    # Redirecionamento automático HTTP para HTTPS (Recomendado pelo Google OAuth2)
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name dash.connectagro.com.br;

    root /var/www/dash-connectagro;
    index index.html;

    # SSL Config (Configure usando o Certbot / Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/dash.connectagro.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/dash.connectagro.com.br/privkey.pem;

    location / {
        try_files $uri $uri/ =404;
    }

    # Cache de arquivos estáticos
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }
}
```
3. Habilite o site e reinicie o Nginx:
   ```bash
   ln -s /etc/nginx/sites-available/dash.connectagro.com.br /etc/nginx/sites-enabled/
   nginx -t
   systemctl restart nginx
   ```
