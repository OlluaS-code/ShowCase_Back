/// <reference types="node" />
import "reflect-metadata";
import { AppDataSource } from "../src/utils/settings/data-source";
import { PublicationEntity } from "../src/database/migrations/publication.entity";
import { SpecificationEntity } from "../src/database/migrations/specification.entity";

async function seedMocks() {
  console.log("[Seeder] Conectando ao banco de dados principal...");
  await AppDataSource.initialize();

  const pubRepo = AppDataSource.getRepository(PublicationEntity);
  const specRepo = AppDataSource.getRepository(SpecificationEntity);

  console.log("[Seeder] Limpando mocks antigos...");
  await AppDataSource.query(`TRUNCATE TABLE "publications" CASCADE`);
  await AppDataSource.query(`TRUNCATE TABLE "specifications" CASCADE`);

  console.log("[Seeder] Inserindo Publicações Mock (Projetos)...");
  await pubRepo.save([
    {
      title: "NeoPay - Gateway de Pagamentos",
      content: "Uma plataforma escalável de pagamentos construída em arquitetura de microsserviços. Processa transações em tempo real com alta disponibilidade e segurança.",
      category: "FullStack",
      techStack: ["Node.js", "Fastify", "Redis", "PostgreSQL"],
      media: [
        { url: "https://picsum.photos/id/0/800/450", type: "image" },
        { url: "https://www.w3schools.com/html/mov_bbb.mp4", type: "video" }
      ]
    },
    {
      title: "Aura UI - Design System",
      content: "Biblioteca de componentes acessíveis e responsivos para o ecossistema React. Foco extremo em performance, testes visuais e consistência.",
      category: "Frontend",
      techStack: ["React", "TypeScript", "Tailwind CSS", "Storybook"],
      media: [
        { url: "https://picsum.photos/id/119/800/450", type: "image" }
      ]
    },
    {
      title: "FitTrack Pro - Mobile App",
      content: "Aplicativo nativo para rastreamento de exercícios e dietas. Possui sincronização offline, gráficos dinâmicos de progresso e motor de recomendação.",
      category: "Mobile",
      techStack: ["React Native", "Expo", "Zustand", "SQLite"],
      media: [
        { url: "https://picsum.photos/id/180/800/450", type: "image" }
      ]
    }
  ] as any);

  console.log("[Seeder] Inserindo Competências (Hard Skills)...");
  await specRepo.save([
    {
      tag: "BACKEND",
      title: "Node.js & TypeScript",
      description: "Construção de aplicações escaláveis assíncronas (Event Loop) e desenvolvimento de APIs RESTful tipadas e seguras com Express.",
      iconSvg: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5'/></svg>",
      isWide: false,
      order: 1
    },
    {
      tag: "DEVOPS",
      title: "Docker",
      description: "Criação, execução e gerenciamento de containers, empacotamento, isolamento de aplicações e otimização do fluxo de implantação em ambientes ágeis.",
      iconSvg: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><rect x='2' y='2' width='20' height='8' rx='2' ry='2'/><rect x='2' y='14' width='20' height='8' rx='2' ry='2'/><line x1='6' y1='6' x2='6.01' y2='6'/><line x1='6' y1='18' x2='6.01' y2='18'/></svg>",
      isWide: false,
      order: 2
    },
    {
      tag: "DEVOPS",
      title: "Jenkins & CI/CD",
      description: "Automação do ciclo de entrega de software, pipelines de integração e entrega contínuas (CI/CD) em metodologias ágeis.",
      iconSvg: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><polygon points='13 2 3 14 12 14 11 22 21 10 12 10 13 2'/></svg>",
      isWide: false,
      order: 3
    },
    {
      tag: "DADOS",
      title: "SQL Expert (MySQL)",
      description: "Modelagem de dados, arquitetura relacional e criação de consultas avançadas em SQL para administração de bancos de dados.",
      iconSvg: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><ellipse cx='12' cy='5' rx='9' ry='3'/><path d='M21 12c0 1.66-4 3-9 3s-9-1.34-9-3'/><path d='M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5'/></svg>",
      isWide: false,
      order: 4
    },
    {
      tag: "GIT",
      title: "Git & GitHub Workflow",
      description: "Controle de versão avançado, metodologias de versionamento (Git Flow), fluxos colaborativos (branches, PRs, merges) e boas práticas de equipe.",
      iconSvg: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><circle cx='12' cy='12' r='10'/><path d='M12 16v-4'/><path d='M12 8h.01'/></svg>",
      isWide: false,
      order: 5
    },
    {
      tag: "ENGENHARIA",
      title: "Engenharia de Software & Requisitos",
      description: "Levantamento de requisitos, diagramação UML, design patterns, ciclo de vida de software, pensamento computacional e abstração de problemas.",
      iconSvg: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><circle cx='12' cy='12' r='3'/><path d='M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z'/></svg>",
      isWide: true,
      order: 6
    },
    {
      tag: "BACKEND",
      title: "Ecossistema Java",
      description: "Introdução à plataforma Java (JVM, JRE, JDK), ambiente de desenvolvimento, sintaxe, métodos, arrays e estruturas de controle de fluxo.",
      iconSvg: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='M18 8h1a4 4 0 0 1 0 8h-1'/><path d='M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z'/><line x1='6' y1='1' x2='6' y2='4'/><line x1='10' y1='1' x2='10' y2='4'/><line x1='14' y1='1' x2='14' y2='4'/></svg>",
      isWide: false,
      order: 7
    },
    {
      tag: "FRONTEND",
      title: "Electron & Web Desktop",
      description: "Criação de aplicações desktop multiplataforma combinando o ecossistema Web (HTML/CSS/JS) com backends Express.",
      iconSvg: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><rect x='2' y='3' width='20' height='14' rx='2' ry='2'/><line x1='8' y1='21' x2='16' y2='21'/><line x1='12' y1='17' x2='12' y2='21'/></svg>",
      isWide: false,
      order: 8
    },
    {
      tag: "FRONTEND",
      title: "HTML5 & CSS3 Avançado",
      description: "Estruturação semântica, estilização avançada, interfaces dinâmicas e responsivas (Web Moderno).",
      iconSvg: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z'/><path d='M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z'/></svg>",
      isWide: false,
      order: 9
    }
  ]);

  console.log("[Seeder] ✅ Todos os Mocks foram injetados com sucesso para a gravação!");
  await AppDataSource.destroy();
}

seedMocks().catch((err) => {
  console.error("Erro ao inserir mocks:", err);
  process.exit(1);
});
