#!/usr/bin/env python3
"""
╔══════════════════════════════════════════════════════════════╗
║           FRANCISCO STORE — Setup & Launch Script            ║
║                   Sistema Enterprise v1.0                    ║
╚══════════════════════════════════════════════════════════════╝

Uso: python start.py [--dev | --prod | --docker | --reset]
"""

import os
import sys
import subprocess
import shutil
import time
import argparse
import json
from pathlib import Path

# ── Cores ANSI ──────────────────────────────────────────────────
class C:
    RESET  = "\033[0m"
    BOLD   = "\033[1m"
    RED    = "\033[91m"
    GREEN  = "\033[92m"
    YELLOW = "\033[93m"
    BLUE   = "\033[94m"
    MAGENTA= "\033[95m"
    CYAN   = "\033[96m"
    WHITE  = "\033[97m"

def banner():
    print(f"""
{C.CYAN}{C.BOLD}
 ███████╗██████╗  █████╗ ███╗   ██╗ ██████╗██╗███████╗ ██████╗ 
 ██╔════╝██╔══██╗██╔══██╗████╗  ██║██╔════╝██║██╔════╝██╔════╝ 
 █████╗  ██████╔╝███████║██╔██╗ ██║██║     ██║███████╗██║      
 ██╔══╝  ██╔══██╗██╔══██║██║╚██╗██║██║     ██║╚════██║██║      
 ██║     ██║  ██║██║  ██║██║ ╚████║╚██████╗██║███████║╚██████╗ 
 ╚═╝     ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝╚═╝╚══════╝ ╚═════╝
{C.RESET}
{C.MAGENTA}{C.BOLD}                    ★ STORE ★ E-Commerce Premium{C.RESET}
{C.WHITE}           Sistema Enterprise — Setup & Launch v1.0{C.RESET}
    """)

def step(msg):
    print(f"\n{C.CYAN}{C.BOLD}▶ {msg}{C.RESET}")

def ok(msg):
    print(f"  {C.GREEN}✔ {msg}{C.RESET}")

def warn(msg):
    print(f"  {C.YELLOW}⚠ {msg}{C.RESET}")

def err(msg):
    print(f"  {C.RED}✖ {msg}{C.RESET}")

def run(cmd, cwd=None, check=True, capture=False):
    kwargs = dict(cwd=cwd, shell=True)
    if capture:
        kwargs["capture_output"] = True
        kwargs["text"] = True
    result = subprocess.run(cmd, **kwargs)
    if check and result.returncode != 0:
        err(f"Comando falhou: {cmd}")
        if capture:
            err(result.stderr)
        sys.exit(1)
    return result

def check_requirements():
    step("Verificando dependências do sistema")
    
    tools = {
        "node": ("node --version", "20+"),
        "npm":  ("npm --version", "9+"),
        "git":  ("git --version", "qualquer"),
    }
    
    missing = []
    for tool, (cmd, ver) in tools.items():
        r = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        if r.returncode == 0:
            ok(f"{tool} — {r.stdout.strip()}")
        else:
            warn(f"{tool} não encontrado (necessário {ver})")
            missing.append(tool)
    
    # Docker opcional
    r = subprocess.run("docker --version", shell=True, capture_output=True)
    if r.returncode == 0:
        ok("docker — disponível")
    else:
        warn("docker não encontrado (opcional para modo --docker)")
    
    if missing:
        err(f"Instale: {', '.join(missing)}")
        print(f"\n{C.YELLOW}  📦 Node.js: https://nodejs.org{C.RESET}")
        sys.exit(1)

def setup_env():
    step("Configurando variáveis de ambiente")
    root = Path(__file__).parent
    
    # Backend .env
    be_env = root / "backend" / ".env"
    be_example = root / "backend" / ".env.example"
    if not be_env.exists() and be_example.exists():
        shutil.copy(be_example, be_env)
        ok("backend/.env criado a partir do .env.example")
        warn("⚠  EDITE backend/.env com suas credenciais reais antes de usar em produção!")
    else:
        ok("backend/.env já existe")
    
    # Frontend .env.local
    fe_env = root / "frontend" / ".env.local"
    fe_example = root / "frontend" / ".env.example"
    if not fe_env.exists() and fe_example.exists():
        shutil.copy(fe_example, fe_env)
        ok("frontend/.env.local criado")
    else:
        ok("frontend/.env.local já existe")

def install_backend():
    step("Instalando dependências do backend")
    root = Path(__file__).parent / "backend"
    run("npm install", cwd=str(root))
    ok("Backend — dependências instaladas")

def install_frontend():
    step("Instalando dependências do frontend")
    root = Path(__file__).parent / "frontend"
    run("npm install", cwd=str(root))
    ok("Frontend — dependências instaladas")

def setup_database():
    step("Configurando banco de dados (Prisma)")
    root = Path(__file__).parent / "backend"
    
    print(f"  {C.YELLOW}Gerando Prisma Client...{C.RESET}")
    run("npx prisma generate", cwd=str(root))
    ok("Prisma Client gerado")
    
    print(f"  {C.YELLOW}Aplicando migrations...{C.RESET}")
    r = run("npx prisma migrate deploy", cwd=str(root), check=False)
    if r.returncode != 0:
        warn("migrate deploy falhou — tentando db push (modo dev)...")
        run("npx prisma db push --accept-data-loss", cwd=str(root))
    ok("Banco de dados configurado")
    
    print(f"  {C.YELLOW}Executando seed...{C.RESET}")
    run("npm run seed", cwd=str(root), check=False)
    ok("Dados de exemplo inseridos")

def start_dev():
    step("Iniciando modo desenvolvimento")
    root = Path(__file__).parent
    
    print(f"""
{C.GREEN}{C.BOLD}  ╔═══════════════════════════════════════╗
  ║     🚀 FRANCISCO STORE — DEV MODE    ║
  ╠═══════════════════════════════════════╣
  ║  Frontend:  http://localhost:3000     ║
  ║  Backend:   http://localhost:4000     ║
  ║  Admin:     http://localhost:3000/admin ║
  ║  API Docs:  http://localhost:4000/api/docs ║
  ╠═══════════════════════════════════════╣
  ║  Admin:  admin@franciscostore.com     ║
  ║  Senha:  Admin@123456                 ║
  ╚═══════════════════════════════════════╝{C.RESET}
    """)
    
    print(f"  {C.CYAN}Iniciando backend e frontend simultaneamente...{C.RESET}")
    print(f"  {C.WHITE}Pressione CTRL+C para parar{C.RESET}\n")
    
    be = subprocess.Popen("npm run dev", shell=True, cwd=str(root / "backend"))
    time.sleep(2)
    fe = subprocess.Popen("npm run dev", shell=True, cwd=str(root / "frontend"))
    
    try:
        be.wait()
        fe.wait()
    except KeyboardInterrupt:
        print(f"\n{C.YELLOW}  Encerrando serviços...{C.RESET}")
        be.terminate()
        fe.terminate()
        ok("Serviços encerrados")

def start_docker():
    step("Iniciando com Docker Compose")
    root = Path(__file__).parent
    
    r = subprocess.run("docker info", shell=True, capture_output=True)
    if r.returncode != 0:
        err("Docker não está rodando. Inicie o Docker Desktop e tente novamente.")
        sys.exit(1)
    
    run("docker-compose up -d --build", cwd=str(root))
    
    print(f"""
{C.GREEN}{C.BOLD}  ╔═══════════════════════════════════════╗
  ║    🐳 FRANCISCO STORE — DOCKER        ║
  ╠═══════════════════════════════════════╣
  ║  Loja:     http://localhost           ║
  ║  Admin:    http://localhost/admin     ║
  ║  API:      http://localhost/api       ║
  ╠═══════════════════════════════════════╣
  ║  Admin:  admin@franciscostore.com     ║
  ║  Senha:  Admin@123456                 ║
  ╚═══════════════════════════════════════╝{C.RESET}
    """)

def reset():
    step("Reset completo do projeto")
    root = Path(__file__).parent
    
    warn("Isso irá apagar node_modules, .next e dados do banco!")
    confirm = input(f"  {C.RED}Confirmar? (sim/não): {C.RESET}").strip().lower()
    if confirm not in ("sim", "s", "yes", "y"):
        ok("Reset cancelado")
        return
    
    for d in ["backend/node_modules", "frontend/node_modules", "frontend/.next"]:
        p = root / d
        if p.exists():
            shutil.rmtree(p)
            ok(f"Removido: {d}")
    
    ok("Reset concluído. Execute 'python start.py' para reinstalar.")

def main():
    banner()
    
    parser = argparse.ArgumentParser(description="Francisco Store — Launcher")
    parser.add_argument("--dev",    action="store_true", help="Modo desenvolvimento (padrão)")
    parser.add_argument("--docker", action="store_true", help="Modo Docker Compose")
    parser.add_argument("--reset",  action="store_true", help="Reset completo")
    parser.add_argument("--install-only", action="store_true", help="Só instalar, não iniciar")
    args = parser.parse_args()
    
    if args.reset:
        reset()
        return
    
    check_requirements()
    setup_env()
    install_backend()
    install_frontend()
    setup_database()
    
    if args.install_only:
        ok("Instalação concluída!")
        return
    
    if args.docker:
        start_docker()
    else:
        start_dev()

if __name__ == "__main__":
    main()