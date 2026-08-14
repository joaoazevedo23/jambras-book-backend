# 🏛️ Jambra's Book Club - API (Backend)

> O motor lógico por trás do "Letterboxd dos Clássicos" — Gerenciando competições, histórico de leituras e amizades.

![NestJS](https://img.shields.io/badge/nestjs-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)

## 📖 Sobre a API
Este repositório contém a infraestrutura de backend do **Jambra's Book Club**. Construída com foco em segurança, escalabilidade e código limpo, esta API RESTful é responsável por processar todas as regras de negócio da plataforma de leitura social e competitiva.

O sistema gerencia as entidades relacionais complexas (Usuários, Amizades, Livros, Competições e Sessões de Leitura) e calcula dinamicamente os rankings e estatísticas de progresso dos membros.

## ⚙️ Arquitetura e Funcionalidades

*   **Autenticação e Segurança:** Sistema de login seguro protegendo dados sensíveis dos usuários (preparado para JWT e boas práticas de cyber segurança).
*   **Gestão de Competições:** Algoritmos para calcular porcentagem de leitura, velocidade (páginas/dia) e determinar a posição em tempo real no *Leaderboard*.
*   **Social & Feed:** Relacionamentos de amizade e estruturação cronológica do feed de atividades.
*   **Banco de Dados Relacional:** Estrutura sólida utilizando PostgreSQL para garantir a integridade dos históricos de leitura e das competições concluídas.

## 🛠️ Tecnologias Utilizadas
*   **Framework:** [NestJS](https://nestjs.com/) (Node.js)
*   **Linguagem:** [TypeScript](https://www.typescriptlang.org/)
*   **Banco de Dados:** [PostgreSQL](https://www.postgresql.org/)
*   **ORM:** [Prisma](https://www.prisma.io/)

---

## 🚀 Como Executar o Projeto Localmente

**1. Clone o repositório:**
```bash
git clone [https://github.com/SEU-USUARIO/jambras-book-backend.git](https://github.com/SEU-USUARIO/jambras-book-backend.git)
