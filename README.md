# Pilates em Casa — Micro SaaS

Plataforma de aulas, programas e comunidade de Pilates em Casa, desenvolvida com Next.js (App Router), Tailwind CSS e design acolhedor, feminino e sofisticado.

---

## 🔐 Acesso Administrativo (`/admin`)

O painel administrativo em `/admin` é estritamente protegido no lado do servidor. Qualquer tentativa de acesso direto sem autenticação redireciona automaticamente para a tela de login administrativo em `/admin/login`.

### Configuração das variáveis de ambiente

No arquivo `.env.local` (ou nas variáveis de ambiente da hospedagem/Vercel), configure as credenciais individuais dos dois proprietários do projeto e a chave secreta de assinatura:

```env
# Credenciais individuais dos dois proprietários
ADMIN_OWNER_1_EMAIL="proprietaria@pilatesemcasa.com.br"
ADMIN_OWNER_1_PASSWORD="senha-forte-proprietario-1"

ADMIN_OWNER_2_EMAIL="socio@pilatesemcasa.com.br"
ADMIN_OWNER_2_PASSWORD="senha-forte-proprietario-2"

# Segredo de sessão para assinatura criptográfica HMAC SHA-256 do cookie
ADMIN_SESSION_SECRET="gere-um-segredo-com-pelo-menos-32-caracteres"
```

> **Segurança:**
> - As credenciais são lidas exclusivamente no runtime Node.js do servidor (`server-only`).
> - Nenhuma senha ou credencial é exposta no código do navegador ou em variáveis com prefixo `NEXT_PUBLIC_`.
> - A validação de senha utiliza `timingSafeEqual` para prevenir ataques de temporização (*timing attacks*).
> - Ao efetuar login com sucesso, um cookie `HttpOnly`, `SameSite=strict` (`pilates_admin_session`) é emitido com duração de 12 horas.

---

## 🚀 Executando o Projeto

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000) (ou a porta atribuída) no navegador.

### Principais Rotas
- `/`: Página inicial / institucional
- `/login`: Login exclusivo das alunas
- `/aluna`: Área da aluna (dashboard diário, rotina de treino e programas)
- `/aluna/programas`: Biblioteca de programas e categorias
- `/admin`: Dashboard de gestão (redireciona para `/admin/login` se não autenticado)
- `/admin/login`: Tela de autenticação exclusiva para os proprietários
