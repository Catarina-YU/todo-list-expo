# Questionário de Engenharia Reversa de Aplicativo Mobile

Este documento contém a análise de engenharia reversa do código-fonte e da arquitetura do aplicativo **todo-list-expo**, desenvolvida com base na inspeção direta dos arquivos do projeto e no registro histórico do `BUILD_LOG.md`.

---

## 1. Estrutura do projeto

Quais são as principais partes do projeto e onde estão localizados:
- a interface e as telas;
- os modelos de dados;
- o código do SQLite e do banco de dados;
- a navegação;
- o código das notificações?

Descreva brevemente como o projeto está organizado.

### Resposta:

O projeto está estruturado segundo uma arquitetura modular em camadas simples (Layered Architecture) sob o diretório `src/`:

1. **Interface e Telas (`src/app/` e `src/components/`)**:
   - `src/app/index.tsx`: Tela principal contendo a listagem de tarefas, alternador de conclusão, chips de filtro de status e categoria, e botões de ação (`+ Nova Tarefa` e `Gerenciar Categorias`).
   - `src/app/task/[id].tsx`: Tela de formulário para criação (`id = 'new'`), edição e exclusão de tarefas por ID, com validações de data/hora e seletor de categorias.
   - `src/app/categories.tsx`: Tela de gerenciamento do CRUD de categorias (criação, edição inline e exclusão).
   - `src/components/`: Componentes visuais reutilizáveis e tematizados (`themed-text.tsx`, `themed-view.tsx`, `app-tabs.tsx`, etc.).

2. **Modelos de dados (`src/types/`)**:
   - `src/types/task.ts`: Define a interface `Task` (`id`, `title`, `description`, `completed`, `dueDateTime`, `createdAt`, `categoryId`).
   - `src/types/category.ts`: Define a interface `Category` (`id`, `name`).

3. **Código do SQLite e do banco de dados (`src/database/` e `src/repositories/`)**:
   - `src/database/database.ts`: Módulo central responsável pela abertura da conexão com o banco `todo_app.db` via `expo-sqlite`, ativação do suporte a chaves estrangeiras (`PRAGMA foreign_keys = ON;`) e criação do schema das tabelas `categories` e `tasks`.
   - `src/repositories/taskRepository.ts`: Camada de abstração que executa as consultas SQL (`getAll`, `getById`, `create`, `update`, `delete`) na tabela `tasks`, com geração de ID no padrão `Date.now().toString() + Math.random().toString(36).substring(2, 6)`.
   - `src/repositories/categoryRepository.ts`: Camada de abstração que executa as consultas SQL na tabela `categories`, com o mesmo padrão de geração de ID.

4. **Navegação (`src/app/`)**:
   - `src/app/_layout.tsx`: Configuração do navegador de pilha nativo (`<Stack>`) do Expo Router contendo as telas registradas: `index` ("Lista de Tarefas"), `task/[id]` ("Detalhes / Edição") e `categories` ("Categorias"). A navegação baseada em arquivos é gerenciada pela estrutura do diretório `src/app/`.

5. **Código das notificações (`src/services/`)**:
   - `src/services/notificationService.ts`: Módulo responsável pela checagem e solicitação de permissões, agendamento de lembretes vinculados ao `taskId` no payload `data`, cancelamento de notificações e sincronização automática.

---

## 2. Arquitetura e gerenciamento de estado

Como o estado da aplicação é gerenciado?

Explique como a interface é atualizada após operações como:
- criar uma tarefa;
- editar uma tarefa;
- marcar uma tarefa como concluída.

O projeto utiliza algum padrão arquitetural reconhecível ou alguma abordagem de gerenciamento de estado?

### Resposta:

1. **Gerenciamento de Estado**:
   O projeto combina gerenciamento de estado reativo local (`useState`, `useCallback`) nas telas com sincronização sob demanda vinda do banco de dados SQLite. Embora exista um `TaskContext` em `src/context/TaskContext.tsx`, as telas do app foram implementadas consumindo os dados diretamente dos repositórios (`taskRepository` e `categoryRepository`). A atualização das telas ao navegar de volta é garantida pelo hook `useFocusEffect` do Expo Router em `src/app/index.tsx`, que recarrega os dados do SQLite toda vez que a tela ganha foco.

2. **Atualização da Interface nas Operações**:
   - **Criar uma tarefa**: Na tela `src/app/task/[id].tsx` (com o parâmetro `id = 'new'`), o usuário clica em "Criar Tarefa", disparando `handleSave()`. A função valida os campos, chama `taskRepository.create()`, sincroniza a notificação com `notificationService.syncTaskNotification()` e retorna à tela anterior via `router.back()`. A tela principal (`src/app/index.tsx`) detecta o foco com `useFocusEffect`, executa `loadData()` (que chama `taskRepository.getAll()`) e atualiza o estado local `tasks` com `setTasks()`, forçando a re-renderização da `FlatList`.
   - **Editar uma tarefa**: Na tela `src/app/task/[id].tsx` (acessada via `router.push(`/task/${item.id}`)`), ao clicar em "Salvar Alterações", `handleSave()` executa `taskRepository.update(id, ...)` e `notificationService.syncTaskNotification()`, finalizando com `router.back()`. Ao focar na tela principal, o `useFocusEffect` recarrega a lista do SQLite.
   - **Marcar uma tarefa como concluída**:
     - *Pela lista principal (`index.tsx`)*: O toque no checkbox aciona `handleToggleCompleted(task)`. A tela realiza uma atualização reativa local imediata (`setTasks(prev => prev.map(...))`) para resposta visual instantânea e, em seguida, persiste o novo estado no SQLite via `taskRepository.update()` e atualiza a notificação via `notificationService.syncTaskNotification()`.
     - *Pelo formulário (`task/[id].tsx`)*: O usuário altera o `Switch` de conclusão e salva com "Salvar Alterações", disparando a atualização no SQLite e na lista.

3. **Padrão Arquitetural e Abordagem**:
   - **Repository Pattern (Padrão Repositório)**: Isola totalmente as instruções SQL do `expo-sqlite` da camada de interface do usuário.
   - **Stateful Screen Components (Componentes de Tela com Estado Local)**: Telas reativas integradas com hooks de ciclo de vida e navegação (`useFocusEffect`, `useLocalSearchParams<{ id: string }>()`, `useRouter`).

---

## 3. Persistência com SQLite

Como o SQLite é utilizado no aplicativo?

Identifique:
- onde o banco de dados é criado;
- como as tarefas e categorias são armazenadas;
- onde as operações de criação, leitura, atualização e exclusão são implementadas.

### Resposta:

1. **Criação do Banco de Dados**:
   - O banco de dados é inicializado em `src/database/database.ts`.
   - A função `getDatabase()` abre a conexão síncrona com o arquivo local `todo_app.db` via `SQLite.openDatabaseSync('todo_app.db')`.
   - A função `initDatabase()` é chamada no início de cada método dos repositórios. Ela habilita as chaves estrangeiras com `PRAGMA foreign_keys = ON;` e executa os comandos `CREATE TABLE IF NOT EXISTS` para as tabelas `categories` e `tasks`.

2. **Armazenamento de Tarefas e Categorias**:
   - **Tabela `categories`**:
     - `id` (TEXT PRIMARY KEY NOT NULL)
     - `name` (TEXT NOT NULL)
   - **Tabela `tasks`**:
     - `id` (TEXT PRIMARY KEY NOT NULL)
     - `title` (TEXT NOT NULL)
     - `description` (TEXT)
     - `completed` (INTEGER NOT NULL DEFAULT 0)
     - `dueDateTime` (TEXT)
     - `createdAt` (TEXT NOT NULL)
     - `categoryId` (TEXT, FOREIGN KEY referenciando `categories(id)` ON DELETE SET NULL)
   - **Geração e Mapeamento de Tipos**:
     - Os IDs de tarefas e categorias são gerados no código do repositório através da expressão: `const id = Date.now().toString() + Math.random().toString(36).substring(2, 6);`.
     - Os valores booleanos de conclusão são mapeados no SQLite como inteiros (`1` para `true`, `0` para `false`).
     - As datas e horas (`createdAt` e `dueDateTime`) são armazenadas em texto em formato ISO 8601 local (`YYYY-MM-DDTHH:mm:ss` / `YYYY-MM-DDTHH:mm:ss.sssZ`).

3. **Implementação do CRUD**:
   As operações de persistência são implementadas de forma assíncrona nos repositórios:
   - **`src/repositories/categoryRepository.ts`**:
     - `getAll()`: `SELECT * FROM categories ORDER BY name ASC;`
     - `getById(id)`: `SELECT * FROM categories WHERE id = ?;`
     - `create(category)`: `INSERT INTO categories (id, name) VALUES (?, ?);`
     - `update(id, category)`: `UPDATE categories SET name = ? WHERE id = ?;`
     - `delete(id)`: `DELETE FROM categories WHERE id = ?;`
   - **`src/repositories/taskRepository.ts`**:
     - `getAll()`: `SELECT * FROM tasks ORDER BY createdAt DESC;`
     - `getById(id)`: `SELECT * FROM tasks WHERE id = ?;`
     - `create(task)`: `INSERT INTO tasks (id, title, description, completed, dueDateTime, createdAt, categoryId) VALUES (?, ?, ?, ?, ?, ?, ?);`
     - `update(id, task)`: `UPDATE tasks SET title = ?, description = ?, completed = ?, dueDateTime = ?, categoryId = ? WHERE id = ?;`
     - `delete(id)`: `DELETE FROM tasks WHERE id = ?;`

---

## 4. Acompanhamento de uma operação

Descreva o que acontece quando o usuário cria uma nova tarefa.

Comece pelo momento em que ele pressiona **Salvar** e acompanhe a execução até:
1. a tarefa ser armazenada no SQLite;
2. a tarefa aparecer na lista de tarefas;
3. uma notificação ser agendada, caso exista uma data de vencimento.

Descreva os principais componentes e funções envolvidos.

### Resposta:

1. **Ação do Usuário e Validação**:
   - Na tela `src/app/task/[id].tsx` (com `id = 'new'`), o usuário preenche o título, a descrição, escolhe uma categoria, informa a data/hora de vencimento e pressiona o botão **Criar Tarefa**, que chama a função `handleSave()`.
   - `handleSave()` valida se o título não está em branco. Se estiver vazio, exibe um `Alert.alert('Campo Obrigatório', ...)` e interrompe a execução.
   - Chama `validateAndFormatDateTime(dueDateInput, dueTimeInput)`, que checa se data e hora foram preenchidas juntas, valida os formatos (`DD/MM/AAAA` e `HH:MM`), verifica a existência no calendário e converte para a string ISO (`YYYY-MM-DDTHH:mm:ss`). Se houver erro de formato ou data inválida, interrompe e exibe alerta.

2. **Armazenamento no SQLite**:
   - `handleSave()` ativa o estado de salvamento (`setSaving(true)`) e chama `taskRepository.create({...})`.
   - Em `src/repositories/taskRepository.ts`, `create()` executa `initDatabase()`, garantindo que o banco de dados `todo_app.db` esteja aberto com FKs ativas.
   - Gera o ID único através de `Date.now().toString() + Math.random().toString(36).substring(2, 6)` e grava `createdAt` com `new Date().toISOString()`.
   - Executa a query `db.runAsync('INSERT INTO tasks ...', [...])` via `expo-sqlite`, persistindo a nova tarefa na tabela `tasks`.

3. **Agendamento da Notificação**:
   - Ao receber o objeto da tarefa criada de `taskRepository.create()`, `handleSave()` chama `notificationService.syncTaskNotification(savedTask)`.
   - Em `src/services/notificationService.ts`, `syncTaskNotification()` verifica que a tarefa não está concluída (`completed === false`) e possui `dueDateTime`. Converte a string ISO em um objeto `Date` e confirma que a data é futura (`dueDate > new Date()`).
   - O serviço checa/solicita permissões de notificação via `getPermissionsAsync()` e `requestPermissionsAsync()`.
   - Com a permissão concedida, invoca `scheduleTaskNotification(task.id, task.title, dueDate)`. Esta função limpa agendamentos anteriores para a mesma tarefa e chama `Notifications.scheduleNotificationAsync()`, configurando o payload `data: { taskId: task.id }` e o gatilho baseado em data (`Notifications.SchedulableTriggerInputTypes.DATE`).

4. **Exibição na Lista de Tarefas**:
   - Após a conclusão do salvamento e agendamento da notificação, `handleSave()` invoca `router.back()`, fechando o formulário e retornando à tela principal (`src/app/index.tsx`).
   - O Expo Router dispara o hook `useFocusEffect` na tela `index.tsx`, executando `loadData()`.
   - `loadData()` chama `taskRepository.getAll()`, que executa a busca SQL (`SELECT * FROM tasks ORDER BY createdAt DESC;`) trazendo a nova tarefa inserida.
   - `loadData()` chama `setTasks(tasksData)`, atualizando o estado reativo da tela principal e fazendo com que a `FlatList` renderize o novo cartão de tarefa imediatamente.

---

## 5. Navegação

Como funciona a navegação entre as telas?

Explique especificamente:
- como o aplicativo navega da lista de tarefas para o editor;
- quais informações são passadas entre as telas durante a edição de uma tarefa.

Por exemplo: ID da tarefa, objeto completo, estado compartilhado ou outra abordagem.

### Resposta:

1. **Funcionamento da Navegação entre Telas**:
   - O aplicativo utiliza **Expo Router**, sistema de navegação baseado em arquivos.
   - O arquivo `src/app/_layout.tsx` define a estrutura de navegação em pilha (`<Stack>`) contendo as telas da pasta `src/app/`.

2. **Navegação da Lista para o Editor**:
   - Para **criar uma nova tarefa**: Na tela principal (`src/app/index.tsx`), o botão "+ Nova Tarefa" executa `router.push('/task/new')`.
   - Para **editar uma tarefa existente**: Ao tocar em um cartão da lista na tela principal, a função de clique do item executa `router.push(`/task/${item.id}`)`.
   - Para **gerenciar categorias**: O botão "Gerenciar Categorias" executa `router.push('/categories')`.
   - Para **voltar**: As telas de formulário e categorias possuem botões chamando `router.back()`.

3. **Informações Passadas entre as Telas**:
   - **Apenas a string do parâmetro de rota `id` é passada na URL (`/task/[id]`)**.
   - **Não é passado o objeto completo da tarefa nem utilizado estado compartilhado de navegação**.
   - Na tela de destino (`src/app/task/[id].tsx`), o parâmetro é extraído usando o hook `useLocalSearchParams<{ id: string }>()`.
   - Se `id === 'new'`, o formulário inicia com campos em branco para criação. Se `id` for um ID numérico/hash de uma tarefa existente, a função `loadData()` chama `taskRepository.getById(id)` para buscar os dados atualizados diretamente do banco SQLite local.
   - **Vantagem da abordagem**: Essa decisão garante a integridade dos dados, pois a tela de edição trabalha diretamente com a fonte oficial da verdade (o SQLite), evitando dados obsoletos passados por parâmetros de rota.

---

## 6. Notificações

Como os lembretes das tarefas são implementados?

Explique:
- como uma notificação é agendada;
- como ela é associada a uma tarefa;
- o que acontece quando a data de vencimento muda;
- o que acontece quando a tarefa é concluída ou excluída.

Diferencie o comportamento previsto pelo código daquilo que foi efetivamente validado nos testes.

### Resposta:

1. **Como a Notificação é Agendada**:
   - É utilizada a biblioteca `expo-notifications`, encapsulada em `src/services/notificationService.ts`.
   - Quando uma tarefa pendente possui `dueDateTime` no futuro, `syncTaskNotification()` chama `scheduleTaskNotification()`, que invoca `Notifications.scheduleNotificationAsync()`.
   - O gatilho de disparo utiliza o tipo `DATE` (`Notifications.SchedulableTriggerInputTypes.DATE`) configurado com o objeto `Date` correspondente ao vencimento.

2. **Associação à Tarefa**:
   - A notificação é associada à tarefa armazenando a string `task.id` na propriedade `data` do conteúdo da notificação (`content: { title, body, data: { taskId: task.id } }`).
   - Para consultar, cancelar ou atualizar a notificação de uma tarefa, o serviço lista os agendamentos ativos no SO com `Notifications.getAllScheduledNotificationsAsync()` e filtra aquele cujo `data.taskId === task.id`. Essa abordagem evitou modificar o schema da tabela `tasks` no SQLite.

3. **Alteração da Data de Vencimento**:
   - Ao salvar uma tarefa editada com uma nova data, `handleSave()` em `src/app/task/[id].tsx` chama `notificationService.syncTaskNotification(savedTask)`.
   - O serviço cancela a notificação antiga vinculada ao `taskId` através de `cancelTaskNotification(taskId)` e, caso a nova data seja válida e futura, agenda um novo lembrete.

4. **Conclusão ou Exclusão da Tarefa**:
   - **Conclusão**: Ao marcar uma tarefa como concluída (na lista ou no formulário), `syncTaskNotification()` identifica `completed === true` e executa `cancelTaskNotification(task.id)`, removendo o agendamento pendente.
   - **Exclusão**: Ao excluir a tarefa na tela de detalhes (`handleDelete()`), o aplicativo executa explicitamente `await notificationService.cancelTaskNotification(id)` antes de remover a tarefa do banco SQLite via `taskRepository.delete(id)`.
   - **Reabertura do App**: Ao abrir/focar na tela principal (`index.tsx`), a função `syncAllTaskNotifications(tasksData)` varre todas as tarefas para garantir que apenas tarefas pendentes e futuras continuem com notificações agendadas.

5. **Diferenciação: Código Previsto vs. Efetivamente Validado nos Testes**:
   - **O que foi efetivamente executado e validado nos testes**:
     - Validação estática de tipos via compilador TypeScript (`npx tsc --noEmit`), que confirmou 0 erros de compilação em todo o projeto.
     - Inspeção estrutural do código em `src/services/notificationService.ts`, `src/app/task/[id].tsx` e `src/app/index.tsx`.
     - Verificação das configurações no `app.json` declarando o plugin `expo-notifications` para compatibilidade com Development Build (`expo run:android`).
   - **O que NÃO foi validado em execução física real**:
     - O disparo em tempo real no dispositivo móvel ou emulador (com alarme, banner visual ou som no segundo exato do vencimento da tarefa) **não foi executado nem validado em runtime**. Tratou-se de validação lógica e estática de código.

---

## 7. Decisões do Agent

Identifique pelo menos **duas decisões importantes tomadas pelo Agent de programação que não foram explicitamente determinadas pelo enunciado da atividade**.

Alguns exemplos:
- arquitetura;
- bibliotecas;
- estratégia de gerenciamento de estado;
- abordagem de navegação;
- abstração do SQLite;
- organização do projeto.

Para cada decisão, explique o que foi escolhido e o motivo, caso seja possible confirmá-lo pelo histórico de desenvolvimento.

### Resposta:

Com base na inspeção direta do código-fonte e no histórico mantido no `BUILD_LOG.md`, destacam-se quatro decisões arquiteturais relevantes tomadas pelo Agent:

1. **Decisão 1: Abstração de Persistência com Padrão Repositório (Repository Pattern) e SQL Puro no `expo-sqlite`**
   - *Escolha*: Criação da camada `src/repositories/` (`taskRepository.ts` e `categoryRepository.ts`) manipulando queries SQL diretas (`runAsync`, `getAllAsync`, `getFirstAsync`) com a biblioteca oficial `expo-sqlite`.
   - *Motivo* (confirmado na Entry 3 do `BUILD_LOG.md`): A utilização da biblioteca mantida pelo ecossistema Expo garante compatibilidade nativa (Expo SDK 57) sem a necessidade de ORMs complexos de terceiros que trariam sobreengenharia (over-engineering) e dependências desnecessárias ao projeto acadêmico. O padrão repositório manteve a interface desvinculada do banco de dados.

2. **Decisão 2: Mapeamento de Notificações via Payload `data: { taskId }` no `expo-notifications` sem alterar o Schema do SQLite**
   - *Escolha*: O `notificationService.ts` grava o campo `{ taskId }` dentro do objeto de dados (`content.data`) da notificação e localiza agendamentos existentes buscando a lista ativa no SO com `Notifications.getAllScheduledNotificationsAsync()`.
   - *Motivo* (confirmado na Entry 8 do `BUILD_LOG.md`): Essa estratégia permitiu identificar, cancelar, reagendar e sincronizar lembretes de forma dinâmica sem precisar alterar a estrutura da tabela `tasks` no SQLite para criar e armazenar colunas extras como `notificationId`.

3. **Decisão 3: Passagem Exclusiva do Parâmetro de Rota `id` no Expo Router e Busca Direta no SQLite**
   - *Escolha*: Na navegação para `/task/[id]` (`router.push('/task/new')` e `router.push(`/task/${item.id}`)`), apenas a string do parâmetro `id` é enviada. Na tela de destino (`src/app/task/[id].tsx`), a leitura do parâmetro `id` via `useLocalSearchParams<{ id: string }>()` aciona a busca do objeto completo diretamente do SQLite via `taskRepository.getById(id)`.
   - *Motivo* (confirmado na Entry 2 do `BUILD_LOG.md`): Garantir que a tela de formulário sempre trabalhe com a fonte oficial e persistida dos dados, evitando falhas de sincronização ou inconsistências derivadas do repasse de objetos voláteis por parâmetros de navegação.

4. **Decisão 4: Filtragem de Tarefas (Status e Categoria) em Memória na Tela Principal**
   - *Escolha*: Em `src/app/index.tsx`, a combinação de filtros por status ('all' | 'pending' | 'completed') e categoria é aplicada via `tasks.filter(...)` sobre a lista já carregada em memória.
   - *Motivo* (confirmado na Entry 6 do `BUILD_LOG.md`): Evita consultas SQL repetidas e custosas ao SQLite a cada toque do usuário nos chips de filtro, proporcionando uma experiência de uso imediata e fluida.

---

## 8. Análise do BUILD_LOG

Com base no `BUILD_LOG.md`, identifique:
- um problema ou erro encontrado durante o desenvolvimento;
- como o Agent tentou resolvê-lo;
- se a primeira solução funcionou;
- qual foi a solução final.

Em seguida, responda:

**O que o registro de desenvolvimento ajudou você a compreender que seria mais difícil descobrir analisando apenas o código final?**

### Resposta:

1. **Problema/Erro Identificado**:
   Conforme registrado na Entry 1 e Entry 3 do `BUILD_LOG.md`, ao executar a verificação inicial do projeto com o compilador do TypeScript (`npx tsc --noEmit`), foram encontrados 2 erros de compilação/tipagem herdados do template inicial do projeto relacionados à importação de arquivos de estilo CSS:
   - `src/components/animated-icon.web.tsx`: Módulo `./animated-icon.module.css` sem declaração de tipos (`TS2307`).
   - `src/constants/theme.ts`: Import de efeito colateral de `@/global.css` sem declaração de tipo (`TS2882`).

2. **Tentativas de Solução e Resultado**:
   - **Primeira abordagem/tentativa**: Na Entry 1, ao identificar os 2 erros de tipagem CSS durante a inspeção inicial, a decisão/abordagem inicial do Agent foi **não aplicar nenhuma alteração de código imediatamente**, respeitando a diretriz do fluxo de trabalho de adiar modificações para a fase específica de implementação e persistência. Portanto, a primeira abordagem foi adiar a correção.
   - **Solução Final**: Na Entry 3, durante a implementação da camada de persistência e suporte a tipos, o Agent criou o arquivo de declaração de tipos global `src/types/css.d.ts`, definindo módulos para arquivos `.css` e `.module.css`. Com essa criação, a verificação `npx tsc --noEmit` passou com 0 erros de compilação.

3. **Resposta à pergunta adicional**:

   **O que o registro de desenvolvimento ajudou você a compreender que seria mais difícil descobrir analisando apenas o código final?**

   O `BUILD_LOG.md` permitiu compreender **o contexto, os dilemas e os motivos por trás de cada escolha arquitetural**, algo que o código final isolado não revela. Especificamente:
   - Esclareceu a razão da existência do arquivo `src/types/css.d.ts`, que no código final poderia parecer um arquivo trivial de suporte, mas na verdade foi criado para sanar falhas de tipagem do template base original.
   - Explicou o motivo pelo qual o `TaskContext` (criado na arquitetura inicial) não foi utilizado para gerenciar o estado global de tarefas, optando-se pelo estado local reativo com re-fetch no foco (`useFocusEffect`) integrado ao SQLite.
   - Revelou as decisões de desempenho, como a escolha deliberada de aplicar os filtros de tarefas em memória na tela principal em vez de realizar novas consultas SQL `WHERE` no banco a cada alteração de filtro.
   - Demonstrou a evolução incremental do projeto, registrando a transição do suporte do Expo Go para a necessidade de Development Build no Expo SDK 57 para lidar com módulos nativos (`expo-notifications` e `expo-sqlite`).

   Sem o `BUILD_LOG.md`, seria possível ver *o que* foi feito, mas não *por que* foi feito, quais problemas pré-existentes foram corrigidos e quais alternativas foram consideradas durante o desenvolvimento.
