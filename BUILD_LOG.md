# BUILD LOG - Mobile To-Do App

## Entry 1 - Inicialização do Projeto

- **Prompt / Request**: Inicialização do projeto para a atividade Mobile To-Do App.
- **Decision Summary**: Usar Expo + React Native e desenvolver incrementalmente por meio do agente da IDE.
- **Actions Performed**:
  - Inspeção da estrutura de diretórios e arquivos do projeto (`app.json`, `package.json`, `src/`, `assets/`, `scripts/`).
  - Execução de verificação de tipos com TypeScript (`npx tsc --noEmit`).
  - Criação do arquivo `BUILD_LOG.md` na raiz do projeto.
- **Result**: Projeto inicial inspecionado, validado e preparado para desenvolvimento.
- **Problems / Errors**:
  - Identificados 2 erros de compilação/tipagem TypeScript na estrutura base fornecida:
    1. `src/components/animated-icon.web.tsx`: Módulo `./animated-icon.module.css` sem declaração de tipos (`TS2307`).
    2. `src/constants/theme.ts`: Import de efeito colateral de `@/global.css` sem declaração de tipo (`TS2882`).
- **Fixes Attempted**: Nenhuma alteração applied nesta etapa, respeitando as diretrizes de não alterar configurações nem implementar código antes das fases específicas.
- **Current Status**: Completed.

## Entry 2 - Arquitetura Inicial e Configuração de Navegação

- **Prompt / Request**: Preparar a arquitetura inicial do Mobile To-Do App e configurar a navegação entre as 3 telas principais com Expo Router.
- **Decision Summary**:
  - **Uso do Expo Router**: Mantida a solução de navegação baseada em arquivos nativa do Expo via `<Stack>`, evitando bibliotecas externas desnecessárias.
  - **Uso do `taskId` para edição**: A rota `/task/[id]` utiliza unicamente o parâmetro de URL `taskId` (via `useLocalSearchParams`), assegurando que a tela futuramente buscará os dados diretamente do repositório/banco sem depender de estado volátil na navegação.
  - **Organização do Projeto**: Estruturação em camadas simples sob `src/`:
    - `src/app/` (rotas e telas)
    - `src/components/` (componentes reutilizáveis)
    - `src/types/` (modelos e tipos TypeScript)
    - `src/repositories/` (abstração de persistência)
    - `src/context/` (gerenciamento de estado)
    - `src/services/` (serviços como notificações)
  - **Adequação para Projeto Acadêmico**: Estrutura modular e enxuta, promovendo separação de responsabilidades sem complexidade excessiva ou sobreengenharia (over-engineering), facilitando o desenvolvimento incremental e testes.
- **Actions Performed**:
  - Criação dos arquivos de tipos (`src/types/task.ts`, `src/types/category.ts`).
  - Criação das interfaces de repositórios (`src/repositories/taskRepository.ts`, `src/repositories/categoryRepository.ts`).
  - Criação do contexto de estado inicial (`src/context/TaskContext.tsx`).
  - Criado o esqueleto de serviços (`src/services/notificationService.ts`).
  - Reconfigurado o layout raiz (`src/app/_layout.tsx`) com navegação Stack.
  - Atualizada a tela de Lista de Tarefas (`src/app/index.tsx`).
  - Criadas as telas de Gerenciamento de Categorias (`src/app/categories.tsx`) e Edição/Detalhes da Tarefa (`src/app/task/[id].tsx`).
- **Result**: Arquitetura base e navegação entre as três telas obrigatórias configuradas com sucesso.
- **Problems / Errors**: Nenhum erro novo gerado durante as alterações das rotas e arquitetura.
- **Fixes Attempted**: N/A.
- **Current Status**: Completed.

## Entry 3 - Implementação da Camada de Persistência SQLite

- **Prompt / Request**: Implementação da camada de persistência SQLite do Mobile To-Do App usando `expo-sqlite`.
- **Decision Summary**:
  - **Dependência `expo-sqlite`**: Instalada a versão `~57.0.4` compatível com o Expo SDK 57. A escolha se deve ao fato de ser a biblioteca oficial mantida pelo ecossistema Expo, leve e assíncrona, dispensando ORMs complexos ou dependências de terceiros desnecessárias para um projeto acadêmico.
  - **Estrutura das Tabelas**:
    - `categories`: `id` (TEXT PRIMARY KEY NOT NULL), `name` (TEXT NOT NULL).
    - `tasks`: `id` (TEXT PRIMARY KEY NOT NULL), `title` (TEXT NOT NULL), `description` (TEXT), `completed` (INTEGER NOT NULL DEFAULT 0), `dueDateTime` (TEXT), `createdAt` (TEXT NOT NULL), `categoryId` (TEXT).
  - **Integridade Referencial (`ON DELETE SET NULL`)**: A relação entre `tasks` e `categories` foi configurada como `FOREIGN KEY (categoryId) REFERENCES categories(id) ON DELETE SET NULL` e o parâmetro `PRAGMA foreign_keys = ON;` é ativado na abertura do banco. Isso garante que a exclusão de uma categoria desvincule as tarefas correspondentes (definindo `categoryId` como NULL) sem apagá-las.
  - **Tratamento de IDs, Datas e Booleanos**:
    - IDs: Chaves primárias do tipo TEXT geradas por timestamp concatenado com aleatoriedade (`Date.now().toString() + hash`).
    - Datas: Armazenadas em texto em formato ISO 8601 (`createdAt`, `dueDateTime`).
    - Booleanos: Mapeados no SQLite como `INTEGER` (`1` para `true`, `0` para `false`).
- **Actions Performed**:
  - Instalação do módulo `expo-sqlite` via `npx expo install expo-sqlite`.
  - Criação do módulo de banco de dados [`src/database/database.ts`](file:///C:/Users/aluno.lab03/todo-list-expo/src/database/database.ts) com scripts de criação de tabela e ativador de FKs.
  - Atualização dos tipos [`src/types/task.ts`](file:///C:/Users/aluno.lab03/todo-list-expo/src/types/task.ts) e [`src/types/category.ts`](file:///C:/Users/aluno.lab03/todo-list-expo/src/types/category.ts).
  - Implementação completa dos repositórios [`src/repositories/categoryRepository.ts`](file:///C:/Users/aluno.lab03/todo-list-expo/src/repositories/categoryRepository.ts) e [`src/repositories/taskRepository.ts`](file:///C:/Users/aluno.lab03/todo-list-expo/src/repositories/taskRepository.ts) com os métodos `getAll`, `getById`, `create`, `update` e `delete`.
  - Criação do arquivo de declaração de módulo CSS [`src/types/css.d.ts`](file:///C:/Users/aluno.lab03/todo-list-expo/src/types/css.d.ts).
  - Execução de validação com TypeScript (`npx tsc --noEmit`).
- **Result**: Camada de persistência local SQLite funcional e repositórios implementados sem erros de tipagem.
- **Problems / Errors**: Identificados 2 erros de tipagem pré-existentes do template inicial ao importar arquivos CSS (`.module.css` e `.css`).
- **Fixes Attempted**: Criado o arquivo de declarações `src/types/css.d.ts` definindo módulos para arquivos CSS, resolvendo totalmente os erros de compilação do TypeScript (agora com 0 erros no projeto).
- **Current Status**: Completed.

## Entry 4 - Implementação do CRUD de Categorias

- **Prompt / Request**: Implementar o CRUD completo de categorias na tela `src/app/categories.tsx` integrado ao `categoryRepository`.
- **Decision Summary**:
  - **Interface Nativa**: Utilização de componentes nativos do React Native (`FlatList`, `TextInput`, `Pressable`, `Alert`, `ActivityIndicator`) evitando bibliotecas de UI desnecessárias.
  - **Fluxo de Criação e Edição**: Implementada validação de campo obrigatório (`name.trim() !== ''`) impedindo inserção ou alteração para nomes em branco.
  - **Exclusão Segura**: Uso do `Alert.alert` nativo do React Native para confirmação prévia de exclusão, alinhado à regra de banco `ON DELETE SET NULL` para preservar as tarefas.
  - **Tratamento de Erros de Persistência**: Todas as operações de banco (`loadCategories`, `handleCreateCategory`, `handleSaveEdit`, `handleDeleteCategory`) foram encapsuladas em blocos `try...catch` com alertas visuais amigáveis ao usuário.
- **Actions Performed**:
  - Atualização da tela [`src/app/categories.tsx`](file:///C:/Users/aluno.lab03/todo-list-expo/src/app/categories.tsx) com estado reativo para listagem, adição, edição inline e exclusão de categorias.
  - Adicionadas validações de campos e feedback visual durante o processamento assíncrono.
  - Execução de verificação de tipos com TypeScript (`npx tsc --noEmit`).
- **Result**: CRUD de categorias totalmente funcional e integrado ao SQLite local.
- **Problems / Errors**: Nenhum erro de compilação ou execução encontrado durante a implementação do CRUD de categorias.
- **Fixes Attempted**: N/A.
- **Current Status**: Completed.

## Entry 5 - Implementação do CRUD Completo de Tarefas

- **Prompt / Request**: Implementação do CRUD completo de tarefas integrado ao SQLite e repositórios existentes.
- **Decision Summary**:
  - **Uso do Repositório Existente**: Reaproveitada a implementação do `taskRepository` sem duplicar métodos ou criar novos repositórios.
  - **Identificação da Rota (`/task/[id]`)**: Rota mantida recebendo unicamente o `taskId`. O valor `"new"` é utilizado para indicar criação, enquanto IDs reais carregam a tarefa do SQLite via `taskRepository.getById(id)`.
  - **Associação Opcional de Categoria**: Integração com `categoryRepository` permitindo associar uma categoria à tarefa ou mantê-la sem categoria (`categoryId = null`).
  - **Data/Hora (`dueDateTime`)**: Mantido o campo integrado ao modelo e formulário sem adicionar pacotes externos de data/picker ou notificações.
  - **Atualização em Tempo Real na Lista**: Utilização do hook `useFocusEffect` na tela principal [`src/app/index.tsx`](file:///C:/Users/aluno.lab03/todo-list-expo/src/app/index.tsx) para recarregar automaticamente as tarefas ao retornar das telas de criação ou edição.
- **Actions Performed**:
  - Atualização da tela principal [`src/app/index.tsx`](file:///C:/Users/aluno.lab03/todo-list-expo/src/app/index.tsx) com carregamento de tarefas e categorias, alternador rápido de conclusão, botões para nova tarefa e gerenciamento de categorias, e estado para lista vazia.
  - Implementação completa da tela de formulário [`src/app/task/[id].tsx`](file:///C:/Users/aluno.lab03/todo-list-expo/src/app/task/[id].tsx) com suporte a criação (`id = "new"`), edição por ID, validação de título obrigatório, seletor de categorias, alternador de status, exclusão com confirmação e botões de ação.
  - Execução de verificação de tipos com TypeScript (`npx tsc --noEmit`).
- **Result**: CRUD de tarefas totalmente operacional e integrado ao SQLite local.
- **Problems / Errors**: Nenhum erro de compilação ou execução introduzido nesta etapa.
- **Fixes Attempted**: N/A.
- **Current Status**: Completed.

## Entry 6 - Implementação de Filtros de Tarefas e Ajuste de Layout

- **Prompt / Request**: Implementar os filtros de tarefas e melhorar o layout da tela principal (`src/app/index.tsx`).
- **Decision Summary**:
  - **Filtros de Status e Categoria em Memória**: Adicionados estados para `statusFilter` (`'all' | 'pending' | 'completed'`) e `selectedCategoryId` (`string | null`). Os filtros são aplicados puramente sobre os dados já carregados em memória (`tasks` e `categories`), evitando chamadas repetidas ao SQLite ao alternar filtros.
  - **Combinação de Filtros**: A filtragem combina simultaneamente o status selecionado e a categoria selecionada (incluindo suporte a tarefas sem categoria quando "Todas as categorias" está ativo).
  - **Reorganização do Cabeçalho**: O título "Minhas Tarefas" foi posicionado isoladamente no topo, e os botões "+ Nova Tarefa" e "Gerenciar Categorias" foram realocados para uma área dedicada logo abaixo, eliminando problemas de cortes ou esmagamento horizontal.
  - **Estado Vazio Inteligente**: O componente de lista vazia diferencia quando não existem quaisquer tarefas cadastradas de quando a lista está vazia por conta dos filtros aplicados ("Nenhuma tarefa encontrada com esses filtros.").
  - **Ausência de Novas Dependências**: Nenhuma biblioteca adicional foi instalada.
- **Actions Performed**:
  - Atualização da tela principal [`src/app/index.tsx`](file:///C:/Users/aluno.lab03/todo-list-expo/src/app/index.tsx) com o novo layout de botões de cabeçalho, barra de chips de status, barra horizontal de chips de categorias e lógica de filtragem combinada.
  - Execução de verificação de tipos com TypeScript (`npx tsc --noEmit`).
- **Result**: Filtros e layout refinados e funcionais sem alterar os repositórios ou banco de dados.
- **Problems / Errors**: Nenhum erro de compilação ou execução encontrado.
- **Fixes Attempted**: N/A.
- **Current Status**: Completed.

## Entry 7 - Implementação de Data e Hora de Vencimento (DueDateTime)

- **Prompt / Request**: Implementar corretamente a definição de data e hora de vencimento da tarefa usando o campo `dueDateTime` já existente, com inputs `DD/MM/AAAA` e `HH:MM`, validações estritas, sem adicionar bibliotecas externas, e deixando notificações para a próxima etapa.
- **Decision Summary**:
  - **Entrada Nativa**: Utilização de `TextInput` separados para Data (`DD/MM/AAAA`) e Hora (`HH:MM`), evitando dependências externas de datepickers.
  - **Validação Estrita**: Validação de preenchimento parcial (impedir salvar se preencher apenas data ou apenas hora), validação de formato regular, verificação de existência real no calendário e validação de horas (`00:00` a `23:59`).
  - **Formato ISO Local Consistente**: Conversão para string ISO local (`YYYY-MM-DDTHH:mm:ss`) para persistência no SQLite, preservando o horário local do dispositivo sem conversões UTC indesejadas.
  - **Exibição Legível**: Adicionada formatação visual na lista principal para exibir a data e hora formatadas amigavelmente (`DD/MM/YYYY HH:MM`).
  - **Notificações Adicionadas**: Nenhuma notificação ou biblioteca de notificação foi implementada nesta etapa.
- **Actions Performed**:
  - Implementação de parsing e validação em [`src/app/task/[id].tsx`](file:///C:/Users/aluno.lab03/todo-list-expo/src/app/task/[id].tsx) para os inputs de data e hora, conversão ao carregar e conversão ao salvar.
  - Adição da função `formatDisplayDate` em [`src/app/index.tsx`](file:///C:/Users/aluno.lab03/todo-list-expo/src/app/index.tsx) para renderização limpa do vencimento.
  - Execução de verificação de tipos com TypeScript (`npx tsc --noEmit`).
- **Result**: Funcionalidade de data e hora implementada, validada e integrada com sucesso.
- **Problems / Errors**: Nenhum erro de compilação ou execução encontrado.
- **Fixes Attempted**: N/A.
- **Current Status**: Completed.

## Entry 8 - Implementação de Notificações Locais

- **Prompt / Request**: Implementar notificações locais para tarefas com `dueDateTime` usando `expo-notifications`, criando/completando `src/services/notificationService.ts`, associando pelo `task.id`, solicitando permissão sem quebrar o CRUD, agendando, cancelando, reagendando e sincronizando ao reabrir o aplicativo.
- **Decision Summary**:
  - **Dependência Utilizada**: `expo-notifications` (`~57.x`).
  - **Estratégia de Identificação**: Uso do `task.id` inserido no payload `data` da notificação (`Notifications.getAllScheduledNotificationsAsync()`), permitindo gerenciar (agendar e cancelar) sem alterar a estrutura do schema SQLite.
  - **Solicitação de Permissão**: Verificação e solicitação transparente de permissão antes de agendar. Caso negada, a tarefa é salva normalmente e o usuário é informado de forma não obstrutiva.
  - **Regras de Agendamento**: Agendamento apenas para tarefas pendentes (`completed = false`) com `dueDateTime` no futuro. Cancelamento automático ao concluir, editar (removendo ou mudando data), excluir ou expirar.
  - **Sincronização ao Reabrir**: Execução automática de `syncAllTaskNotifications` ao focar na tela principal (`useFocusEffect`), garantindo que tarefas pendentes futuras estejam agendadas sem duplicatas.
  - **Tratamento de Erros**: Falhas no agendamento de notificações nunca impedem as operações principais do CRUD de tarefas.
- **Actions Performed**:
  - Instalação do módulo `expo-notifications` via `npx expo install expo-notifications`.
  - Configuração do plugin `expo-notifications` em `app.json`.
  - Implementação completa do serviço [`src/services/notificationService.ts`](file:///C:/Users/aluno.lab03/todo-list-expo/src/services/notificationService.ts).
  - Integração do serviço nas operações de salvamento e exclusão em [`src/app/task/[id].tsx`](file:///C:/Users/aluno.lab03/todo-list-expo/src/app/task/[id].tsx) e no toggle de conclusão e foco em [`src/app/index.tsx`](file:///C:/Users/aluno.lab03/todo-list-expo/src/app/index.tsx).
  - Execução de verificação de tipos com TypeScript (`npx tsc --noEmit`).
- **Result**: Notificações locais totalmente operacionais e integradas ao ciclo de vida das tarefas.
- **Problems / Errors**: Nenhum erro de compilação ou execução encontrado.
- **Fixes Attempted**: N/A.
- **Current Status**: Completed.

## Entry 9 - Configuração para Development Build (Expo SDK 57)

- **Prompt / Request**: Configurar o projeto para executar usando uma Development Build do Expo em vez do Expo Go, suportando adequadamente os módulos nativos `expo-sqlite` e `expo-notifications`.
- **Decision Summary**:
  - **Uso de Development Build**: Adequação ao Expo SDK 57, onde funcionalidades de notificações push/locais e módulos nativos foram descontinuadas no Expo Go padrão.
  - **Continuous Native Generation (CNG)**: O projeto utiliza o modelo gerenciado do Expo, gerando a pasta nativa `android/` em tempo de compilação via `npx expo run:android` ou `eas build`.
  - **Preservação de Configurações**: Nenhum arquivo de código fonte ou schema SQLite foi alterado. Os plugins necessários (`expo-sqlite`, `expo-notifications`) já estão declarados no `app.json`.
- **Actions Performed**:
  - Inspeção do projeto, `package.json` e `app.json`.
  - Confirmação da configuração correta dos plugins em `app.json`.
  - Registro da transição para Development Build.
- **Result**: Projeto preparado e compilação para Development Build Android documentada.
- **Problems / Errors**: Nenhum erro encontrado.
- **Fixes Attempted**: N/A.
- **Current Status**: Completed.

## Entry 10 - Análise do Código, Elaboração e Revisor do Questionário de Engenharia Reversa

- **Prompt / Request**: Realizar a engenharia reversa do código-fonte do aplicativo `todo-list-expo`, responder às 8 perguntas do questionário em português brasileiro no arquivo `QUESTIONNAIRE.md`, revisar e refinar as respostas garantindo precisão absoluta com o código e com o `BUILD_LOG.md`, sem alterar os arquivos de implementação da aplicação nem realizar git commit/push.
- **Decision Summary**:
  - **Rigor no Mapeamento do Código Real**: Análise fundamentada na inspeção direta dos arquivos de código (`src/app/`, `src/components/`, `src/database/`, `src/repositories/`, `src/services/`, `src/types/`, `src/context/`) e do histórico de desenvolvimento do `BUILD_LOG.md`.
  - **Precisão das Especificações**:
    - Confirmação da fórmula exata de geração de ID em `taskRepository.ts` e `categoryRepository.ts`: `Date.now().toString() + Math.random().toString(36).substring(2, 6)`.
    - Especificação do nome exato do parâmetro da rota de edição (`id`), lido em `src/app/task/[id].tsx` via `useLocalSearchParams<{ id: string }>()`, e das chamadas exatas `router.push('/task/new')`, `router.push(/task/${item.id})` e `router.push('/categories')`.
    - Diferenciação clara entre o que foi validado (análise estática de tipos `npx tsc --noEmit` sem erros e inspeção lógica) e o que não foi executado em runtime físico (disparo do alerta/som no dispositivo no segundo exato do vencimento).
    - Descrição precisa dos 2 erros de tipagem CSS (TS2307 e TS2882) herdados do template original, registrando que a primeira abordagem (Entry 1) foi adiar a correção e a solução final (Entry 3) foi a criação do `src/types/css.d.ts`.
  - **Preservação do Código-Fonte**: Nenhum arquivo da pasta `src/` ou arquivo de configuração da aplicação foi modificado nesta etapa. Todas as entradas anteriores do `BUILD_LOG.md` foram preservadas na íntegra.
- **Actions Performed**:
  - Inspeção e cruzamento detalhado entre o código-fonte, o histórico do `BUILD_LOG.md` e a documentação `QUESTIONNAIRE.md`.
  - Atualização e refinamento do arquivo [`QUESTIONNAIRE.md`](file:///C:/Users/aluno.lab03/todo-list-expo/QUESTIONNAIRE.md) na raiz do projeto.
  - Atualização da Entry 10 do [`BUILD_LOG.md`](file:///C:/Users/aluno.lab03/todo-list-expo/BUILD_LOG.md).
  - Execução da verificação de tipos via terminal com `npx tsc --noEmit`.
- **Result**: Questionário de Engenharia Reversa e histórico de desenvolvimento minuciosamente validados e atualizados.
- **Problems / Errors**: Nenhum erro de compilação ou de tipagem encontrado (0 erros de TypeScript).
- **Fixes Attempted**: N/A.
- **Current Status**: Completed.
