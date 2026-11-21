/* Site do treinador — Ajuda: Central de ajuda (busca por funcionalidade, passo a passo e atalho para a tela),
   apresentação guiada e Aulas (conteúdo próprio do TeamGarcia, com progresso). */
(function () {
  "use strict";
  var P = window.Proto, T = window.T, esc = P.esc;

  /* [categoria, título, descrição, página, passos] */
  var FUNC = [
    ["Alunos", "Gerenciar alunos", "Cadastrar, editar, filtrar e organizar os alunos (lista ou Kanban por etiqueta).", "alunos", ["Abra Alunos > Alunos.", "Toque em + Novo aluno, preencha nome, e-mail e senha inicial e envie os dados para o aluno.", "Use os indicadores e os Filtros avançados para achar quem precisa de atenção.", "Troque para Kanban para ver os alunos por etiqueta e mover entre colunas."]],
    ["Alunos", "Detalhes do aluno", "Ver tudo de um aluno: dados, fichas, atualizações, fotos, treinos, dieta e progresso.", "alunos", ["Em Alunos, toque no nome do aluno.", "Use as abas Visão geral, Atualizações, Fotos, Treinos, Dieta, Progresso, Questionários e Anexos.", "Em Editar você muda dados, metas e status; os planos Treino e Dieta ligam e desligam o que aparece no app."]],
    ["Alunos", "Atualizações programadas (check-in)", "Agendar quando o aluno deve responder questionários e mandar fotos, com repetição automática.", "alunos", ["Abra o aluno > Atualizações > Programados.", "Toque em + Nova atualização, escolha a data, os questionários e se pede fotos.", "Em Repetir, escolha Toda semana para o sistema criar a próxima sozinho.", "As respostas chegam em Respostas e no sino do topo."]],
    ["Alunos", "Responder um check-in", "Ler as respostas e as fotos e mandar o seu retorno para o app do aluno.", "alunos", ["Toque no sino do topo para ver quem está esperando.", "Abra o aluno > Atualizações > Respostas.", "Leia, escreva o retorno e toque em Enviar resposta."]],
    ["Alunos", "Fotos e comparação", "Ver as fotos por atualização, adicionar fotos e comparar antes e depois.", "alunos", ["Abra o aluno > Fotos.", "Use + Adicionar fotos para subir fotos você mesmo.", "Toque em Comparar fotos, escolha duas e salve a comparação."]],
    ["Alunos", "Questionários dinâmicos", "Criar e editar as perguntas do check-in semanal, mensal e de outros questionários.", "questionario", ["Abra Alunos > Questionários dinâmicos.", "Escolha o questionário na aba ou crie um novo.", "Adicione perguntas (escala, múltipla escolha, número, texto ou aviso) e imagens."]],
    ["Alunos", "Notificações", "Mandar avisos que aparecem no sino do app do aluno, agora ou agendados.", "notificacoes", ["Abra Alunos > Notificações e toque em + Nova notificação.", "Escreva título e descrição, escolha os destinatários (todos, etiqueta ou alunos).", "Escolha enviar agora, uma vez agendada ou de forma recorrente."]],
    ["Treino", "Montar a ficha de treino", "Criar treinos A/B/C com séries, repetições, intervalos, RIR, técnicas e substitutos.", "alunos", ["Abra o aluno > Ficha de treino.", "Adicione treinos e exercícios; preencha séries de aquecimento, preparatórias e válidas.", "Toque em Salvar e enviar ao aluno: o app mostra o que mudou."]],
    ["Treino", "Edição em massa", "Mudar séries, repetições ou intervalo de vários exercícios de uma vez.", "alunos", ["Na Ficha de treino, toque em Edição em massa.", "Marque os exercícios e escolha o que aplicar.", "Toque em Aplicar e depois salve a ficha."]],
    ["Treino", "Treinos pré-definidos", "Modelos de treino para reaproveitar em vários alunos, organizados em pastas.", "modelosT", ["Abra Treino > Treinos pré-definidos.", "Crie um modelo ou salve uma ficha como pré-definido.", "Na ficha do aluno use Importar treino pré-definido."]],
    ["Treino", "Exercícios, técnicas e grupamentos", "A biblioteca de exercícios (com vídeo), técnicas e grupos musculares.", "exercicios", ["Abra Treino > Exercícios para cadastrar exercícios e colar o link do vídeo.", "Em Técnicas de exercício crie drop set, rest-pause etc.", "Em Grupamentos musculares ajuste os grupos usados no volume."]],
    ["Treino", "Substituição de exercício", "Grupos reutilizáveis de exercícios que o aluno pode trocar entre si.", "substEx", ["Abra Treino > Substituição de exercício e crie uma tabela.", "Marque os exercícios equivalentes.", "Na ficha, use Aplicar tabela de substituição em cada exercício."]],
    ["Dieta", "Montar a ficha de dieta", "Refeições com horário, opções, substituições, variações por dia e metas.", "alunos", ["Abra o aluno > Ficha de dieta.", "Crie as refeições, os alimentos e as quantidades; use Opção 2 para cardápios alternativos.", "Confira a análise de nutrientes e metas e salve."]],
    ["Dieta", "Dietas e refeições pré-definidas", "Modelos de dieta e de refeição para reaproveitar.", "modelosD", ["Abra Dieta > Dietas pré-definidas ou Refeições pré-definidas.", "Salve uma dieta ou uma refeição como modelo.", "Na ficha do aluno use Importar."]],
    ["Dieta", "Alimentos e substituições", "A tabela de alimentos (por 100 g) com medidas caseiras e as tabelas de substituição.", "alimentos", ["Abra Dieta > Alimentos para cadastrar ou corrigir alimentos.", "Em Substituição de alimentos crie grupos de trocas.", "Na ficha, aplique a tabela em cada alimento."]],
    ["Comunidade", "Feed da comunidade", "Uma rede social só dos seus alunos: posts, curtidas e comentários.", "feed", ["Abra Comunidade > Feed da comunidade e ative.", "Poste avisos, dicas e conquistas; fixe os mais importantes.", "Os alunos veem a aba Comunidade no app."]],
    ["Comunidade", "Competições e ranking", "Pontos por treino, dieta, cardio, check-in e participação, com ranking mensal e competições.", "competicoes", ["Abra Comunidade > Competições e ative a gamificação.", "Ajuste quanto vale cada ação e o limite por dia.", "Crie competições com período e prêmio; o ranking aparece no app."]],
    ["Conteúdo", "Materiais extras", "Guias, aulas e conteúdos para os alunos, organizados em módulos.", "materiais", ["Abra Conteúdo > Materiais extras.", "Crie o material e, se quiser, coloque num módulo.", "Acompanhe quantos alunos abriram."]],
    ["Equipe", "Funcionários e permissões", "Dar acesso ao site para outras pessoas, cada uma só com o que pode ver.", "permissoes", ["Abra Equipe > Permissões de funcionário e crie um grupo.", "Marque o que o grupo pode acessar.", "Em Funcionários, cadastre a pessoa e escolha o grupo.", "Em Logs de auditoria veja quem alterou o quê."]],
    ["Configurações", "Configurações do app", "Regras do treino, da dieta, do acompanhamento e da recuperação de alunos.", "config", ["Abra Configurações.", "Use as abas Treino, Dieta, Acompanhamento e Notificações.", "As mudanças valem na hora para todos os alunos."]],
    ["Conta", "Conta e suporte", "Seu nome no topo, troca de senha e o contato de suporte que os alunos veem.", "conta", ["Toque na sua foto no topo > Conta.", "Cadastre o WhatsApp de suporte: aparece no app como Falar com meu treinador.", "Em Ajuda > Suporte registre problemas e ideias."]]
  ];

  T.pages.ajuda = function () {
    var q = (T._ajQ || "").toLowerCase(), cat = T._ajCat || "", cats = [];
    FUNC.forEach(function (f) { if (cats.indexOf(f[0]) < 0) cats.push(f[0]); });
    var list = FUNC.filter(function (f) { return (!cat || f[0] === cat) && (!q || (f[1] + " " + f[2] + " " + f[4].join(" ")).toLowerCase().indexOf(q) >= 0); });
    return '<div style="text-align:center;max-width:640px;margin:0 auto"><div class="page-title" style="justify-content:center">Central de ajuda</div><div class="muted">Encontre rapidamente como usar cada funcionalidade. Use a busca ou navegue pelas categorias.</div><button class="btn sm" style="margin-top:10px" data-act="tourStart">↻ Rever apresentação</button>' +
      '<div class="row" style="margin-top:14px"><input class="grow" placeholder="Buscar funcionalidade… (ex.: cadastrar aluno, criar treino)" value="' + esc(T._ajQ || "") + '" data-input="ajQ"></div>' +
      '<div class="row wrap" style="justify-content:center;margin-top:10px;gap:6px"><button class="chip' + (!cat ? " on" : "") + '" data-act="ajCat" data-c="">Todas</button>' + cats.map(function (c) { return '<button class="chip' + (cat === c ? " on" : "") + '" data-act="ajCat" data-c="' + esc(c) + '">' + esc(c) + "</button>"; }).join("") + "</div></div>" +
      '<div class="small muted" style="text-align:center;margin:12px 0">' + list.length + " funcionalidade(s) encontrada(s)</div>" +
      '<div class="grid2">' + list.map(function (f) {
        var i = FUNC.indexOf(f), open = T._ajOpen === i;
        return '<div class="card stack"><div class="row between"><b style="font-size:16px">' + esc(f[1]) + '</b><span class="pill">' + esc(f[0]) + '</span></div><div class="small muted">' + esc(f[2]) + "</div>" +
          '<div class="row wrap"><button class="btn sm primary" data-act="ajSteps" data-i="' + i + '">' + (open ? "Esconder passo a passo" : "Ver passo a passo") + '</button><button class="btn sm" data-act="ajGo" data-v="' + f[3] + '">→ Acessar tela</button></div>' +
          (open ? '<ol class="small" style="margin:4px 0 0;padding-left:20px;line-height:1.6">' + f[4].map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ol>" : "") + "</div>";
      }).join("") + "</div>" + (list.length ? "" : '<div class="empty">Nada encontrado. Tente outra palavra.</div>');
  };
  T.actions.ajQ = function (el) { T._ajQ = el.value; var pos = el.selectionStart; T.render(); var i = document.querySelector("[data-input=ajQ]"); if (i) { i.focus(); i.setSelectionRange(pos, pos); } };
  T.actions.ajCat = function (el) { T._ajCat = el.dataset.c; T.render(); };
  T.actions.ajSteps = function (el) { T._ajOpen = T._ajOpen === +el.dataset.i ? null : +el.dataset.i; T.render(); };
  T.actions.ajGo = function (el) { if (T.allowed && !T.allowed(el.dataset.v)) { T.toast("Você não tem permissão para esta área."); return; } T.go(el.dataset.v); };

  /* ---------- Apresentação guiada ---------- */
  var TOUR = [
    ["Bem-vindo ao TeamGarcia", "Este é o seu painel de treinador. Aqui você acompanha os alunos, monta treinos e dietas e responde os check-ins. O aluno vê tudo no app dele."],
    ["Menu lateral", "No computador, passe o mouse nos ícones da esquerda para ver os submenus. No celular, toque no botão de menu no canto de cima."],
    ["Painel", "Os números do Início mostram atualizações do dia, vencimentos, aniversários e fichas vencendo. Toque num número para ver os alunos. O calendário mostra os eventos do mês."],
    ["Alunos", "Na ficha de cada aluno ficam as abas de acompanhamento e os editores de treino e dieta. Salvar a ficha envia na hora para o app."],
    ["Sino e suporte", "O sino do topo mostra quem está esperando a sua resposta. Em Ajuda você encontra este guia, as Aulas e o Suporte."]
  ];
  T.actions.tourStart = function () { T._tour = 0; showTour(); };
  function showTour() {
    var i = T._tour, s = TOUR[i];
    T.sheet(s[0], '<div class="stack"><div>' + esc(s[1]) + '</div><div class="progress"><i style="width:' + ((i + 1) / TOUR.length * 100) + '%"></i></div><div class="row"><span class="small muted grow">' + (i + 1) + " de " + TOUR.length + "</span>" + (i ? '<button class="btn sm" data-act="tourPrev">‹ Anterior</button>' : "") + (i < TOUR.length - 1 ? '<button class="btn sm primary" data-act="tourNext">Próximo ›</button>' : '<button class="btn sm primary" data-act="closeSheet">Concluir</button>') + "</div></div>");
  }
  T.actions.tourNext = function () { T._tour++; showTour(); };
  T.actions.tourPrev = function () { T._tour--; showTour(); };

  /* ---------- Aulas (conteúdo próprio, em texto) ---------- */
  var AULAS = [
    { id: "a1", ico: "🚀", title: "Primeiros passos", parts: [
      ["Organize a conta", "Em Conta, coloque seu nome, sua função e o WhatsApp de suporte. Em Configurações, revise as regras de treino, dieta e acompanhamento antes de cadastrar alunos."],
      ["Monte as bibliotecas", "Cadastre seus exercícios (com link de vídeo, se tiver), técnicas e alimentos. Quanto mais completa a biblioteca, mais rápido você monta as fichas."],
      ["Crie seus modelos", "Monte 2 ou 3 treinos e dietas pré-definidos que você mais usa. Na hora de atender um aluno novo, você importa o modelo e só ajusta."]] },
    { id: "a2", ico: "🏋️", title: "Montando treino e dieta", parts: [
      ["Ficha de treino", "Separe aquecimento, preparatórias e válidas. Defina repetições e intervalos por série, RIR e técnica só nas séries certas. Use superset quando dois exercícios forem feitos em sequência."],
      ["Ficha de dieta", "Crie as refeições com horário e use Opção 2 para dar alternativas. Coloque substituições com as mesmas calorias e confira as metas de calorias e proteína no fim da ficha."],
      ["Comunique a mudança", "Ao salvar, o aluno recebe o aviso do que mudou. Use as observações gerais para explicar o motivo do ajuste."]] },
    { id: "a3", ico: "📋", title: "Acompanhamento semanal", parts: [
      ["Agende as atualizações", "Programe o check-in semanal com repetição automática e o mensal com medidas e fotos. O aluno vê a contagem regressiva na tela inicial do app."],
      ["Responda rápido", "O sino mostra quem respondeu. Leia as respostas, olhe as fotos e o progresso e escreva um retorno curto e claro."],
      ["Recupere quem sumiu", "No Painel, a lista de Recuperação de alunos mostra quem está há dias sem treinar ou sem abrir o app. Chame pelo WhatsApp com um clique."]] },
    { id: "a4", ico: "📱", title: "Usando o app a seu favor", parts: [
      ["Comunidade e competições", "Ative a comunidade para criar um ambiente de grupo e as competições para motivar com pontos e ranking."],
      ["Materiais extras", "Publique guias e aulas para os alunos e veja quantos abriram."],
      ["Equipe", "Se tiver ajuda, cadastre funcionários com permissões limitadas e acompanhe tudo pelos logs de auditoria."]] }
  ];
  function doneKey() { return "teamgarcia.aulas." + (P.myUid || ""); }
  function done() { try { return JSON.parse(localStorage.getItem(doneKey()) || "[]"); } catch (e) { return []; } }
  function setDone(l) { try { localStorage.setItem(doneKey(), JSON.stringify(l)); } catch (e) {} }
  T.pages.aulas = function () {
    var d = done(), n = AULAS.filter(function (a) { return d.indexOf(a.id) >= 0; }).length;
    return '<div class="page-title">Aulas</div><div class="muted" style="margin-bottom:14px">Aulas curtas para tirar o máximo do TeamGarcia.</div>' +
      '<div class="card stack"><div class="row between"><span class="small muted">Seu progresso</span><span class="small">' + n + " de " + AULAS.length + ' aulas</span></div><div class="progress"><i style="width:' + (n / AULAS.length * 100) + '%;background:' + (n === AULAS.length ? "var(--valid)" : "var(--accent)") + '"></i></div></div>' +
      '<div class="aulas" style="margin-top:14px">' + AULAS.map(function (a) {
        var ok = d.indexOf(a.id) >= 0;
        return '<button class="aula' + (ok ? " ok" : "") + '" data-act="aulaOpen" data-id="' + a.id + '"><span class="aula-ico">' + a.ico + '</span><b>' + esc(a.title) + '</b><span class="pill' + (ok ? " accent" : "") + '">' + (ok ? "✓ Concluída" : a.parts.length + " partes") + "</span></button>";
      }).join("") + "</div>";
  };
  T.actions.aulaOpen = function (el) {
    var a = AULAS.filter(function (x) { return x.id === el.dataset.id; })[0], ok = done().indexOf(a.id) >= 0;
    T.sheet(a.ico + " " + a.title, '<div class="stack">' + a.parts.map(function (p, i) { return '<div><b>' + (i + 1) + ". " + esc(p[0]) + '</b><div class="muted" style="margin-top:4px">' + esc(p[1]) + "</div></div>"; }).join("") +
      '<button class="btn ' + (ok ? "" : "primary ") + 'block" data-act="aulaDone" data-id="' + a.id + '">' + (ok ? "Marcar como não concluída" : "✓ Marcar como concluída") + "</button></div>", true);
  };
  T.actions.aulaDone = function (el) { var l = done(), i = l.indexOf(el.dataset.id); if (i >= 0) l.splice(i, 1); else l.push(el.dataset.id); setDone(l); T.closeSheet(); T.render(); };
})();
