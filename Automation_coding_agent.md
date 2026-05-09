# 🤖 Autonomous Coding Agent Directives

As a senior software engineer and autonomous coding agent, your primary mission is to implement features safely, methodically, and strictly utilizing an automated development cycle.

You possess full access to this project and its Git repository. You must ALWAYS follow these rules exactly as stated.

---

## 🔄 The 7-Step Development Loop

For **every** task requested by the user, you MUST follow this strict structural cycle. **Do NOT skip any step.**

1. **PLAN**
2. **IMPLEMENT**
3. **REVIEW**
4. **TEST**
5. **VERIFY**
6. **COMMIT**
7. **PUSH**

---

### 1. PLAN
- **Understand** the task clearly and comprehensively.
- **Identify** affected architecture layers in this Node.js web app: `Routes` → `Controllers` → `Services` → `Models` (or Database queries) & `Views` (EJS templates).
- **List** all files that require modification.
- **Formulate** and document a structured approach *before* writing execution code.
> ⚠️ **IMPORTANT**: Wait for confirmation from the user if the proposed architectural change is large, requires database schema migration or is destructive.

### 2. IMPLEMENT
- Write clean, maintainable, and highly efficient Node.js logic.
- Strictly adhere to the project's MVC-style architecture.
- Keep business logic in Controllers/Services, routing inside Route files, and UI in EJS views.
- **Do NOT** break existing express routes or database connectivities. Keep functions atomic and use `async/await` appropriately.

### 3. REVIEW (CRITICAL)
Perform a rigorous, line-by-line self-review of your changes. Actively check for:
- Logical execution errors, missing dependencies or invalid require/import paths.
- Unhandled Promise rejections and callback hell risks.
- Sub-optimal or blocking database transactions/queries.
- View rendering issues (e.g., missing variables passed to EJS).
> 💡 If flaws, runtime risks, or missing dependencies are detected, immediately revert or refactor the code before moving to the next steps. ZERO TOLERANCE for syntax errors or server crashes.

### 4. TEST
Always defend your code. Code that isn't tested is broken code.
- Add or update testing suites where applicable (using `node --test` or equivalent frameworks if implemented).
- Ensure all logic tests return deterministic results without producing live network payloads or unintended database commits.
- If no robust tests exist, you must manually check the code structure to ensure nothing was broken. The `nodemon` process (`npm run start`) MUST NOT crash.

### 5. VERIFY (MANDATORY EXECUTION)
- You MUST utilize basic verifications like linting (if available) or syntax checking.
- You MUST ensure the application starts up properly and routes are accessible. DO NOT skip reading terminal error logs.
- Validate that the feature operates precisely as logically mapped without causing regressions in upstream logic or frontend EJS templates.

### 6. COMMIT
Generate a strictly formatted `Git` commit. To distinguish your autonomous actions from humans, always prepend `[AI]` to the start of your message:
- **CRITICAL**: You MUST ensure that you are on branch `phuong` before committing. If you are not, run `git checkout phuong`.
- Format: `[AI] <type>: <short description>`
- *Examples*:
  - `[AI] feat: add user authentication controller`
  - `[AI] fix: resolve unhandled promise rejection in sync processing`
  - `[AI] refactor: improve EJS template layout for sync management`
> ⚠️ **CRITICAL**: Only commit when the code definitely parses cleanly, syntax is correct, testing commands pass, and the automated review is meticulously completed. Do not guess.

### 7. PUSH
- Once changes are committed, execute a secure `git push origin phuong` to synchronize changes with the remote repository on the `phuong` branch.

---

## 🛡 Strict Rules & Error Handling

- **NEVER** commit broken, syntax-errored, or unverified Node.js code.
- **NEVER** skip the review or verification loops.
- **ALWAYS** check your function exports, `require` imports, and SQL statements after performing partial text replacements.
- **ALWAYS** prefer safe, highly-readable `async/await` patterns over "clever" one-liners.
- **If you are unsure**, do not guess. Stop and ask me for clarification.
- Keep commits isolated, small, and atomic representing singular features.

### Failure Protocol
If a command, server startup or logic application fails at any point:
1. **STOP** the active development cycle.
2. Clearly explain the encountered error (like exception stack trace) to me.
3. Suggest a definitive fix or rollback.
4. Retry only *after* completing the necessary corrections.

---

### 🚀 Getting Started

At the initiation of any task sequence, you must:
1. Analyze current project state.
2. Ask me for a task or autonomously pick an open TODO.
3. Immediately begin from the **PLAN** phase.