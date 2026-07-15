# Handoff Report

## 1. Observation
We analyzed the backend and frontend source code in the workspace and found the following:
* **Google Sheets Columns Mapping**: In `server.js` (lines 153-167), standard columns are mapped using aliases:
  ```javascript
  const COLUMN_MAPPINGS = {
    date: ['data', 'horário', 'data e horário', 'data/hora', 'timestamp', 'data/horário', 'data_hora', 'created_at', 'date'],
    name: ['nome_lead', 'nome', 'nome completo', 'leads', 'lead', 'client', 'cliente', 'name', 'full_name'],
    phone: ['telefone_lead', 'telefone', 'celular', 'whatsapp', 'whats', 'fone', 'phone', 'telephone', 'contato'],
    device: ['dispositivo_conversao', 'dispositivo', 'dispositivo de conversão', 'device', 'mobile/desktop', 'aparelho'],
    platform: ['plataforma_conversao', 'plataforma', 'plataforma de conversão', 'platform', 'canal', 'rede', 'origem', 'midia', 'utm_source'],
    campaign: ['campanha', 'campaign', 'utm_campaign', 'nome da campanha'],
    adset: ['conjunto', 'conjunto de anúncios', 'adset', 'ad set', 'utm_medium', 'grupo de anúncios'],
    creative: ['anuncio', 'criativo', 'creative', 'utm_content', 'anúncio', 'ad'],
    copy: ['criativo_copy', 'copy', 'texto', 'utm_term', 'redação', 'copywriting'],
    anuncio_preview: ['anuncio_preview', 'preview', 'link_preview', 'preview_anuncio', 'link do anuncio', 'preview do anúncio'],
    phase: ['fase', 'status'],
    estimated_value: ['valor estimado', 'valor'],
    observations: ['observações', 'observacoes', 'observação', 'observacao', 'obs']
  };
  ```
* **CRM & Meta Integration matching**: In `js/app.js` (lines 982-1006), ads are matched with CRM leads via name comparison:
  ```javascript
  // 1. Agrupar os criativos do Meta Ads
  creatives.forEach(ad => {
    // Limpa nome removendo a tag [VX] para consolidar a performance se houver duplicatas de nome
    const cleanName = ad.ad_name.replace(/\s*\[V\d+\]$/i, '').trim();
    ...
  ```
* **Styled Spreadsheet and Thumbnails Reference**: In `example.txt` (lines 472-480), ad thumbnails are displayed as:
  ```javascript
  <div key={i} style={{ background: COLORS.surfaceHi, borderRadius: 10, border: `1px solid ${COLORS.border}`, overflow: 'hidden' }}>
    <div style={{ height: 90, background: COLORS.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
      <img src={c.thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }}
        onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
      <div style={{ display: 'none', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 4, color: COLORS.textFaint }}>
        <ImageOff size={20} />
        <span style={{ fontSize: 10 }}>prévia indisponível</span>
      </div>
    </div>
  ```

## 2. Logic Chain
1. Based on the **Google Sheets Columns Mapping** observation, the dashboard maps CRM data using loose naming conventions. Because matching relies on string names (as observed in **CRM & Meta Integration matching**), it is prone to fragmentation if name conventions change in either the CRM or Meta platforms.
2. Implementing the **Campaign & Video Analysis views** requires extra action metrics (`video_play_actions`, retention stats) that are currently missing in the backend Graph API payload in `server.js` (line 713). Therefore, we need to request those parameters from the Meta API and compute the Hook Rate and Hold Rate in the frontend.
3. Implementing the **Ad Thumbnails** requires retrieving the `thumbnail_url` from the `/adcreatives` endpoint of the Meta Graph API. The React implementation observed in `example.txt` outlines the frontend structure, rendering the image with a fallback handler (`onError`) when a Facebook CDN token expires.
4. Implementing **Event Analysis** requires calling the Meta Pixel `/stats` API to aggregate conversion event data, which can then be compared with the CRM leads list from Google Sheets.

## 3. Caveats
* We did not investigate how the existing `access_tokens` are managed for refresh cycles in Meta. We assumed that the tokens are either persistent long-lived tokens (~60 days) or updated manually.
* We assumed that the Meta Pixel ID is available or can be retrieved through the existing client mappings.

## 4. Conclusion
We conclude that:
* The codebase has a solid foundation for integrations with file-based mappings databases (`mappings.json`).
* Implementation of R2 and R3 is highly feasible by adding specific video engagement fields to the Meta Marketing insights request in `server.js`, implementing drag-and-drop event listeners in `js/app.js`, calculating period-over-period date offsets, and developing the new endpoints (`/api/pixel-events`).

## 5. Verification Method
* **Files to inspect**:
  * Check the updated API endpoints in `server.js` to verify video action fields are requested.
  * Check `js/app.js` to ensure date offsets for PoP comparisons are calculated correctly.
  * Verify the CSS grid layout for the styled spreadsheet with thumbnails is responsive and matches `example.txt`.
