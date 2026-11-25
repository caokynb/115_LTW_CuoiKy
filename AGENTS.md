# AGENTS INSTRUCTIONS - CINEHUB (115_LTW_CuoiKy)

> **CRITICAL DIRECTIVE FOR ALL AGENTS (SINGLE-AGENT, /TEAMWORK, /SWARM):**  
> Before planning, writing code, creating branches, or modifying files in this repository, you **MUST** read and strictly obey [WORKFLOW.md](file:///c:/Users/Admin/OneDrive/Documents/GitHub/LTW%20CUOI%20KY/115_LTW_CuoiKy/WORKFLOW.md).

---

## 1. Non-Negotiable Rules

1. **Evidence Before Assertions:** Never claim a task or bugfix is complete without executing automated tests (`npm --prefix client test -- --watchAll=false`, `npm --prefix server test`, `npm --prefix client run build`) and obtaining a successful exit code (code 0 / 100% tests passed).
2. **Branch Isolation:** Never commit directly to `main`. Always create a dedicated branch matching the task ID (`feat/<name>`, `fix/<name>`, `chore/<name>`, `docs/<name>`).
3. **Commit Messages:** All git commit messages must be written in **concise, professional English** describing the exact change (e.g., `Implement booking API endpoint with authoritative pricing and collision handling`) or simply `fix` for maintenance/doc updates. Never mention "sheet" or spreadsheet updates in git commit messages, and never prepend artificial tags like `[AI]`.
4. **Scope Confinement:** Only modify files allocated to your task on the Google Sheet (*"File/thư mục được sửa (chỉ mình bạn)"*). Do not make gratuitous modifications to teammates' files.
5. **Design & Tech Stack Standards:** Follow [AWESOME_DESIGN_SKILLS.md](file:///c:/Users/Admin/OneDrive/Documents/GitHub/LTW%20CUOI%20KY/115_LTW_CuoiKy/AWESOME_DESIGN_SKILLS.md) for Cinema Dark Mode styling, Rose 600 CTA, Amber 500 VIP, WCAG 2.2 AA accessibility, Redux Toolkit 8-seat limit, and atomic MongoDB collision handling.
6. **Task & Google Sheet Hygiene:** Always cross-reference the Google Sheet (`Task management` tab) for dependencies before starting, and update task status to "Xong" after verification and merge. Ensure the Sheet matches the repository in real time: file paths in the Sheet must match actual repo files exactly (no nonexistent or stale file references), statuses must reflect real progress, and assignees must reflect actual ownership. Strictly maintain professionalism on the Sheet for external viewers/evaluators: NEVER write AI-related keywords (e.g., 'AI', 'bot', 'agent', 'teamwork', 'prompt'), internal justifications, or informal notes. Only update standard fields (Assignee name, Status: 'Xong' or 'Đang làm').
