# Deployment Guide / 部署指南

This guide explains how to manage your code with Git, push to GitHub, and deploy to Cloudflare Pages.
本指南将向您介绍如何使用 Git 管理代码、推送到 GitHub 并部署到 Cloudflare Pages。

---

## Scenario: Working with an Existing Repository / 场景：在现有仓库中工作

If you have already cloned the repository from `hongleigao/nb-fishing` and want to test these new professional changes without affecting your original code, follow these steps to use a **Branch**.
如果您已经从 `hongleigao/nb-fishing` 克隆了仓库，并想在不影响原始代码的情况下测试这些新更改，请按照以下步骤使用 **分支 (Branch)**。

### Step 1: Create a New Branch / 第一步：创建新分支

**English:**
Open your terminal in the project folder and run:
1. Create and switch to a new branch named `v2-pro`:
   ```bash
   git checkout -b v2-pro
   ```
2. Stage all the new refactored files:
   ```bash
   git add .
   ```
3. Commit the changes:
   ```bash
   git commit -m "Professional refactor: Added Vite, modular logic, and UI enhancements"
   ```
4. Push this new branch to GitHub:
   ```bash
   git push origin v2-pro
   ```

**中文:**
在项目文件夹中打开终端并运行：
1. 创建并切换到一个名为 `v2-pro` 的新分支：
   ```bash
   git checkout -b v2-pro
   ```
2. 暂存所有重构后的新文件：
   ```bash
   git add .
   ```
3. 提交更改：
   ```bash
   git commit -m "专业版重构：增加 Vite、模块化逻辑及 UI 增强"
   ```
4. 将此新分支推送到 GitHub：
   ```bash
   git push origin v2-pro
   ```

---

## Step 2: Deploy the Branch to Cloudflare / 第二步：在 Cloudflare 部署该分支

### English:
1. **Log in**: Open [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. **Select Project**: Go to your existing `nb-fishing` Pages project.
3. **Change Production Branch (Optional)**: 
   - If you want this to be the main site, go to **Settings** -> **Builds & deployments** -> **Configure Production Branch** and select `v2-pro`.
4. **Preview Deployments**: 
   - Cloudflare Pages automatically detects new branches. Look at the **Deployments** list; you should see a new build for `v2-pro` with its own unique URL (e.g., `v2-pro.nb-fishing.pages.dev`).
5. **Update Build Settings**:
   - Ensure **Framework preset** is `Vite`.
   - **Build command**: `npm run build`.
   - **Build output directory**: `dist`.
6. **Environment Variables**:
   - Add `VITE_API_BASE_URL`: `https://gis-erd-der.gnb.ca/gisserver/rest/services/Fishing_Regs_Site/Rivers_Lakes/MapServer`.

**中文:**
1. **登录**: 打开 [Cloudflare 控制台](https://dash.cloudflare.com/)。
2. **选择项目**: 进入您现有的 `nb-fishing` Pages 项目。
3. **更改生产分支（可选）**:
   - 如果您希望这个新版本直接上线，前往 **Settings** -> **Builds & deployments** -> **Configure Production Branch**，选择 `v2-pro`。
4. **预览部署**:
   - Cloudflare Pages 会自动感应新分支。在 **Deployments** 列表中，您会看到 `v2-pro` 分支正在编译，并会获得一个独立的预览 URL（例如 `v2-pro.nb-fishing.pages.dev`）。
5. **更新构建设置**:
   - 确保 **Framework preset** 选为 `Vite`。
   - **Build command**: `npm run build`。
   - **Build output directory**: `dist`。
6. **设置环境变量**:
   - 添加 `VITE_API_BASE_URL`：`https://gis-erd-der.gnb.ca/gisserver/rest/services/Fishing_Regs_Site/Rivers_Lakes/MapServer`。

---

## Step 3: Reverting or Merging / 第三步：回退或合并

**English:**
- **If you like the new version**: Merge it into main on GitHub or keep using the `v2-pro` branch.
- **If there's a problem**: Simply switch back to your original branch locally using `git checkout main`. Your files will return to the old state.

**中文:**
- **如果喜欢新版本**: 在 GitHub 上将其合并到 main 分支，或者继续维持 `v2-pro` 分支运行。
- **如果有问题**: 只需在本地运行 `git checkout main` 切换回主分支，您的文件就会立刻恢复到原始的旧版本状态。
