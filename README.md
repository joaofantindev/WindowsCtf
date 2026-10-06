# WinCTF — Laboratório de Defesa Windows

CTF prático para treinar **Windows defense**: onde ficam as configurações, como analisar logs e
Event IDs, e comandos de **`.bat`** e **`.ps1`** do básico ao avançado. Visual *liquid glass*
inspirado no Windows 11 (Mica/Acrylic), rodando 100% estático — sem backend, sem dependências.

## Como executar

Opção 1 — abrir direto:

```powershell
start .\index.html
```

Opção 2 — servidor local (recomendado, garante persistência do progresso):

```powershell
python -m http.server 8000
# acesse http://localhost:8000
```

Requisitos: qualquer navegador moderno (Chrome, Edge, Firefox). Não é preciso instalar nada.

## O que tem

| Seção | Descrição |
|---|---|
| **Dashboard** | Pontos, flags capturadas, dicas usadas, rank do analista e progresso por trilha |
| **Configurações** | Registro, Group Policy, serviços, PATH e persistência |
| **Logs & Eventos** | Security, System e PowerShell Operational — correlação de eventos |
| **Batch (.bat)** | `for /f`, delayed expansion, redirecionamento, ofuscação por substrings |
| **PowerShell (.ps1)** | Pipeline de objetos, `Get-WinEvent`, Base64/UTF-16LE, engenharia reversa |
| **Terminal** | Sandbox CMD + PowerShell com filesystem simulado e flag escondida |
| **Referência** | Cheat sheet filtrável: caminhos, Event IDs, chaves de registro, comandos |

## As 24 missões

### Trilha 01 — Configurações
| # | Nível | Tema |
|---|---|---|
| cfg1 | Iniciante | Caminho completo do arquivo `hosts` |
| cfg2 | Iniciante | Snap-in da Política de Grupo local (`gpedit.msc`) |
| cfg3 | Intermediário | Identificar entrada maliciosa nas chaves `Run` |
| cfg4 | Intermediário | Chave do registro que armazena os serviços |
| cfg5 | Avançado | Backdoor de acessibilidade via `Image File Execution Options` |
| cfg6 | Avançado | Sequestro de resolução de comandos via PATH |

### Trilha 02 — Logs & Eventos
| # | Nível | Tema |
|---|---|---|
| evt1 | Iniciante | Event ID de criação de conta (4720) |
| evt2 | Iniciante | Event ID de falha de logon (4625) |
| evt3 | Intermediário | Extrair o IP de origem de um logon Type 3 suspeito |
| evt4 | Intermediário | Flag escondida em Script Block Logging (4104) |
| evt5 | Avançado | Correlacionar 4720 → 4732 → 4624 → 4672 |
| evt6 | Avançado | Decodificar `-EncodedCommand` (Base64 UTF-16LE) |

### Trilha 03 — Batch
| # | Nível | Tema |
|---|---|---|
| bat1 | Iniciante | Imprimir arquivo no console (`type`) |
| bat2 | Iniciante | Expansão `%~dp0` |
| bat3 | Intermediário | Varredura de log com `for /f`, `tokens` e `delims` |
| bat4 | Intermediário | Redirecionamento de stderr (`2>`, `2>&1`, `>>`) |
| bat5 | Avançado | Prever saída de script com substrings (`%var:~N,M%`) |
| bat6 | Avançado | Substituição de variável com curinga (`%P:*;=%`) |

### Trilha 04 — PowerShell
| # | Nível | Tema |
|---|---|---|
| ps1 | Iniciante | Cmdlet equivalente a `dir` (`Get-ChildItem`) |
| ps2 | Iniciante | Filtro de objetos no pipeline (`Where-Object`) |
| ps3 | Intermediário | Cmdlet moderno de logs EVTX (`Get-WinEvent`) |
| ps4 | Intermediário | Rastrear a saída de uma pipeline encadeada |
| ps5 | Avançado | Decodificar string Base64/UTF-16LE |
| ps6 | Avançado | Reconstruir URL de C2 fragmentada em código |

## Sistema de pontos

- **Iniciante** = 100 pts · **Intermediário** = 200 pts · **Avançado** = 300 pts
- Cada **dica** usada custa **−50 pts** (máx. 2 por desafio)
- **Flag escondida no terminal** = +50 pts (uma única vez)
- Progresso salvo em `localStorage` — botão *zerar progresso* no rail

**Ranks:** Novato (0) → Analista Júnior (300) → Analista SOC (700) → Incident Handler (1200)
→ Threat Hunter (1800) → Blue Team Lead (2400)

As respostas são flexíveis: caminhos aceitam variações (`C:\Windows\...`, `System32\...`),
comandos aceitam alias (`GCI`, `dir`) e flags são validadas sem diferenciar maiúsculas.

## Terminal simulado

Dois modos com histórico (↑/↓) e autocompletar por Tab:

- **CMD:** `dir`, `cd`, `type`, `findstr`, `set`, `where`, `echo`, `whoami`, `hostname`, `ver`,
  `ipconfig`, `systeminfo`, `tasklist`, `netstat -ano`, `net user`, `net localgroup`, `sc query`,
  `reg query`, `pushd`/`popd`, `fsutil`, `ping`, `powershell`, `help`, `cls`
- **PowerShell:** `Get-ChildItem`, `Get-Content`, `Set-Location`, `Get-Process`, `Get-Service`,
  `Get-WinEvent`, `Get-LocalUser`, `Get-ComputerInfo`, `Get-ExecutionPolicy`, `$PSVersionTable`,
  `Test-Path`, `Get-Command`, `Get-Help`, `Get-Date`, `Where-Object`, `Select-Object`,
  `Sort-Object`, `Measure-Object` — incluindo **pipeline** com `|`

O filesystem simulado espelha o usado nos desafios (`C:\Windows\System32\winevt\Logs`,
`C:\Users\Public`, `C:\logs\auth.log`...). Dica: investigue `C:\Users\Public\notes.txt`.

## Estrutura do projeto

```
win_ctf/
├── index.html              # SPA única (todas as seções)
├── README.md
└── assets/
    ├── css/style.css       # tema liquid glass, glassmorphism, responsivo
    └── js/
        ├── data.js         # CHALLENGES (24), CATEGORIES, LEVELS, REFERENCE
        ├── terminal.js     # simulador CMD/PowerShell + filesystem
        └── app.js          # navegação, validação de respostas, progresso
```

## Como adicionar um desafio

Edite `assets/js/data.js` e acrescente um objeto em `CHALLENGES`:

```js
{
  id: 'cfg7',                    // único
  cat: 'config',                 // config | logs | bat | ps1
  level: 'intermediario',        // iniciante | intermediario | avancado
  title: 'Título do desafio',
  desc: 'Contexto narrativo (aceita HTML)',
  task: 'A pergunta (aceita HTML)',
  format: 'Formato esperado, ex.: CTF{...}',
  artifact: {                    // opcional — pode ser array de artefatos
    label: 'arquivo.evtx',
    lang: 'log',                 // log | bat | ps1 | reg
    content: `conteúdo exibido`
  },
  answers: ['ctf{minha_flag}'],  // todas as variantes aceitas
  hints: ['dica 1', 'dica 2'],
  explain: `<h4>Por quê</h4>explicação em HTML`
}
```

Depois atualize os contadores visíveis em `index.html` (ex.: `0/6 resolvidos`) se necessário —
o dashboard e as barras de progresso se recalculam sozinhos.

## Stack

HTML + CSS + JavaScript puro (ES6). Sem frameworks, sem build, sem fetch — funciona até via
`file://`. O progresso usa `localStorage`; toda a lógica fica em ~3 arquivos.
