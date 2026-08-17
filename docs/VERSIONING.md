# Versionamento

A Carina - Legal usa SemVer.

- `PATCH`: correcção compatível, por exemplo `0.2.3` → `0.2.4`.
- `MINOR`: funcionalidade compatível relevante, por exemplo `0.2.x` → `0.3.0`.
- `MAJOR`: mudança incompatível; a primeira versão estável será `1.0.0` após auditoria final.

## Regra operacional

- A produção mantém a última versão publicada.
- Assim que começa um novo lote, o `package.json` local passa para a próxima versão em preparação.
- `HANDOVER.md` e `PROJECT_STATE.md` distinguem sempre versão local, versão no GitHub e versão publicada.
- A versão só é considerada publicada depois de validar directamente a URL online e registar commit, branch, deployment ID, version ID e data.
- Não reutilizar o mesmo número para código funcionalmente diferente já publicado.
