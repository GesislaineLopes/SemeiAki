# SemeiAki

Aplicação Angular para aproximar produtores locais e compradores de Afogados da Ingazeira.

## Executar localmente

Use Node.js 22.13 ou superior. No diretório `semeiaki` (pasta pai do Angular), instale as dependências e inicie a API e o Angular:

```bash
npm --prefix semei-aki install
npm run dev
```

O site estará disponível em `http://localhost:4200/` e a API em `http://localhost:3000/`.
O comando `npm start` inicia somente o Angular; para usar cadastro e anúncios, a API também precisa estar em execução (`npm run api`).

## Funcionalidades

- Catálogo responsivo com pesquisa por produto, produtor ou sítio.
- Filtros de categoria e propriedade, com opção para limpar a pesquisa.
- Links de compra pelo WhatsApp com mensagem preenchida para cada produto.
- Cadastro e login de produtores com senha protegida por hash e sessão em cookie HttpOnly.
- Área do produtor protegida por conta, com anúncios vinculados ao produtor e armazenados no SQLite.
- Foto escolhida do celular ou computador (JPG, PNG ou WEBP, até 1 MB).
- Logo oficial sem fundo em `public/semeiaki-logo.png`.

O banco SQLite de desenvolvimento é criado em `api/data/semeiaki.sqlite` na primeira execução. As contas e os anúncios ficam neste computador; publicar o sistema para clientes acessarem pela internet exige hospedar a API e o banco em um servidor com HTTPS. Recuperação de senha por e-mail ainda não está disponível.

## Verificação

```bash
npm run build
npm test -- --watch=false
npm run test:api
```
