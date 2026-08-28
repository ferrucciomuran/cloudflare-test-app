# Agent Operating Rules & Constraints

## 1. Output & Chat Interaction Rules
- **No Chat Code:** Non pubblicare mai blocchi di codice direttamente nella chat. Modifica e scrivi sempre i file direttamente all'interno della directory del progetto.
- **No Chain-of-Thought Expose:** Non includere spiegazioni sul tuo ragionamento o processi di pensiero nelle risposte.
- **Completion Notice:** Una volta completati i task sui file, limita la risposta in chat a una semplice conferma di avviso di fine lavori.

## 2. Protected Service Folders
Ignora completamente le seguenti cartelle e il loro contenuto in tutti i processi automatici, indicizzazioni e refactoring, a meno che non sia l'utente a chiederlo esplicitamente:
- `_local_files/`
- `_project_backups/`
- `_project_docs/`
- `_project_prompts/`

## 3. Browser & Testing Protocol
- **No Automated Browser Launch:** Non aprire mai istanze di browser (né esterne né interne ad Antigravity) per verificare i risultati. I feedback sul fine-tuning e sull'esecuzione verranno forniti manualmente dall'utente.
- **PHP Local Testing Standard:** Se occorre testare codice PHP locale, crea uno script eseguibile `_local_files/start-browser.command` configurato per avviare il server PHP integrato e renderlo accessibile sia da macOS locale che da dispositivi sulla rete WiFi locale (es. iPhone).

## 4. Execution & Writing Permissions
- L'Agent opera con permessi completi di scrittura e lettura sul file system del Mac come assistente/automator editoriale.
- Mantieni sempre una struttura di codice pulita, performante e idonea alle risorse hardware del sistema (Apple Silicon M4 Max).

## 5. Rules Reference & Context Binding
Per le specifiche dettagliate sull'hardware, il profilo software e l'architettura dei comandi, fai riferimento ai file di configurazione dedicati:
- Profilo Utente & CLI: `@.agents/rules/user-profile.md`
- Architettura & Scripts: `@.agents/rules/architecture.md`

## 6. Execution Autonomy & Approval Bypass
- **Auto-Approve Actions:** Esegui automaticamente tutte le operazioni di scrittura, creazione file, esecuzione comandi da terminale (es. installazioni, script) e verifiche intermedie.
- **No Confirmation Prompts:** Non richiedere conferme all'utente per i passaggi intermedi e non proporre menu di scelta sulle autorizzazioni: seleziona sempre l'opzione con i permessi più ampi ed esegui autonomamente fino al completamento del task.