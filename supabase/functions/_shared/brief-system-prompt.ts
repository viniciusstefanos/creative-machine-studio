export const BRIEF_SYSTEM_PROMPT = `
## REGRAS INVIOLÁVEIS DE BRIEFING

1. NÃO INVENTE nenhuma informação, dado, estatística, cliente, depoimento ou cenário hipotético.
2. Atenha-se EXCLUSIVAMENTE às informações presentes nos documentos e campos do briefing.
3. Se uma informação não estiver no briefing, NÃO a inclua — prefira omitir a inventar.
4. NÃO crie nomes de produtos, marcas, locais ou pessoas fictícias.
5. NÃO invente dados de prova social (reviews, números, certificações) que não estejam no brief.
6. Se o briefing for insuficiente para um campo, deixe claro que falta informação — NÃO preencha com suposições.
7. Trate CADA documento anexado como fonte primária de verdade.
8. Quando houver conflito entre campos manuais e documentos, os campos manuais prevalecem (foram editados pelo usuário).
9. Use EXATAMENTE os nomes de marca, produto, localidade e dados numéricos como aparecem nos documentos — sem parafrasear.
10. Se um documento contiver restrições ou termos proibidos, RESPEITE-os absolutamente.
`;

export const DEEP_EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    brand_name: { type: "string", description: "Nome da marca/empresa" },
    brand_positioning: { type: "string", description: "Posicionamento da marca no mercado" },
    brand_values: { type: "array", items: { type: "string" }, description: "Valores da marca" },
    products_services: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          price: { type: "string" },
          differentials: { type: "string" },
        },
        required: ["name"],
        additionalProperties: false,
      },
      description: "Produtos e serviços mencionados",
    },
    tone_of_voice: {
      type: "object",
      properties: {
        formality: { type: "string", description: "Nível de formalidade (formal, semiformal, informal, descontraído)" },
        personality: { type: "string", description: "Personalidade da comunicação" },
        keywords_to_use: { type: "array", items: { type: "string" }, description: "Palavras-chave recomendadas" },
        words_to_avoid: { type: "array", items: { type: "string" }, description: "Palavras/termos proibidos" },
        summary: { type: "string", description: "Resumo geral do tom de voz" },
      },
      required: ["summary"],
      additionalProperties: false,
    },
    target_audience: {
      type: "object",
      properties: {
        demographics: { type: "string", description: "Dados demográficos (idade, gênero, localização, renda)" },
        psychographics: { type: "string", description: "Estilo de vida, valores, interesses" },
        pain_points: { type: "array", items: { type: "string" }, description: "Dores e problemas do público" },
        desires: { type: "array", items: { type: "string" }, description: "Desejos e aspirações" },
        objections: { type: "array", items: { type: "string" }, description: "Objeções comuns à compra" },
        summary: { type: "string", description: "Resumo geral do público-alvo" },
      },
      required: ["summary"],
      additionalProperties: false,
    },
    competitors: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          positioning: { type: "string" },
          differentials: { type: "string" },
        },
        required: ["name"],
        additionalProperties: false,
      },
      description: "Concorrentes mencionados",
    },
    visual_guidelines: {
      type: "object",
      properties: {
        colors_hex: { type: "array", items: { type: "string" }, description: "Cores em hex" },
        fonts: { type: "array", items: { type: "string" }, description: "Fontes/tipografias" },
        style: { type: "string", description: "Estilo visual geral" },
        dos: { type: "array", items: { type: "string" }, description: "O que fazer visualmente" },
        donts: { type: "array", items: { type: "string" }, description: "O que NÃO fazer visualmente" },
      },
      additionalProperties: false,
    },
    proof_points: {
      type: "array",
      items: { type: "string" },
      description: "Números reais, prêmios, depoimentos, certificações mencionados no documento",
    },
    key_messages: {
      type: "array",
      items: { type: "string" },
      description: "Mensagens-chave da marca para comunicação",
    },
    restrictions: {
      type: "array",
      items: { type: "string" },
      description: "Termos proibidos, temas sensíveis, restrições legais",
    },
    objectives: { type: "string", description: "Objetivos mencionados no documento" },
    extra_context: { type: "string", description: "Contexto adicional relevante que não se encaixa nos outros campos" },
    references_urls: { type: "array", items: { type: "string" }, description: "URLs de referência mencionadas" },
    detected_category: {
      type: "string",
      enum: ["identidade_visual", "produto", "tom_de_voz", "publico_alvo", "contexto", "referencias", "briefing", "geral"],
      description: "Categoria do documento baseada no conteúdo",
    },
    document_summary: { type: "string", description: "Resumo em 2-3 frases do que o documento contém" },
  },
  required: ["detected_category", "document_summary"],
  additionalProperties: false,
};
