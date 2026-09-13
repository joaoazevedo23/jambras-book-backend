# 📚 Bookr Backend API

> A infraestrutura de backend RESTful para a plataforma social e competitiva de leitura **Bookr** — gerenciando catálogo de livros, estante virtual, histórico de leituras, interações sociais, competições e gamificação.

---

## 📖 Visão Geral

O **Bookr API** é o motor de negócios por trás de uma rede social voltada para leitores. O sistema permite que usuários registrem seu progresso diário de leitura, organizem suas estantes virtuais, importem dados diretamente do Google Books, participem de competições de leitura com rankings em tempo real, interajam com amigos via feed de atividades e acompanhem estatísticas consolidadas sobre seus hábitos de leitura.

A aplicação foi desenvolvida com foco em código limpo, cobertura completa de testes automatizados, containerização de ambientes e arquitetura modular escalável.

---

## 🛠️ Tecnologias Utilizadas

| Categoria           | Tecnologia                 | Descrição                                                                      |
| ------------------- | -------------------------- | ------------------------------------------------------------------------------ |
| **Core**            | Node.js 22 & NestJS        | Framework progressivo para construção de aplicações server-side eficientes     |
| **Linguagem**       | TypeScript                 | Tipagem estática para maior segurança e manutenibilidade                       |
| **Persistência**    | PostgreSQL 16 & Prisma ORM | Banco de dados relacional com migrações tipadas e suporte a `prisma.config.ts` |
| **Autenticação**    | JWT & Bcrypt               | Tokens Access/Refresh resilientes com rotação e identificador único `(jwtid)`  |
| **Containerização** | Docker & Docker Compose    | Containerização multi-stage baseada em Alpine Linux com _healthcheck_          |
| **Testes**          | Jest & Supertest           | Suíte de testes unitários (100% dos serviços) e testes End-to-End (E2E)        |
| **Integrações**     | Google Books API & Axios   | Busca e importação externa automatizada de obras e metadados de livros         |
| **Documentação**    | Swagger / OpenAPI          | Documentação interativa exposta em `/api/docs`                                 |

---

## 🏗️ Arquitetura do Sistema

```mermaid
flowchart TD
  subgraph Client["Camada de Cliente"]
    Web["Frontend App / Web"]
    SwaggerDoc["Swagger UI (/api)"]
  end

  subgraph API["NestJS Application Core"]
    Guard["Auth Guard / Public Decorator"]

    subgraph Modules["Módulos de Negócio"]
      AuthMod["Auth Module"]
      UserMod["Users Module"]
      BookMod["Books Module"]
      ActMod["Activities Module"]
      FriendMod["Friendships Module"]
      CompMod["Competitions Module"]
      NotifMod["Notifications Module"]
    end
  end

  subgraph External["Serviços Externos"]
    GoogleBooks["Google Books API"]
  end

  subgraph Persistence["Camada de Persistência & Storage"]
    PrismaORM["Prisma Client"]
    Postgres[("PostgreSQL 16<br/>Container Database")]
    LocalUploads["Local Storage<br/>(/uploads/covers & /uploads/avatars)"]
  end

  Web -->|HTTP Requests| Guard
  SwaggerDoc -->|HTTP Requests| Guard
  Guard --> Modules

  BookMod -->|Fetch / Import Metadata| GoogleBooks

  ActMod -->|Dispara Notificação| NotifMod
  FriendMod -->|Dispara Notificação| NotifMod
  CompMod -->|Dispara Notificação| NotifMod

  Modules --> PrismaORM
  BookMod -->|Upload de Capas| LocalUploads
  UserMod -->|Upload de Avatares| LocalUploads

  PrismaORM -->|Queries & Migrations| Postgres

```

---

## ⚙️ Principais Funcionalidades

- **Autenticação Segura:** Cadastro, login e revogação de tokens JWT com verificação de colisão e armazenamento de refresh tokens.
- **Catálogo & Google Books:** Busca pública e importação automatizada de livros via Google Books API com mapeamento de ISBN e categorias.
- **Estante & Sessões de Leitura:** Controle de status da leitura (`WANT_TO_READ`, `READING`, `COMPLETED`), progresso por páginas ou capítulos e diário de leitura.
- **Feed Social & Interação:** Atividades geradas automaticamente por leituras concluídas, com suporte a curtidas e comentários em tempo real.
- **Rede de Amigos:** Envio, aceite, rejeição e remoção de vínculos de amizade com notificações automáticas.
- **Competições de Leitura:** Desafios em grupo com cálculo automático de páginas lidas e _Leaderboard_ atualizado dinamicamente.
- **Métricas & Gamificação:** Cálculo estatístico de páginas lidas no mês, histórico total, sequência diária (_streak_) e gêneros favoritos.

---

## 📑 API Endpoints

A documentação interativa completa (OpenAPI/Swagger) fica disponível em `http://localhost:3001/api/docs` com o ambiente em execução.

### 🔐 Autenticação (`/auth`)

| Método | Endpoint         | Descrição                                   |
| ------ | ---------------- | ------------------------------------------- |
| `POST` | `/auth/register` | Cadastro de novo usuário                    |
| `POST` | `/auth/login`    | Autenticação e geração de tokens JWT        |
| `POST` | `/auth/logout`   | Revogação do Refresh Token ativo            |
| `POST` | `/auth/refresh`  | Renovação do Access Token via Refresh Token |

### 👤 Usuários & Métricas (`/users`)

| Método  | Endpoint                    | Descrição                                                                 |
| ------- | --------------------------- | ------------------------------------------------------------------------- |
| `GET`   | `/users/me`                 | Obter perfil do usuário logado                                            |
| `PATCH` | `/users/me`                 | Atualizar dados do perfil do usuário logado                               |
| `PATCH` | `/users/me/change-password` | Alterar senha do usuário logado                                           |
| `PATCH` | `/users/me/avatar`          | Atualizar foto de perfil do usuário logado                                |
| `GET`   | `/users/me/stats`           | Calcular métricas acumuladas (streak, páginas, gêneros) do usuário logado |

### 📚 Livros & Estante (`/books`)

| Método  | Endpoint                                 | Descrição                                                    |
| ------- | ---------------------------------------- | ------------------------------------------------------------ |
| `POST`  | `/books`                                 | Cadastrar novo livro no catálogo local                       |
| `GET`   | `/books`                                 | Listar livros com filtros de busca e paginação               |
| `GET`   | `/books/:id`                             | Obter detalhes de um livro pelo ID                           |
| `GET`   | `/books/search/external`                 | Buscar obras na API do Google Books                          |
| `POST`  | `/books/import/:googleBooksId`           | Importar um livro do Google Books para o banco local         |
| `PATCH` | `/books/:id/shelf`                       | Adicionar ou atualizar um livro na estante do usuário logado |
| `GET`   | `/books/user/shelf`                      | Listar a estante do usuário logado                           |
| `PATCH` | `/books/:id/cover`                       | Atualizar a imagem de capa do livro                          |
| `POST`  | `/books/user-books/:userBookId/sessions` | Registrar uma nova sessão de leitura                         |
| `GET`   | `/books/user-books/:userBookId/sessions` | Listar histórico de sessões de leitura de um livro           |

### 📱 Feed (`/activities`)

| Método   | Endpoint                          | Descrição                                                 |
| -------- | --------------------------------- | --------------------------------------------------------- |
| `GET`    | `/activities/feed`                | Retornar o feed de atividades do usuário e de seus amigos |
| `POST`   | `/activities/:id/like`            | Curtir uma publicação do feed                             |
| `DELETE` | `/activities/:id/like`            | Remover a curtida de uma publicação                       |
| `POST`   | `/activities/:id/comments`        | Comentar uma publicação do feed                           |
| `DELETE` | `/activities/comments/:commentId` | Remover o comentário de uma publicação                    |

### 🔉 Notificações (`/notifications`)

| Método  | Endpoint                  | Descrição                                   |
| ------- | ------------------------- | ------------------------------------------- |
| `GET`   | `/notifications`          | Listar notificações do usuário logado       |
| `PATCH` | `/notifications/read-all` | Marcar todas as notificações como lidas     |
| `PATCH` | `/notifications/:id/read` | Marcar uma notificação específica como lida |

### 👥 Amizades (`/friendships`)

| Método   | Endpoint                                   | Descrição                                      |
| -------- | ------------------------------------------ | ---------------------------------------------- |
| `POST`   | `/friendships/request/:addresseeId`        | Enviar solicitação de amizade                  |
| `POST`   | `/friendships/requests/:requestId/respond` | Aceitar ou recusar solicitação                 |
| `GET`    | `/friendships`                             | Listar todos os amigos do usuário logado       |
| `GET`    | `/friendships/requests/pending`            | Listar pedidos de amizades recebidos pendentes |
| `DELETE` | `/friendships/:friendId`                   | Remover amizade ou cancelar solicitação        |

### 🏆 Competições (`/competitions`)

| Método | Endpoint                        | Descrição                                                    |
| ------ | ------------------------------- | ------------------------------------------------------------ |
| `POST` | `/competitions`                 | Criar nova competição de leitura                             |
| `GET`  | `/competitions`                 | Listar competições em que o usuário logado está participando |
| `POST` | `/competitions/:id/join`        | Entrar em uma competição existente                           |
| `GET`  | `/competitions/:id/leaderboard` | Obter o ranking e progresso dos participantes em tempo real  |

---

## 🧪 Testes Automatizados

O projeto possui uma suíte rigorosa de testes unitários e testes de integração de ponta a ponta (E2E).

```bash
# Executar a suíte de testes unitários (8 services cobertos)
npm run test

# Executar a suíte de testes E2E (com container do PostgreSQL em execução)
npm run test:e2e

# Verificar cobertura de testes
npm run test:cov
```

---

## 🚀 Como Executar o Projeto

### Pré-requisitos

- Node.js 22+
- Docker Desktop instalado e em execução

### Passo a Passo

#### 1. Clone o repositório:

```bash
git clone https://github.com/joaoazevedo23/jambras-book-backend.git
```

#### 2. Configure as variáveis de ambiente:

Crie um arquivo `.env` na raiz do projeto com base no `.env.example`:

```
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/bookr?schema=public"

# App
PORT=3001
FRONTEND_URL="http://localhost:3000"

# JWT Auth Secrets
JWT_ACCESS_SECRET="sua_chave_secreta_access_token_super_segura"
JWT_REFRESH_SECRET="sua_chave_secreta_refresh_token_super_segura"

# Token Expiration
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

#Google Books API Key (Opcional)
GOOGLE_BOOKS_API_KEY="sua_chave_opcional_google_books"
```

#### 3. Escolha como deseja rodar a aplicação

- **Opção A: Ambiente Completo em Container (Recomendado)**
  Sobe tanto o banco de dados quanto a API em containers Docker isolados:

```bash
docker compose up -d --build
```

Este comando constrói a imagem da API em multi-stage build, sobe o PostgreSQL 16, aplica as migrações do Prisma e disponibiliza o servidor na porta `3001`.

- **Opção B: Execução Local (Modo Desenvolvimento)**
  Ideal para desenvolver e testar alterações no código em tempo real (hot-reload):

##### 1. Instale as dependências:

```bash
npm install
```

##### 2. Sobe apenas o container do PostgreSQL:

```bash
docker compose up -d postgres
```

##### 3. Execute as migrações do banco:

```bash
npx prisma migrate dev
```

##### 4. Inicie a API em modo de desenvolvimento:

```bash
npm run start:dev
```

#### 4. Acessar a aplicação:

- API Endpoint: `http://localhost:3001`
- Documentação Swagger: `http://localhost:3001/api/docs`
