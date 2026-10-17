# Configuração do Cloudflare R2 para videoaulas privadas

## Bucket e credenciais

1. No Cloudflare, crie um bucket chamado `vitta-videos` (ou use o nome definido em `CLOUDFLARE_R2_BUCKET_NAME`).
2. Mantenha o bucket **privado**. Não habilite Public Development URL (`r2.dev`) nem domínio público para este bucket.
3. Crie uma chave S3 do R2 limitada a esse bucket, com permissão de leitura e gravação de objetos. Não use uma chave de toda a conta se o painel permitir escopo por bucket.
4. Guarde os valores na `.env.local` e nas variáveis de ambiente Production da Vercel:
   - `CLOUDFLARE_R2_ACCOUNT_ID`
   - `CLOUDFLARE_R2_ACCESS_KEY_ID`
   - `CLOUDFLARE_R2_SECRET_ACCESS_KEY`
   - `CLOUDFLARE_R2_BUCKET_NAME`
5. Não adicione `NEXT_PUBLIC_` às credenciais. Elas são usadas somente nas rotas do servidor.

## CORS do bucket

Para o envio multipart direto do navegador e reprodução HTML5, configure CORS no bucket com uma regra equivalente a:

```json
[
  {
    "AllowedOrigins": ["https://www.appvitta.com", "https://appvitta.com"],
    "AllowedMethods": ["GET", "HEAD", "PUT"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag", "Content-Length", "Content-Range", "Accept-Ranges"],
    "MaxAgeSeconds": 3600
  }
]
```

Se usarem um domínio de preview da Vercel para testar uploads, adicione somente o domínio exato desse preview e remova depois. Evite `*` em `AllowedOrigins`.

## Banco e publicação

Execute `src/lib/supabase/migrations/004_r2_private_videos.sql` no SQL Editor do projeto Supabase antes de publicar a versão que grava o provedor e a chave do objeto.

Depois de inserir as quatro variáveis no ambiente Production da Vercel, faça um novo deploy. Reiniciar apenas a página não atualiza variáveis de ambiente.

## Como o acesso funciona

- A administradora escolhe “Enviar vídeo privado ao R2” em `/admin/aulas`.
- O browser envia partes do arquivo diretamente ao R2 usando URLs de upload assinadas e curtas; as chaves secretas ficam no servidor.
- O banco armazena apenas o identificador privado do objeto, nunca o arquivo nem uma URL pública.
- Para reproduzir, a rota do servidor valida a sessão, o acesso ativo, o estado publicado da aula e da categoria/subcategoria; então emite uma URL de leitura assinada por uma hora. Ela não é permanente e não substitui DRM: quem copiar essa URL poderá usá-la enquanto estiver válida.
- Arquivos externos já cadastrados continuam usando o fluxo anterior.

R2 armazena e entrega o arquivo original; não converte o vídeo nem cria variantes adaptativas/HLS. Para boa reprodução móvel, exporte MP4 H.264/AAC em resolução e bitrate adequados antes de enviar.
