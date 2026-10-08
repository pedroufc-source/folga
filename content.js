// Conteúdo com fonte: relatos de quem vive a 6×1, vídeos e a posição de Flávio.
// Toda citação foi conferida na fonte (ver REFERENCIAS.md). Trechos curtos, sem editar as palavras.
window.FolgaContent = {
  // Um relato por motivo de game over (códigos de FolgaEngine.verdict).
  relatos: {
    survival: {
      quote: 'Você tem que optar, ou você larga tudo de lado e vai tentar viver a vida ou você cuida.',
      who: 'Darlen, 38, balconista de farmácia no Rio, há 15 anos na 6×1',
      source: 'Agência Brasil',
      url: 'https://agenciabrasil.ebc.com.br/economia/noticia/2026-05/fim-da-escala-6x1-mais-tempo-para-descanso-e-familia-e-prioridade'
    },
    rest: {
      quote: 'Tô tão cansado que troco o dia da minha folga só pra dormir.',
      who: 'Oliver, 30, supervisor de operações, 1h20 de trajeto na zona sul de SP',
      source: 'Agência Mural',
      url: 'https://agenciamural.org.br/o-relato-de-tres-trabalhadores-das-periferias-que-estao-na-escala-6x1/'
    },
    live: {
      quote: 'Quero criar memórias com a minha filha.',
      who: 'Trabalhadora na escala 6×1',
      source: 'vídeo do UOL',
      url: 'https://www.youtube.com/watch?v=o_Gwm51q69U',
      video: true
    },
    all: {
      quote: 'Escala 6x1 impediu que eu fosse gente.',
      who: 'Rick Azevedo, ex-balconista, criador do movimento Vida Além do Trabalho',
      source: 'vídeo da TVT',
      url: 'https://www.youtube.com/shorts/EENOXGUAQsc',
      video: true
    }
  },
  // Vídeos que aparecem em todo game over.
  videos: [
    { label: 'Rick Azevedo, o balconista que puxou o fim da 6×1', source: 'BBC', url: 'https://www.youtube.com/shorts/vIx-NqqALIw' },
    { label: 'Erika Hilton: “Vamos abolir a escala 6x1”', source: 'Brasil de Fato', url: 'https://www.youtube.com/watch?v=XwtZEvXRUMg' }
  ],
  // O que Flávio disse e assinou.
  flavio: {
    text: 'Flávio criticou a PEC do fim da 6×1: disse que ela “vai gerar desemprego em massa”. No lugar, defende pagar por hora trabalhada e assina outra PEC, que cria esse regime.',
    sources: [
      { label: 'InfoMoney, 19/5/2026', url: 'https://www.infomoney.com.br/?p=3338054' },
      { label: 'PEC 12/2026 no Senado', url: 'https://www25.senado.leg.br/web/atividade/materias/-/materia/174362' }
    ]
  }
};
