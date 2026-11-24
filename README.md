# FRANKFLIX — A Plataforma de Streaming da Indústria Cultural

Plataforma **fictícia** de streaming criada para a Conferência do 4º Bimestre de **Filosofia** (2º ano do Ensino Médio). Cada “filme” ou “série” do catálogo é um conceito da Escola de Frankfurt. O site usa a linguagem visual do streaming para criticar a Indústria Cultural — não há nada para assistir.

> **Slogan:** “Você acha que está escolhendo. Mas quem escolhe por você?”

## O que tem no site

| Seção | Conteúdo |
|---|---|
| **Início** | Logotipo, slogan, apresentação e a seção “Sobre a FRANKFLIX” (Escola de Frankfurt + linha do tempo) |
| **Originais FRANKFLIX** | *O Instituto — 1923*, *A Teoria Crítica — O Ataque*, *Dialética do Esclarecimento — 1947* |
| **Mais Assistidos** | Top 4 da Indústria Cultural: Padronização, Pseudo-individualização, Diversão como fuga, Fetiche da mercadoria |
| **Cancele sua assinatura** | Parecer final com as três perguntas obrigatórias |

Recursos: cards com modal de detalhes (fecha com **Esc**, botão ou clique fora), botão **“O que estão escondendo de você?”**, coleções com rolagem horizontal, menu fixo que destaca a seção atual, **Modo Apresentação** e **versão para impressão em A4**.

## Como executar localmente

O site é estático (HTML, CSS, JavaScript e JSON), sem etapa de build e sem dependências. Mas ele **precisa ser aberto por um servidor HTTP**:

```bash
cd frankflix
python3 -m http.server 8000
```

Depois acesse <http://localhost:8000> (site) e <http://localhost:8000/print.html> (impressão).

**Por que não abrir o `index.html` com dois cliques?** Os navegadores bloqueiam `fetch()` e módulos JavaScript (`<script type="module">`) em páginas abertas via `file://`, por segurança. Como o catálogo é lido de `data/catalog.json`, o conteúdo não carregaria. O site detecta essa situação e mostra um aviso.

Alternativas ao Python: a extensão *Live Server* do VS Code ou `npx serve` (se você já tiver Node.js — não é necessário para o projeto).

## Como editar os conteúdos

Todo o texto fica em **`data/catalog.json`**. Os arquivos JavaScript só montam a estrutura visual.

- `meta` — nome, slogan, disciplina, textos do topo da página.
- `student` — valores iniciais de aluno(a), turma, disciplina, professor(a), escola e data (também editáveis na página de impressão).
- `about` — apresentação da plataforma, da Escola de Frankfurt e linha do tempo.
- `originals` — os três Originais (sinopse, explicação, contexto histórico, conceitos, autores, resumo, referências…).
- `mostWatched` — os quatro Mais Assistidos (conceito, exemplo, relação, crítica revelada, pergunta, selo…). Em `studentExample.text` o(a) estudante pode escrever o **exemplo real** escolhido; se ficar vazio, a versão impressa mostra um quadro em branco para colar um print.
- `verdict` — o parecer final.
- `references` — bibliografia; cada produção cita os *ids* daqui. Marque `"verify": true` em referências cuja edição precisa ser conferida.
- `imageCredits` — origem e licença das imagens.

Dicas: mantenha as aspas duplas `"` do JSON e as vírgulas entre os itens; para aspas dentro do texto use “ ”. Se o JSON tiver erro, o site exibe uma mensagem explicando o problema. Um validador rápido: `python3 -m json.tool data/catalog.json`.

## Como substituir as imagens

As capas ficam em `assets/images/covers/` (proporção **2:3**, ex.: 600×900) e o fundo do topo em `assets/images/backgrounds/hero.svg`. Para trocar:

1. Salve a nova imagem (SVG, PNG, JPG ou WebP) dentro de `assets/images/`.
2. Atualize `cover.src` e `cover.alt` (descrição da imagem) no `catalog.json`.
3. Registre a origem e a licença em `imageCredits` e em `docs/referencias.md`.

Use apenas imagens locais, com licença adequada e sem marca-d’água. Por segurança, o site só aceita caminhos que começam com `assets/`. O título de cada capa é desenhado por cima da imagem pelo próprio site.

## Modo Apresentação

Clique em **Modo Apresentação** no topo. O catálogo vira uma sequência de 13 slides com letras grandes (pensado para projetor 1920×1080):

introdução → Escola de Frankfurt → 3 Originais → 4 Mais Assistidos → 3 perguntas do parecer → encerramento.

| Tecla | Ação |
|---|---|
| → ou Page Down | próximo |
| ← ou Page Up | anterior |
| Home / End | primeiro / último |
| F | liga/desliga tela cheia |
| Esc | sai da tela cheia; pressione de novo para sair do modo |

Passadores de slides (clickers) costumam enviar Page Up/Page Down e funcionam. Se o navegador não permitir tela cheia, o modo continua ocupando a janela inteira (use F11). Os slides trazem tópicos para explicação oral — o texto completo fica no site e no material impresso.

## Imprimir ou salvar em PDF

1. Abra **Versão impressa** (`print.html`).
2. Preencha aluno(a), turma, disciplina, professor(a), escola e data (ficam salvos só neste navegador).
3. Opções: incluir capas coloridas e incluir os quadros para o exemplo real.
4. Clique em **Imprimir trabalho**. Para PDF, escolha o destino **Salvar como PDF**, papel **A4**, margens **Padrão**.

O material impresso (cerca de 24 páginas A4) traz capa, sumário, apresentação, os 7 títulos completos, o parecer, a bibliografia e as fontes das imagens. A numeração “Página X de Y” aparece no Chrome e no Edge; o Firefox ainda não aceita numeração via CSS (ative cabeçalho/rodapé na janela de impressão).

## Publicar no GitHub Pages

1. Crie um repositório chamado `frankflix-filosofia` e envie os arquivos:
   ```bash
   git remote add origin https://github.com/USUARIO/frankflix-filosofia.git
   git push -u origin main
   ```
2. No GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch**, branch `main`, pasta `/ (root)`.
3. Aguarde alguns minutos e acesse `https://USUARIO.github.io/frankflix-filosofia/`.

Todos os caminhos são relativos (sem `/` no início), então o site funciona dentro do subdiretório do GitHub Pages sem configuração extra.

## Estrutura

```text
index.html            página principal (SPA simples)
print.html            versão para impressão A4
css/style.css         variáveis, layout, cabeçalho, hero e seções
css/components.css    botões, capas, cards, modal, parecer e modo apresentação
css/print.css         estilos da versão impressa (A4)
js/app.js             inicialização do site
js/catalog.js         carregamento do JSON e renderização dos componentes
js/modal.js           modal acessível (elemento <dialog>)
js/navigation.js      menu, destaque da seção atual e coleções horizontais
js/presentation.js    modo apresentação
js/print.js           montagem da versão impressa
js/dom.js             utilitários de DOM (texto sempre inserido como texto, não HTML)
data/catalog.json     todo o conteúdo
assets/               logotipo, favicon, capas e fundo (SVG originais)
docs/                 roteiro de apresentação, referências e proposta da conferência
```

## Acessibilidade e compatibilidade

HTML semântico, link “pular para o conteúdo”, foco visível, modais com `<dialog>` (foco preso no modal e devolvido ao card ao fechar), textos alternativos nas capas, contraste alto, navegação por teclado, respeito a `prefers-reduced-motion` e layout responsivo. Requer navegador atual (Chrome, Edge, Firefox ou Safari dos últimos anos).

## Aviso

Projeto escolar sem fins comerciais. A FRANKFLIX é fictícia e não tem relação com serviços reais de streaming. Classificações, rankings e selos são satíricos. Os exemplos contemporâneos são **situações ilustrativas**; o parecer final foi revisado pelo(a) estudante, que é responsável pelas posições apresentadas.

Licença: MIT (ver `LICENSE`).
