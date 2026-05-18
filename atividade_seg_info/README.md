# Registro Seguro de Ocorrências Acadêmicas - Versão Revisada

Projeto acadêmico da disciplina Segurança da Informação. Esta versão mantém o escopo front-end do protótipo original, mas implementa melhorias didáticas de segurança e privacidade em HTML, CSS e JavaScript.

## Melhorias implementadas

- Controle de permissões por perfil (ALUNO, PROFESSOR e ADMIN).
- Remoção da troca livre de perfil para usuários não administrativos.
- Ocultação/mascaramento de CPF, e-mail e telefone conforme perfil.
- Exportação minimizada apenas para ADMIN, sem token, senhas, usuários completos ou cópia integral do localStorage.
- Logs com detalhes reduzidos, sem CPF completo ou descrição integral.
- Validação de campos no HTML e sanitização simples no JavaScript.
- Sessão com expiração simulada por inatividade.
- Ações restritas de exclusão, alteração de status, limpeza de logs e exportação.
- Avisos claros de que o sistema é apenas um protótipo front-end.

## Limitação importante

Como não existe back-end, API, banco de dados centralizado ou autenticação real, os controles são apenas simulações no navegador. O sistema não deve ser usado em produção com dados reais.

## Como executar

Abra o arquivo `index.html` no navegador ou publique o repositório via GitHub Pages.

## Credenciais fictícias

- Aluno: `aluno@faculdade.local` / `123456`
- Professor: `professor@faculdade.local` / `123456`
- Administrador: `admin@faculdade.local` / `admin2026`
